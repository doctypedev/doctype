/**
 * CLI command: fix
 *
 * Fixes documentation drift by updating Markdown files with AI-generated content
 *
 * Manual content updates (placeholder)
 * AI-powered documentation generation (OpenAI, Gemini)
 */

import { DoctypeMapManager } from '../../../content/map-manager';
import { AstAnalyzer } from '@doctypedev/core';
import { Logger } from '../utils/logger';
import { FixResult, FixOptions } from '../types';
import { detectDrift } from '../services/drift-detector';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  loadConfig,
  getMapPath,
  ConfigNotFoundError,
  InvalidConfigError,
} from '../services/config-loader';
import { executeFixes } from '../orchestrators/fix-orchestrator';

/**
 * Execute the fix command
 */
export async function fixCommand(options: FixOptions): Promise<FixResult> {
  const logger = new Logger(options.verbose);

  logger.header('🔧 Doctype Fix - Update Documentation');

  // Load configuration file (required for all commands except init)
  let config;
  try {
    config = loadConfig();
    logger.debug(`Loaded config: project "${config.projectName}"`);
  } catch (error) {
    if (error instanceof ConfigNotFoundError || error instanceof InvalidConfigError) {
      logger.error(error.message);
      return {
        totalFixes: 0,
        successfulFixes: 0,
        failedFixes: 0,
        fixes: [],
        success: false,
        configError: error.message,
      };
    }
    throw error;
  }

  // Get map path from config, or use CLI override
  const mapPath = options.map
    ? resolve(options.map)
    : getMapPath(config);

  logger.debug(`Using map file: ${mapPath}`);

  // Validate map file exists
  if (!existsSync(mapPath)) {
    logger.error(`Map file not found: ${Logger.path(mapPath)}`);
    logger.info('Run this command from your project root, or specify --map path');
    return {
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixes: [],
      success: false,
      configError: `Map file not found: ${mapPath}`,
    };
  }

  // Load the map
  const mapManager = new DoctypeMapManager(mapPath);
  const entries = mapManager.getEntries();

  if (entries.length === 0) {
    logger.warn('No entries found in doctype-map.json');
    return {
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixes: [],
      success: true,
    };
  }

  logger.info(`Analyzing ${entries.length} documentation entries...`);
  logger.newline();

  // Resolve the root directory for source code
  const codeRoot = config
    ? resolve(config.baseDir || process.cwd(), config.projectRoot)
    : dirname(mapPath);

  // Detect drift using centralized logic
  const analyzer = new AstAnalyzer();
  const { drifts: detectedDrifts, missing } = detectDrift(mapManager, analyzer, {
    logger,
    basePath: codeRoot,
  });

  if (missing.length > 0) {
    logger.warn(`Skipping ${missing.length} missing symbols/files (cannot fix automatically). Run 'check' command for details.`);
  }

  if (detectedDrifts.length === 0) {
    logger.success('No drift detected - all documentation is up to date');
    return {
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixes: [],
      success: true,
    };
  }

  logger.info(`Found ${detectedDrifts.length} ${detectedDrifts.length === 1 ? 'entry' : 'entries'} with drift`);

  if (options.dryRun) {
    logger.warn('Dry run mode - no files will be modified');
  }

  logger.newline();
  logger.divider();

  // Execute fixes using the orchestrator
  return await executeFixes(
    detectedDrifts,
    mapManager,
    options,
    config,
    logger,
    'Updated'
  );
}
