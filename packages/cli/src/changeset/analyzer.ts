/**
 * Changeset Analyzer - Analyzes code changes to generate changesets
 */

import { execSync } from 'child_process';
import { ASTAnalyzer as RustASTAnalyzer, CodeSignature } from '@doctypedev/core';
import { Logger } from '../utils/logger';

// Use Rust AST Analyzer type
type ASTAnalyzer = InstanceType<typeof RustASTAnalyzer>;

/**
 * Represents a change to a code symbol
 */
export interface SymbolChange {
  /** Symbol name */
  symbolName: string;
  /** File path */
  filePath: string;
  /** Change type */
  changeType: 'added' | 'modified' | 'deleted';
  /** Old signature (if modified or deleted) */
  oldSignature?: CodeSignature;
  /** New signature (if modified or added) */
  newSignature?: CodeSignature;
}

/**
 * Analysis result with git diff and AST changes
 */
export interface ChangesetAnalysis {
  /** Git diff output */
  gitDiff: string;
  /** List of changed TypeScript files */
  changedFiles: string[];
  /** List of symbol changes detected */
  symbolChanges: SymbolChange[];
  /** Total number of changes */
  totalChanges: number;
}

/**
 * Options for changeset analysis
 */
export interface AnalysisOptions {
  /** Compare against a specific branch (default: main) */
  baseBranch?: string;
  /** Include only staged changes */
  stagedOnly?: boolean;
  /** Project root directory */
  projectRoot?: string;
  /** Force fetch the base branch from origin before analyzing changes */
  forceFetch?: boolean;
}

/**
 * Changeset Analyzer
 *
 * Combines git diff analysis with AST symbol extraction to understand
 * code changes at a semantic level
 */
export class ChangesetAnalyzer {
  private logger: Logger;
  private analyzer: ASTAnalyzer;

  constructor(logger: Logger) {
    this.logger = logger;
    this.analyzer = new RustASTAnalyzer();
  }

