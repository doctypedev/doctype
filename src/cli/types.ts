/**
 * CLI-specific type definitions
 */

/**
 * Result of a drift check operation
 */
export interface CheckResult {
  /** Total number of entries checked */
  totalEntries: number;
  /** Number of entries with drift detected */
  driftedEntries: number;
  /** List of drifted entry details */
  drifts: DriftDetail[];
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
  /** Line number in documentation */
  docLine: number;
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
}

/**
 * Strategy for generating documentation files
 */
export type OutputStrategy = 'mirror' | 'module' | 'type';
