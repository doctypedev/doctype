import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { Logger } from '../utils/logger';
import { GitHelper } from '../utils/git-helper';
import { createAgentFromEnv } from '../../../ai';

export interface SmartCheckResult {
    hasDrift: boolean;
    reason?: string;
    suggestion?: string;
}

export class SmartChecker {
    private logger: Logger;
    private gitHelper: GitHelper;
    private projectRoot: string;

    constructor(logger: Logger, projectRoot: string = process.cwd()) {
        this.logger = logger;
        this.gitHelper = new GitHelper(logger);
        this.projectRoot = projectRoot;
    }

    /**
     * Determine if we should analyze changes with AI based on heuristics
     * This saves tokens by avoiding AI calls for trivial changes
     */
    private shouldAnalyzeWithAI(changedFiles: string[], gitDiff: string): boolean {
        // 1. File Name Filtering
        const relevantFiles = changedFiles.filter(file => {
            // Ignore test files
            if (file.match(/\.(test|spec)\.(ts|js|rs)$/) || file.includes('__tests__') || file.includes('tests/')) return false;
            // Ignore lockfiles and internal configs
            if (file.includes('lock.yaml') || file.includes('lock.json') || file.includes('lock')) return false;
            if (file.includes('.gitignore') || file.includes('.editorconfig')) return false;

            // Focus on source code (TS/JS/Rust) and existing docs and configs
            return file.endsWith('.ts') ||
                file.endsWith('.js') ||
                file.endsWith('.rs') ||
                file.endsWith('package.json') ||
                file.endsWith('Cargo.toml');
        });

        // 2. Critical Path "Always Check"
        // If the file is in a critical directory (like commands or routes), we analyze it regardless of specific keywords
        // because behavior changes in these files often impact documentation.
        const isCriticalChange = relevantFiles.some(file =>
            file.includes('/commands/') ||
            file.includes('/routes/') ||
            file.endsWith('package.json') ||
            file.endsWith('Cargo.toml')
        );

        if (isCriticalChange) {
            this.logger.debug('Critical file changed (commands/routes/config). Skipping keyword heuristics and forcing AI check.');
            return true;
        }

        // 3. Content Heuristics (Regex Scan on Diff)
        // We look for keywords that suggest meaningful API/CLI changes in both ADDED (+) and REMOVED (-) lines
        // Deletions are breaking changes and require docs updates too.
        const changedLines = gitDiff.split('\n').filter(line =>
            (line.startsWith('+') && !line.startsWith('+++')) ||
            (line.startsWith('-') && !line.startsWith('---'))
        );
        const changedContent = changedLines.join('\n');

        // Keywords for public API or CLI changes (TS + Rust)
        const meaningfulKeywords = [
            // TypeScript / JavaScript
            // Support 'export default', 'export async', 'export abstract', etc.
            /export\s+(default\s+|async\s+|abstract\s+)*(class|interface|type|enum|const|function|let|var)/,
            /command\(/, // Yargs or CLI commands
            /route\(/,   // API routes matches
            /"bin":/,    // package.json bin
            /"scripts":/, // package.json scripts
            /"dependencies":/, // package.json dependencies

            // Rust
            /pub\s+(struct|enum|fn|mod|trait|impl|const|static|type)/, // Public Rust items
            /#\[derive\(.*Args.*\)\]/, // Clap Args
            /#\[derive\(.*Parser.*\)\]/, // Clap Parser
            /#\[derive\(.*Subcommand.*\)\]/, // Clap Subcommand
            /#\[command/, // Clap command attribute
            /\[package\]/, // Cargo.toml package (version bumps)
            /\[dependencies\]/ // Cargo.toml dependencies
        ];

        const hasMeaningfulChange = meaningfulKeywords.some(regex => regex.test(changedContent));

        if (!hasMeaningfulChange) {
            this.logger.debug('Changes detected but no meaningful keywords found (e.g. exports, commands). Skipping AI check.');
            return false;
        }

        return true;
    }

    /**
     * Check if the README needs to be updated based on recent code changes
     */
    async checkReadme(options?: { baseBranch?: string }): Promise<SmartCheckResult> {
        const readmePath = resolve(this.projectRoot, 'README.md');
        const baseBranch = options?.baseBranch || 'origin/main';

        if (!existsSync(readmePath)) {
            return { hasDrift: false }; // No README to check
        }

        // 1. Get recent changes (Git Diff)
        let gitDiff = '';
        let changedFiles: string[] = [];

        try {
            // Get both staged and unstaged changes for comprehensive context
            const staged = await this.gitHelper.getDiff(true);
            const unstaged = await this.gitHelper.getDiff(false);
            gitDiff = (staged + '\n' + unstaged).trim();
            changedFiles = this.gitHelper.getChangedFiles();

            if (!gitDiff) {
                // If no uncommitted changes, check against the base branch (default: origin/main)
                // This covers PRs with multiple commits
                try {
                    // Try to diff against base branch first
                    const diffAgainstBase = this.gitHelper.getDiffAgainstBase(baseBranch);
                    if (diffAgainstBase) {
                        gitDiff = `Changes against ${baseBranch}:\n` + diffAgainstBase;
                        changedFiles = this.gitHelper.getChangedFilesAgainstBase(baseBranch);
                        this.logger.info(`Comparing current HEAD against base branch: ${baseBranch}`);
                    } else {
                        // Fallback to last commit if base comparison yields nothing (e.g. equal) or fails
                        // This ensures we always check something if possible
                        // CRITICAL: We need the PATCH (-p) not just stat, otherwise regex heuristics fail
                        const lastCommit = execSync('git show HEAD -p -n 1', { encoding: 'utf-8', cwd: this.projectRoot });
                        if (lastCommit) {
                            gitDiff = "Last commit:\n" + lastCommit;
                            // IMPORTANT: Get the files changed in the last commit for the pre-filter
                            changedFiles = this.gitHelper.getChangedFiles('HEAD');
                        }
                    }
                } catch (e) {
                    this.logger.debug(`Failed to compare against base or last commit: ${e}`);
                }
            }

            if (!gitDiff) {
                this.logger.debug('No code changes detected to analyze.');
                return { hasDrift: false };
            }

            // Optimization: Deterministic Pre-filter
            if (!this.shouldAnalyzeWithAI(changedFiles, gitDiff)) {
                return { hasDrift: false };
            }

            // Truncate to avoid token limits
            if (gitDiff.length > 8000) {
                gitDiff = gitDiff.substring(0, 8000) + '\n... (truncated)';
            }
        } catch (error) {
            this.logger.warn(`Failed to get git diff: ${error}`);
            return { hasDrift: false };
        }

        // 2. Read README content
        const readmeContent = readFileSync(readmePath, 'utf-8');

        // 3. Consult AI
        try {
            this.logger.info('🤖 Asking AI if README needs updates based on recent changes...');
            const agent = createAgentFromEnv();

            if (!await agent.validateConnection()) {
                this.logger.warn('AI connection failed. Skipping smart check.');
                return { hasDrift: false };
            }

            const prompt = `
You are a documentation expert. 
Your task is to analyze recent code changes and the current README to determine if the README is outdated.

## Current README
\`\`\`markdown
${readmeContent.substring(0, 5000) + (readmeContent.length > 5000 ? '...' : '')}
\`\`\`

## Recent Code Changes (Git Diff)
\`\`\`diff
${gitDiff}
\`\`\`

## Task
Determine if the recent code changes introduce features, commands, or behavior that SHOULD be in the README but are likely missing.
Ignore minor refactors, styling updates, or internal tests.
Focus on:
1. New CLI commands or flags.
2. New public API methods (if it's a library).
3. Changes to installation or configuration.
4. Breaking changes.

## Output Format
Return a JSON object with this structure:
{
  "hasDrift": boolean,
  "reason": "Short explanation of what is missing or outdated",
  "suggestion": "Brief suggestion on what to add/change"
}
Only return the JSON.
`;

            const response = await agent.generateText(prompt, {
                temperature: 0
            });

            // Parse JSON response
            let result;
            try {
                // Strip markdown code blocks if present
                const cleanJson = response.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                result = JSON.parse(cleanJson);
            } catch (e) {
                this.logger.debug('Failed to parse AI response as JSON: ' + response);
                return { hasDrift: false };
            }

            if (result && result.hasDrift) {
                return {
                    hasDrift: true,
                    reason: result.reason,
                    suggestion: result.suggestion
                };
            }

        } catch (error) {
            this.logger.warn(`Smart check failed: ${error}`);
        }

        return { hasDrift: false };
    }
}
