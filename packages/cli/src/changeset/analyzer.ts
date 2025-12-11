/**
 * Changeset Analyzer - Analyzes code changes to generate changesets
 */

import { ChangeAnalysisService, SymbolChange, ChangeContext } from '../services/analysis-service';
import { Logger } from '../utils/logger';

// Re-export types for compatibility
export { SymbolChange };

/**
 * Analysis result with git diff and AST changes
 */
export interface ChangesetAnalysis extends ChangeContext {
  // Can extend if needed, currently 1:1 map
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
  private service: ChangeAnalysisService;

  constructor(logger: Logger) {
    this.logger = logger;
    this.service = new ChangeAnalysisService(logger);
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

    this.logger.debug(`Analyzing changes against ${baseBranch} (delegating to AnalysisService)`);

    return this.service.analyze({
      baseBranch,
      stagedOnly,
      projectRoot,
      forceFetch,
      includeSymbols: true
    });
  }
}

