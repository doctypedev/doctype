/**
 * Change Analysis Service
 * 
 * Central service for analyzing code changes, providing a unified way to get
 * git diffs, changed files, and AST symbol changes across all commands.
 */

import { GitHelper } from '../utils/git-helper';
import { Logger } from '../utils/logger';
import { ASTAnalyzer, CodeSignature } from '@sintesi/core';
import { existsSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

export interface SymbolChange {
    symbolName: string;
    filePath: string;
    changeType: 'added' | 'modified' | 'deleted';
    oldSignature?: CodeSignature;
    newSignature?: CodeSignature;
}

export interface ChangeContext {
    gitDiff: string;
    changedFiles: string[];
    symbolChanges: SymbolChange[];
    totalChanges: number;
}

export interface AnalysisOptions {
    baseBranch?: string;
    stagedOnly?: boolean;
    projectRoot?: string;
    forceFetch?: boolean;
    includeSymbols?: boolean;
    fallbackToLastCommit?: boolean;
}

export class ChangeAnalysisService {
    private logger: Logger;
    private gitHelper: GitHelper;
    private astAnalyzer: ASTAnalyzer;

    constructor(logger: Logger) {
        this.logger = logger;
        this.gitHelper = new GitHelper(logger);
        this.astAnalyzer = new ASTAnalyzer();
    }

    /**
     * Analyze changes in the repository
     */
    async analyze(options: AnalysisOptions = {}): Promise<ChangeContext> {
        const {
            baseBranch = 'main',
            stagedOnly = false,
            projectRoot = process.cwd(),
            forceFetch = false,
            includeSymbols = true,
            fallbackToLastCommit = false
        } = options;

        let effectiveBase = baseBranch;

        // 1. Fetch if needed
        if (forceFetch && !stagedOnly) {
            const fetchResult = this.gitHelper.fetch('origin', baseBranch);
            if (fetchResult.success) {
                effectiveBase = `origin/${baseBranch}`;
            } else {
                this.logger.warn(`Failed to fetch origin/${baseBranch}, falling back to local.`);
            }
        }

        // 2. Get Git Diff
        let gitDiff = this.gitHelper.getFilteredDiff(effectiveBase, stagedOnly);
        let usedLastCommit = false;
        let changedFiles: string[] = [];

        // Fallback to last commit if no changes and not strictly staged
        if (!gitDiff && !stagedOnly && fallbackToLastCommit) {
            this.logger.debug('No changes against base, utilizing last commit for context.');
            try {
                gitDiff = execSync('git show HEAD -p -n 1 -- .', { encoding: 'utf-8', stdio: 'pipe' });
                if (gitDiff) {
                    // Parse changed files from this diff or use git show --name-only
                    const nameOutput = execSync('git show HEAD --name-only --pretty=""', { encoding: 'utf-8', stdio: 'pipe' });
                    changedFiles = nameOutput.trim().split('\n').filter(Boolean);
                    usedLastCommit = true;
                }
            } catch (e) {
                this.logger.debug(`Failed to access last commit: ${e}`);
            }
        }

        if (!gitDiff) {
            return {
                gitDiff: '',
                changedFiles: [],
                symbolChanges: [],
                totalChanges: 0
            };
        }

        // 3. Get Changed Files
        if (!usedLastCommit) {
            if (stagedOnly) {
                try {
                    const output = execSync('git diff --name-only --cached', { encoding: 'utf-8' });
                    changedFiles = output.trim().split('\n').filter(Boolean);
                } catch {
                    changedFiles = [];
                }
            } else {
                // Changed against base
                changedFiles = this.gitHelper.getChangedFilesAgainstBase(effectiveBase);
            }
        }

        // Filter to relevant files (TS/RS/etc) and make absolute
        changedFiles = changedFiles
            .filter(f => this.isRelevantFile(f))
            .map(f => path.resolve(projectRoot, f));

        // 4. Symbol Analysis (if requested)
        let symbolChanges: SymbolChange[] = [];
        if (includeSymbols && changedFiles.length > 0) {
            symbolChanges = await this.analyzeSymbolChanges(changedFiles, paramsForAnalysis(usedLastCommit, effectiveBase), projectRoot);
        }

        // Helper to determine what "old" means
        function paramsForAnalysis(isLastCommit: boolean, base: string) {
            // If we looked at last commit (HEAD), the "old" version is HEAD~1
            // If we looked against base, the "old" version is base
            return isLastCommit ? 'HEAD~1' : base;
        }

        return {
            gitDiff,
            changedFiles,
            symbolChanges,
            totalChanges: symbolChanges.length > 0 ? symbolChanges.length : changedFiles.length
        };
    }

    private isRelevantFile(file: string): boolean {
        return (
            (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.rs') || file.endsWith('.js')) &&
            !file.includes('.test.') &&
            !file.includes('.spec.') &&
            !file.includes('node_modules')
        );
    }

    private async analyzeSymbolChanges(
        files: string[],
        baseBranch: string,
        projectRoot: string
    ): Promise<SymbolChange[]> {
        const changes: SymbolChange[] = [];

        for (const filePath of files) {
            try {
                // Current symbols
                const currentSymbols = await this.astAnalyzer.analyzeFile(filePath);

                // Old symbols (from git)
                const oldContent = this.getFileContentFromBranch(filePath, baseBranch, projectRoot);
                let oldSymbols: CodeSignature[] = [];

                if (oldContent) {
                    const tempFile = `${filePath}.temp.analysis`;
                    await writeFile(tempFile, oldContent);
                    try {
                        oldSymbols = await this.astAnalyzer.analyzeFile(tempFile);
                    } finally {
                        await unlink(tempFile).catch(() => { });
                    }
                }

                changes.push(...this.compareSymbols(oldSymbols, currentSymbols, filePath));

            } catch (e) {
                this.logger.debug(`Failed to analyze symbols for ${filePath}: ${e}`);
            }
        }

        return changes;
    }

    private getFileContentFromBranch(filePath: string, branch: string, root: string): string | null {
        try {
            const relPath = path.relative(root, filePath);
            return execSync(`git show ${branch}:${relPath}`, { encoding: 'utf-8', stdio: 'pipe' });
        } catch {
            return null;
        }
    }

    private compareSymbols(oldS: CodeSignature[], newS: CodeSignature[], filePath: string): SymbolChange[] {
        const changes: SymbolChange[] = [];
        const oldMap = new Map(oldS.map(s => [s.symbolName, s]));
        const newMap = new Map(newS.map(s => [s.symbolName, s]));

        for (const [name, newSig] of newMap) {
            const oldSig = oldMap.get(name);
            if (!oldSig) {
                changes.push({ symbolName: name, filePath, changeType: 'added', newSignature: newSig });
            } else if (oldSig.hash !== newSig.hash) {
                changes.push({ symbolName: name, filePath, changeType: 'modified', oldSignature: oldSig, newSignature: newSig });
            }
        }

        for (const [name, oldSig] of oldMap) {
            if (!newMap.has(name)) {
                changes.push({ symbolName: name, filePath, changeType: 'deleted', oldSignature: oldSig });
            }
        }

        return changes;
    }
}
