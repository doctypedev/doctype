
import { Logger } from '../utils/logger';
import { AIAgents } from '../../../ai';
import { filterGitDiff } from '../utils/diff-utils';

export class ImpactAnalyzer {
    constructor(private logger: Logger) { }

    /**
     * Helper to centralize the check & logging logic.
     * Returns TRUE if we should proceed with generation (update needed), FALSE if we should skip.
     */
    async checkWithLogging(
        gitDiff: string,
        docType: 'readme' | 'documentation',
        aiAgents: AIAgents,
        force: boolean = false
    ): Promise<{ shouldProceed: boolean; reason?: string }> {
        if (!gitDiff) return { shouldProceed: true, reason: 'No git diff provided (or forced).' }; // No diff info? Assume we proceed or let downstream handle it.

        const impact = await this.shouldUpdateDocs(gitDiff, docType, aiAgents);

        if (!impact.update && !force) {
            this.logger.success(`✨ Impact Analysis: No relevant changes detected. Skipping generation.`);
            this.logger.info(`   Reason: ${impact.reason}`);
            return { shouldProceed: false, reason: impact.reason }; // Skip
        } else if (impact.update) {
            this.logger.info(`✨ Impact Analysis: Update required.`);
            this.logger.info(`   Reason: ${impact.reason}`);
        }

        return { shouldProceed: true, reason: impact.reason }; // Proceed
    }

    /**
     * Analyzes the git diff and determines if the documentation needs to be updated.
     * Returns a reason if NO update is needed.
     */
    async shouldUpdateDocs(
        gitDiff: string,
        docType: 'readme' | 'documentation',
        aiAgents: AIAgents
    ): Promise<{ update: boolean; reason: string }> {
        if (!gitDiff || gitDiff.trim().length === 0) {
            return { update: false, reason: 'No git diff provided.' };
        }

        // 1. Clean the diff (remove lockfiles, noise)
        const exclusions: string[] = [];
        if (docType === 'readme') {
            exclusions.push('README.md');
        }

        const cleanDiff = filterGitDiff(gitDiff, exclusions);

        // 2. Safety Check: Truncation Risk
        // If the cleaned diff is still massive, we risk truncating critical changes.
        // Fallback to safe update.
        if (cleanDiff.length > 20000) {
            return {
                update: true,
                reason: 'Diff is too large (>20k chars) for semantic analysis. Forcing update to ensure no breaking changes are missed.'
            };
        }

        this.logger.info(`🔍 Performing Semantic Impact Analysis on ${docType}...`);

        const prompt = `
You are a Senior Technical Editor.
Your job is to act as a GATEKEEPER to prevent unnecessary documentation updates.
You will evaluate the provided "Git Diff" and decide if the "${docType}" needs to be updated.

## Git Diff
\`\`\`diff
${cleanDiff}
\`\`\`

## Rules
1. **IGNORE** Trivial Changes:
   - Formatting/Linting fixes.
   - Version bumps in package.json.
   - Internal refactors that don't change behavior or APIs.
   - Changes to CI/CD workflows (.github, etc).
   - Changes to ignored files (.gitignore, etc).
   - Typos in comments.

2. **FLAG** Important Changes:
   - New CLI commands or flags.
   - New API endpoints.
   - Changes to configuration options.
   - New features visible to the end-user.
   - Breaking changes.

## Critical Instruction
**If you are unsure or if the context is ambiguous, lean towards TRUE (update).**
It is better to update unnecessarily than to miss a critical change.

## Output
Return a JSON object:
{
  "update": boolean, // true if docs MUST be updated, false otherwise
  "reason": "String explaining why. If false, explain why changes are trivial. If true, list the key feature that changed."
}
`;

        try {
            // Use the Planner or Reviewer (usually stronger models) for this logic
            const agent = aiAgents.reviewer || aiAgents.planner;
            let response = await agent.generateText(prompt, {
                maxTokens: 500,
                temperature: 0.1
            });

            response = response.trim();
            // Clean up markdown code blocks
            if (response.startsWith('```json')) response = response.replace(/^```json\s*/, '').replace(/```$/, '');
            else if (response.startsWith('```')) response = response.replace(/^```\s*/, '').replace(/```$/, '');

            const result = JSON.parse(response);
            return {
                update: result.update === true,
                reason: result.reason || 'No reason provided.'
            };

        } catch (e) {
            this.logger.warn(`Impact analysis failed (JSON parse error or AI error): ${e}. Defaulting to TRUE (safe mode).`);
            return { update: true, reason: 'Analysis failed (fallback to safe update).' };
        }
    }


}