  /**
   * Analyze changes in the repository
   */
  async analyzeChanges(options: AnalysisOptions = {}): Promise<ChangesetAnalysis> {
    const {
      baseBranch = 'main',
      stagedOnly = false,
      projectRoot = process.cwd(),
      forceFetch = false,
    } = options;

    this.logger.debug(`Analyzing changes against ${baseBranch}`);
    this.logger.debug(`Force fetch: ${forceFetch}`);

    let effectiveBaseBranch = baseBranch;

    if (forceFetch) {
      try {
        this.logger.info(`Fetching latest changes from origin/${baseBranch}...`);
        execSync(`git fetch origin ${baseBranch}`, { stdio: 'pipe' });
        this.logger.success(`Successfully fetched origin/${baseBranch}`);

        // When force fetching, we want to compare against the remote branch
        // to avoid issues where local base branch is stale
        effectiveBaseBranch = `origin/${baseBranch}`;
      } catch (error) {
        this.logger.warn(
          `Failed to fetch origin/${baseBranch}. Using local branch for analysis. Error: ${error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Get git diff
    const gitDiff = this.getGitDiff(effectiveBaseBranch, stagedOnly);

    if (!gitDiff) {
      this.logger.info('No changes detected');
      return {
        gitDiff: '',
        changedFiles: [],
        symbolChanges: [],
        totalChanges: 0,
      };
    }

    // Extract changed TypeScript files from diff
    const changedFiles = this.extractChangedFiles(gitDiff, projectRoot);

    this.logger.debug(`Found ${changedFiles.length} changed TypeScript files`);

    // Analyze symbols in changed files
    const symbolChanges = await this.analyzeSymbolChanges(
      changedFiles,
      effectiveBaseBranch,
      projectRoot
    );

    return {
      gitDiff,
      changedFiles,
      symbolChanges,
      totalChanges: symbolChanges.length,
    };
  }

  /**
   * Get git diff output
   */
  private getGitDiff(baseBranch: string, stagedOnly: boolean): string {
    try {
      let command: string;

      if (stagedOnly) {
        // Get staged changes only
        command = 'git diff --cached';
      } else {
        // Get all changes compared to base branch
        // First try to get the merge base
        try {
          execSync(`git merge-base ${baseBranch} HEAD`, { stdio: 'pipe' });
          command = `git diff ${baseBranch}...HEAD -- . ':(exclude)package-lock.json' ':(exclude)yarn.lock' ':(exclude)pnpm-lock.yaml'`;
        } catch {
          // If merge base doesn't exist, just compare HEAD
          this.logger.warn(`Could not find merge base with ${baseBranch}, comparing with HEAD`);
          command = `git diff HEAD -- . ':(exclude)package-lock.json' ':(exclude)yarn.lock' ':(exclude)pnpm-lock.yaml'`;
        }
      }

      return execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      this.logger.error('Failed to get git diff:', error);
      return '';
    }
  }

  /**
   * Extract TypeScript files from git diff
   */
  private extractChangedFiles(gitDiff: string, projectRoot: string): string[] {
    const files = new Set<string>();
    const lines = gitDiff.split('\n');

    for (const line of lines) {
      // Look for diff headers: diff --git a/file b/file
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.+)$/);
        if (match) {
          const filePath = match[1];
          // Only include TypeScript files
          if (filePath.match(/\.(ts|tsx)$/) && !filePath.includes('node_modules')) {
            files.add(`${projectRoot}/${filePath}`);
          }
        }
      }
    }

    return Array.from(files);
  }

  /**
   * Analyze symbol changes in the given files
   */
  private async analyzeSymbolChanges(
    files: string[],
    baseBranch: string,
    projectRoot: string
  ): Promise<SymbolChange[]> {
    const changes: SymbolChange[] = [];

    for (const filePath of files) {
      try {
        // Get current symbols
        const currentSymbols = await this.analyzer.analyzeFile(filePath);

        // Get old symbols from base branch
        const oldContent = this.getFileContentFromBranch(filePath, baseBranch, projectRoot);
        let oldSymbols: CodeSignature[] = [];

        if (oldContent) {
          // Write old content to temp file for analysis
          const tempFile = `${filePath}.temp`;
          const fs = await import('fs/promises');
          await fs.writeFile(tempFile, oldContent);

          try {
            oldSymbols = await this.analyzer.analyzeFile(tempFile);
          } finally {
            // Clean up temp file
            await fs.unlink(tempFile).catch(() => { });
          }
        }

        // Compare symbols
        const fileChanges = this.compareSymbols(
          oldSymbols,
          currentSymbols,
          filePath
        );

        changes.push(...fileChanges);
      } catch (error) {
        this.logger.warn(`Failed to analyze ${filePath}:`, error);
      }
    }

    return changes;
  }

  /**
   * Get file content from a specific branch
   */
  private getFileContentFromBranch(
    filePath: string,
    branch: string,
    projectRoot: string
  ): string | null {
    try {
      // Convert absolute path to relative for git
      const relativePath = filePath.replace(`${projectRoot}/`, '');
      return execSync(`git show ${branch}:${relativePath}`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      // File doesn't exist in base branch (newly added)
      return null;
    }
  }

  /**
   * Compare old and new symbols to detect changes
   */
  private compareSymbols(
    oldSymbols: CodeSignature[],
    newSymbols: CodeSignature[],
    filePath: string
  ): SymbolChange[] {
    const changes: SymbolChange[] = [];
    const oldMap = new Map(oldSymbols.map(s => [s.symbolName, s]));
    const newMap = new Map(newSymbols.map(s => [s.symbolName, s]));

    // Find added and modified symbols
    for (const [symbolName, newSig] of newMap) {
      const oldSig = oldMap.get(symbolName);

      if (!oldSig) {
        // Symbol was added
        changes.push({
          symbolName,
          filePath,
          changeType: 'added',
          newSignature: newSig,
        });
      } else if (oldSig.hash !== newSig.hash) {
        // Symbol was modified
        changes.push({
          symbolName,
          filePath,
          changeType: 'modified',
          oldSignature: oldSig,
          newSignature: newSig,
        });
      }
    }

    // Find deleted symbols
    for (const [symbolName, oldSig] of oldMap) {
      if (!newMap.has(symbolName)) {
        changes.push({
          symbolName,
          filePath,
          changeType: 'deleted',
          oldSignature: oldSig,
        });
      }
    }

    return changes;
  }
}
