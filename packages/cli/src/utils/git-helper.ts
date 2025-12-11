/**
 * Git operations helper for auto-commit functionality
 */

import { execSync } from 'child_process';
import { Logger } from './logger';

/**
 * Result of a git operation
 */
export interface GitOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Output from the git command */
  output?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Git helper for auto-commit functionality
 */
export class GitHelper {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Check if current directory is a git repository
   */
  isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current git status
   */
  getStatus(): GitOperationResult {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf-8' });
      return {
        success: true,
        output: output.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  hasUncommittedChanges(): boolean {
    const status = this.getStatus();
    return status.success && !!status.output;
  }

  /**
   * Get diff of changes
   * @param staged - Whether to get diff of staged changes
   */
  async getDiff(staged: boolean = false): Promise<string> {
    try {
      const args = staged ? '--staged' : '';
      return execSync(`git diff ${args}`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      this.logger.debug(`Failed to get diff: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * Get list of changed files
   * @param revision Optional revision to check against (e.g. 'HEAD'). If omitted, checks working tree (staged + unstaged).
   */
  getChangedFiles(revision?: string): string[] {
    try {
      if (revision) {
        // Get changed files in the specified revision (comparing against its parent)
        // git show --name-only --pretty="" HEAD
        const output = execSync(`git show --name-only --pretty="" ${revision}`, { encoding: 'utf-8' });
        return output.trim().split('\n').filter(Boolean);
      }

      // Get staged changes
      const staged = execSync('git diff --name-only --cached', { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
      // Get unstaged changes
      const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);

      // Combine and deduplicate
      return Array.from(new Set([...staged, ...unstaged]));
    } catch (error) {
      this.logger.debug(`Failed to get changed files: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get list of changed files against a base branch (e.g. origin/main)
   * Uses "git diff base...HEAD" (triple dot)
   */
  getChangedFilesAgainstBase(base: string): string[] {
    try {
      const output = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch (error) {
      this.logger.debug(`Failed to get changed files against base ${base}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get diff against a base branch
   */
  getDiffAgainstBase(base: string): string {
    try {
      return execSync(`git diff ${base}...HEAD`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      this.logger.debug(`Failed to get diff against base ${base}: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * Stage files for commit
   */
  addFiles(files: string[]): GitOperationResult {
    try {
      this.logger.debug(`Staging files: ${files.join(', ')}`);

      const filesArg = files.map(f => `"${f}"`).join(' ');
      const output = execSync(`git add ${filesArg}`, { encoding: 'utf-8' });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a git commit
   */
  commit(message: string): GitOperationResult {
    try {
      this.logger.debug(`Creating commit: ${message}`);

      // Escape quotes in commit message
      const escapedMessage = message.replace(/"/g, '\\"');
      const output = execSync(`git commit -m "${escapedMessage}"`, { encoding: 'utf-8' });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Push commits to remote
   */
  push(): GitOperationResult {
    try {
      this.logger.debug('Pushing to remote');

      const output = execSync('git push', { encoding: 'utf-8' });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Auto-commit documentation changes
   * Stages files, commits with a standard message, and optionally pushes
   */
  autoCommit(files: string[], symbolNames: string[], push: boolean = false): GitOperationResult {
    // Check if git repository
    if (!this.isGitRepository()) {
      return {
        success: false,
        error: 'Not a git repository',
      };
    }

    // Stage files
    const addResult = this.addFiles(files);
    if (!addResult.success) {
      return addResult;
    }

    this.logger.info(`Staged ${files.length} ${files.length === 1 ? 'file' : 'files'}`);

    // Create commit message
    const commitMessage = this.createCommitMessage(symbolNames);

    // Commit
    const commitResult = this.commit(commitMessage);
    if (!commitResult.success) {
      return commitResult;
    }

    this.logger.success('Changes committed successfully');

    // Push if requested
    if (push) {
      const pushResult = this.push();
      if (!pushResult.success) {
        this.logger.warn('Failed to push to remote');
        return pushResult;
      }

      this.logger.success('Changes pushed to remote');
    }

    return {
      success: true,
      output: commitMessage,
    };
  }

  /**
   * Create a commit message for documentation updates
   */
  private createCommitMessage(symbolNames: string[]): string {
    if (symbolNames.length === 0) {
      return '🤖 Sintesi Bot: Auto-fix documentation';
    }

    if (symbolNames.length === 1) {
      return `🤖 Sintesi Bot: Auto-fix documentation for ${symbolNames[0]}`;
    }

    if (symbolNames.length <= 3) {
      return `🤖 Sintesi Bot: Auto-fix documentation for ${symbolNames.join(', ')}`;
    }

    return `🤖 Sintesi Bot: Auto-fix documentation for ${symbolNames.length} symbols`;
  }
}
