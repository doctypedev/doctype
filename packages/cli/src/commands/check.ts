/**
 * CLI command: check
 *
 * Verifies that documentation is in sync with code by detecting drift
 */

import { DoctypeMapManager } from '../../../content/map-manager';
import { AstAnalyzer } from '@doctypedev/core';
import { Logger } from '../utils/logger';
import { CheckResult, CheckOptions, DriftDetail } from '../types';
import { detectDrift } from '../services/drift-detector';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  loadConfig,
  getMapPath,
  ConfigNotFoundError,
  InvalidConfigError,
} from '../services/config-loader';

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
        missingEntries: 0,
        drifts: [],
        missing: [],
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
      missingEntries: 0,
      drifts: [],
      missing: [],
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
      missingEntries: 0,
      drifts: [],
      missing: [],
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
  const analyzer = new AstAnalyzer();
  const { drifts: detectedDrifts, missing: missingSymbols } = detectDrift(mapManager, analyzer, {
    logger,
    basePath: codeRoot,
  });

  // Convert DriftInfo to DriftDetail format for API compatibility
  const drifts: DriftDetail[] = detectedDrifts.map((drift) => ({
    id: drift.entry.id,
    symbolName: drift.entry.codeRef.symbolName,
    codeFilePath: drift.entry.codeRef.filePath,
    docFilePath: drift.entry.docRef.filePath,
    oldHash: drift.oldHash,
    newHash: drift.currentHash,
    oldSignature: undefined, // Could be retrieved from map if needed
    newSignature: drift.currentSignature.signatureText,
  }));

  // Convert MissingSymbolInfo to MissingSymbolDetail
  const missingDetails: import('../types').MissingSymbolDetail[] = missingSymbols.map((m) => ({
    id: m.entry.id,
    symbolName: m.entry.codeRef.symbolName,
    codeFilePath: m.entry.codeRef.filePath,
    docFilePath: m.entry.docRef.filePath,
    reason: m.reason,
  }));

  // Display results
  logger.divider();

  if (drifts.length === 0 && missingDetails.length === 0) {
    logger.success('All documentation is in sync with code');
    logger.info(`Checked ${entries.length} entries, no drift detected`);
  } else {
    if (drifts.length > 0) {
        logger.error(`Documentation drift detected in ${drifts.length} ${drifts.length === 1 ? 'entry' : 'entries'}`);
        logger.newline();

        for (const drift of drifts) {
        logger.log(`  ${Logger.symbol(drift.symbolName)} in ${Logger.path(drift.codeFilePath)}`);
        logger.log(`    Doc: ${Logger.path(drift.docFilePath)} (anchor: ${drift.id})`);
        logger.log(`    Old hash: ${Logger.hash(drift.oldHash)}`);
        logger.log(`    New hash: ${Logger.hash(drift.newHash)}`);
        if (options.verbose && drift.newSignature) {
            logger.log(`    New signature: ${drift.newSignature}`);
        }
        logger.newline();
        }
    }

    if (missingDetails.length > 0) {
        logger.error(`Missing symbols detected in ${missingDetails.length} ${missingDetails.length === 1 ? 'entry' : 'entries'}`);
        logger.newline();

        for (const m of missingDetails) {
            logger.log(`  ${Logger.symbol(m.symbolName)} in ${Logger.path(m.codeFilePath)}`);
            logger.log(`    Doc: ${Logger.path(m.docFilePath)} (anchor: ${m.id})`);
            logger.log(`    Reason: ${m.reason === 'file_not_found' ? 'Code file not found' : 'Symbol not found in file'}`);
            if (m.reason === 'symbol_not_found') {
                logger.log(`    Tip: Did you rename the function? Update the map or the code.`);
            }
            logger.newline();
        }
    }

    if (drifts.length > 0) {
        logger.info('Run `npx doctype fix` to update the documentation');
    }
  }

  logger.divider();

  const result: CheckResult = {
    totalEntries: entries.length,
    driftedEntries: drifts.length,
    missingEntries: missingDetails.length,
    drifts,
    missing: missingDetails,
    success: drifts.length === 0 && missingDetails.length === 0,
  };

  return result;
}
