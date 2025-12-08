/**
 * CLI-specific type definitions
 */

import type { OutputStrategy } from '../orchestrators/init-orchestrator';

/**
 * Result of a drift check operation
 */
export interface CheckResult {
  /** Total number of entries checked */
  totalEntries: number;
  /** Number of entries with drift detected */
  driftedEntries: number;
  /** Number of entries with missing symbols */
  missingEntries: number;
  /** List of drifted entry details */
  drifts: DriftDetail[];
  /** List of missing symbol details */
  missing: MissingSymbolDetail[];
  /** Overall success status (false if any drift detected) */
  success: boolean;
  /** Configuration error (e.g., map file not found) - should always exit with error regardless of --strict */
  configError?: string;
}

/**
 * Details about a specific drift
 */
export interface DriftDetail {
  /** Anchor ID */
  id: string;
  /** Symbol name that drifted */
  symbolName: string;
  /** File path of the code */
  codeFilePath: string;
  /** Documentation file path */
  docFilePath: string;
  /** Old signature hash */
  oldHash: string;
  /** New signature hash */
  newHash: string;
  /** Old signature text */
  oldSignature?: string;
  /** New signature text */
  newSignature?: string;
}

/**
 * Details about a missing symbol
 */
export interface MissingSymbolDetail {
  /** Anchor ID */
  id: string;
  /** Symbol name that is missing */
  symbolName: string;
  /** File path where the symbol was expected */
  codeFilePath: string;
  /** Documentation file path */
  docFilePath: string;
  /** Reason for missing */
  reason: 'file_not_found' | 'symbol_not_found';
}


/**
 * Result of a fix operation
 */
export interface FixResult {
  /** Total number of fixes attempted */
  totalFixes: number;
  /** Number of successful fixes */
  successfulFixes: number;
  /** Number of failed fixes */
  failedFixes: number;
  /** Details of each fix attempt */
  fixes: FixDetail[];
  /** Overall success status */
  success: boolean;
  /** Configuration error (e.g., map file not found) - should always exit with error */
  configError?: string;
}

/**
 * Details about a specific fix attempt
 */
export interface FixDetail {
  /** Anchor ID */
  id: string;
  /** Symbol name */
  symbolName: string;
  /** Code file path */
  codeFilePath: string;
  /** Documentation file path */
  docFilePath: string;
  /** Whether the fix was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** New content that was injected (if successful) */
  newContent?: string;
}

/**
 * CLI configuration options
 */
export interface CLIConfig {
  /** Path to doctype-map.json */
  mapPath: string;
  /** Root directory of the project */
  projectRoot: string;
  /** Verbose logging */
  verbose: boolean;
  /** Dry run mode (no file writes) */
  dryRun: boolean;
}

/**
 * Options for the check command
 */
export interface CheckOptions {
  /** Path to doctype-map.json */
  map?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Exit with error code if drift detected */
  strict?: boolean;
}

/**
 * Options for the fix command
 */
export interface FixOptions {
  /** Path to doctype-map.json */
  map?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run (preview changes without writing) */
  dryRun?: boolean;
  /** Auto-commit changes with git */
  autoCommit?: boolean;
  /** Interactive mode (prompt before each fix) */
  interactive?: boolean;
  /** Disable AI-generated content (use placeholder instead) */
  noAI?: boolean;
}

/**
 * Options for the init command
 */
export interface InitOptions {
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Options for the generate command (extends FixOptions)
 */
export interface GenerateOptions extends FixOptions { }

/**
 * Result of a generate operation (extends FixResult)
 */
export interface GenerateResult extends FixResult { }

/**
 * Options for the changeset command
 */
export interface ChangesetOptions {
  /** Base branch to compare against */
  baseBranch?: string;
  /** Only analyze staged changes */
  stagedOnly?: boolean;
  /** Package name for the changeset */
  packageName?: string;
  /** Output directory for changeset */
  outputDir?: string;
  /** Skip AI analysis and use defaults */
  noAI?: boolean;
  /** Manually specify version type */
  versionType?: 'major' | 'minor' | 'patch';
  /** Manually specify description */
  description?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Force interactive package selection */
  interactive?: boolean;
  /** Force fetch the base branch from origin before analyzing changes */
  forceFetch?: boolean;
}

/**
 * Result of a changeset operation
 */
export interface ChangesetResult {
  /** Whether the changeset was generated successfully */
  success: boolean;
  /** Path to the generated changeset file */
  filePath?: string;
  /** Version type determined */
  versionType?: 'major' | 'minor' | 'patch';
  /** Generated description */
  description?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of an init operation
 */
export interface InitResult {
  /** Whether the initialization was successful */
  success: boolean;
  /** Path to the created config file */
  configPath?: string;
  /** Error message if failed */
  error?: string;
}

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'mistral';

/**
 * Doctype configuration file structure
 */
export interface DoctypeConfig {
  /** Project name */
  projectName: string;
  /** Project root directory */
  projectRoot: string;
  /** Documentation folder path */
  docsFolder: string;
  /** Map file name/path */
  mapFile: string;
  /** Strategy for generating documentation files */
  outputStrategy?: OutputStrategy;
  /** Directory where the config file was found (internal use) */
  baseDir?: string;
  /** AI provider to use for generation */
  aiProvider?: AIProvider;
}
