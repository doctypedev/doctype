/**
 * Config Loader - Loads and validates doctype.config.json
 *
 * This utility ensures that all doctype commands (except init) have access to
 * the project configuration file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DoctypeConfig } from './types';

/**
 * Error thrown when doctype.config.json is not found
 */
export class ConfigNotFoundError extends Error {
  constructor(configPath: string) {
    super(
      `Configuration file not found: ${configPath}\n\n` +
        `Run 'npx doctype init' to initialize your project configuration.`
    );
    this.name = 'ConfigNotFoundError';
  }
}

/**
 * Error thrown when doctype.config.json is invalid
 */
export class InvalidConfigError extends Error {
  constructor(reason: string) {
    super(`Invalid doctype.config.json: ${reason}`);
    this.name = 'InvalidConfigError';
  }
}

/**
 * Find the configuration file by walking up the directory tree
 */
function findConfigPath(startDir: string, configName: string): string | null {
  let currentDir = startDir;
  const root = path.parse(startDir).root;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const configPath = path.join(currentDir, configName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    if (currentDir === root || path.dirname(currentDir) === currentDir) {
      return null;
    }
    currentDir = path.dirname(currentDir);
  }
}

/**
 * Load and validate the doctype configuration file
 *
 * @param configPath - Path to doctype.config.json (default: ./doctype.config.json)
 * @returns Validated configuration object
 * @throws ConfigNotFoundError if file doesn't exist
 * @throws InvalidConfigError if file is malformed or missing required fields
 */
export function loadConfig(
  configPath: string = './doctype.config.json'
): DoctypeConfig {
  let resolvedPath: string;

  // If using the default path or just the filename, search up the directory tree
  if (configPath === './doctype.config.json' || configPath === 'doctype.config.json') {
    const found = findConfigPath(process.cwd(), 'doctype.config.json');
    if (found) {
      resolvedPath = found;
    } else {
      // Fallback to CWD for error reporting
      resolvedPath = path.resolve(process.cwd(), 'doctype.config.json');
    }
  } else {
    // If a specific path is provided (e.g. ../config.json), resolve it directly
    resolvedPath = path.resolve(process.cwd(), configPath);
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigNotFoundError(resolvedPath);
  }

  // Read and parse the file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawConfig: any;
  try {
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    rawConfig = JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InvalidConfigError(`JSON parse error: ${error.message}`);
    }
    throw error;
  }

  // Validate required fields
  const requiredFields: (keyof DoctypeConfig)[] = [
    'projectName',
    'projectRoot',
    'docsFolder',
    'mapFile',
  ];

  for (const field of requiredFields) {
    if (!rawConfig[field] || typeof rawConfig[field] !== 'string') {
      throw new InvalidConfigError(
        `Missing or invalid required field: ${field}`
      );
    }
  }

  return {
    projectName: rawConfig.projectName,
    projectRoot: rawConfig.projectRoot,
    docsFolder: rawConfig.docsFolder,
    mapFile: rawConfig.mapFile,
    outputStrategy: rawConfig.outputStrategy,
    baseDir: path.dirname(resolvedPath),
  };
}

/**
 * Check if doctype.config.json exists in the current directory
 *
 * @param configPath - Path to check (default: ./doctype.config.json)
 * @returns true if the file exists, false otherwise
 */
export function configExists(
  configPath: string = './doctype.config.json'
): boolean {
  const resolvedPath = path.resolve(process.cwd(), configPath);
  return fs.existsSync(resolvedPath);
}

/**
 * Get the absolute path to the map file based on config
 *
 * @param config - Doctype configuration
 * @returns Absolute path to the map file
 */
export function getMapPath(config: DoctypeConfig): string {
  // Map file path is relative to the config file location (project root)
  const base = config.baseDir || process.cwd();
  return path.resolve(base, config.mapFile);
}

/**
 * Get the absolute path to the docs folder based on config
 *
 * @param config - Doctype configuration
 * @returns Absolute path to the docs folder
 */
export function getDocsPath(config: DoctypeConfig): string {
  const base = config.baseDir || process.cwd();
  return path.resolve(base, config.docsFolder);
}
