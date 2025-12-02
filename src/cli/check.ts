/**
 * CLI command: check
 *
 * Verifies that documentation is in sync with code by detecting drift
 */

import { DoctypeMapManager } from '../content/map-manager';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { Logger } from './logger';
import { CheckResult, CheckOptions, DriftDetail } from './types';
import { detectDrift } from './drift-detector';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  loadConfig,
  getMapPath,
  ConfigNotFoundError,
  InvalidConfigError,
} from './config-loader';

/**
 * Execute the check command
 */
export async function checkCommand(options: CheckOptions): Promise<CheckResult> {
  const logger = new Logger(options.verbose);

  logger.header('🔍 Doctype Check - Drift Detection');

  // Load configuration file (required for all commands except init)
  let config;
  try {
    config = loadConfig();
    logger.debug(`Loaded config: project "${config.projectName}"`);
  } catch (error) {
    if (error instanceof ConfigNotFoundError || error instanceof InvalidConfigError) {
      logger.error(error.message);
      return {
        totalEntries: 0,
        driftedEntries: 0,
        drifts: [],
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
      totalEntries: 0,
      driftedEntries: 0,
      drifts: [],
      success: false,
      configError: `Map file not found: ${mapPath}`,
    };
  }

  // Load the map
  const mapManager = new DoctypeMapManager(mapPath);
  const entries = mapManager.getEntries();

  if (entries.length === 0) {
    logger.warn('No entries found in doctype-map.json');
    logger.info('Add documentation anchors to your Markdown files to track them');
    return {
      totalEntries: 0,
      driftedEntries: 0,
      drifts: [],
      success: true,
    };
  }

  logger.info(`Checking ${entries.length} documentation entries...`);
  logger.newline();

  // Resolve the root directory for source code
  const codeRoot = config 
    ? resolve(config.baseDir || process.cwd(), config.projectRoot)
    : dirname(mapPath);

  // Analyze current code and detect drift using centralized logic
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();
  const detectedDrifts = await detectDrift(mapManager, analyzer, hasher, {
    logger,
    basePath: codeRoot,
  });

  // Convert DriftInfo to DriftDetail format for API compatibility
  const drifts: DriftDetail[] = detectedDrifts.map((drift) => ({
    id: drift.entry.id,
    symbolName: drift.entry.codeRef.symbolName,
    codeFilePath: drift.entry.codeRef.filePath,
    docFilePath: drift.entry.docRef.filePath,
    docLine: drift.entry.docRef.startLine,
    oldHash: drift.oldHash,
    newHash: drift.currentHash,
    oldSignature: undefined, // Could be retrieved from map if needed
    newSignature: drift.currentSignature.signatureText,
  }));

  // Display results
  logger.divider();

  if (drifts.length === 0) {
    logger.success('All documentation is in sync with code');
    logger.info(`Checked ${entries.length} entries, no drift detected`);
  } else {
    logger.error(`Documentation drift detected in ${drifts.length} ${drifts.length === 1 ? 'entry' : 'entries'}`);
    logger.newline();

    for (const drift of drifts) {
      logger.log(`  ${Logger.symbol(drift.symbolName)} in ${Logger.path(drift.codeFilePath)}`);
      logger.log(`    Doc: ${Logger.path(drift.docFilePath)}:${drift.docLine}`);
      logger.log(`    Old hash: ${Logger.hash(drift.oldHash)}`);
      logger.log(`    New hash: ${Logger.hash(drift.newHash)}`);
      if (options.verbose && drift.newSignature) {
        logger.log(`    New signature: ${drift.newSignature}`);
      }
      logger.newline();
    }

    logger.info('Run `npx doctype fix` to update the documentation');
  }

  logger.divider();

  const result: CheckResult = {
    totalEntries: entries.length,
    driftedEntries: drifts.length,
    drifts,
    success: drifts.length === 0,
  };

  return result;
}
