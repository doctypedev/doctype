/**
 * CLI command: check
 *
 * Verifies that documentation is in sync with code by detecting drift
 */

import { SintesiMapManager } from '../../../content/map-manager';
import { AstAnalyzer } from '@sintesi/core';
import { Logger } from '../utils/logger';
import { CheckResult, CheckOptions, DriftDetail } from '../types';
import { detectDrift } from '../services/drift-detector';
import { SmartChecker } from '../services/smart-checker';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
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

  logger.header('🔍 Sintesi Check - Drift Detection');

  let smartDriftDetected = false;

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
    // If smart check is enabled, we can proceed without a map file for that specific check
    if (options.smart) {
      logger.warn(`Map file not found: ${Logger.path(mapPath)}`);
      logger.info('Proceeding with high-level drift detection only.');
    } else {
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
  }

  // Load the map if it exists
  let mapManager: SintesiMapManager | undefined;
  let entries: import('@sintesi/core').SintesiMapEntry[] = [];

  if (existsSync(mapPath)) {
    mapManager = new SintesiMapManager(mapPath);
    entries = mapManager.getEntries();
  }

  if (entries.length === 0 && existsSync(mapPath)) {
    logger.warn('No entries found in sintesi-map.json');
    logger.info('Add documentation anchors to your Markdown files to track them');

    // Only return early if not doing smart check
    if (!options.smart) {
      return {
        totalEntries: 0,
        driftedEntries: 0,
        missingEntries: 0,
        drifts: [],
        missing: [],
        success: true,
      };
    }
  }

  const detectedDrifts: import('../services/drift-detector').DriftInfo[] = [];
  const missingSymbols: import('../services/drift-detector').MissingSymbolInfo[] = [];
  const untrackedSymbols: import('../services/drift-detector').UntrackedSymbolInfo[] = [];

  // Resolve the root directory for source code
  const codeRoot = config
    ? resolve(config.baseDir || process.cwd(), config.projectRoot)
    : dirname(mapPath);

  // Only perform standard drift detection if map exists and has entries
  if (mapManager && entries.length > 0) {
    logger.info(`Checking ${entries.length} documentation entries...`);
    logger.newline();

    // Analyze current code and detect drift using centralized logic
    const analyzer = new AstAnalyzer();
    const driftResult = detectDrift(mapManager, analyzer, {
      logger,
      basePath: codeRoot,
      discoverUntracked: true,
      projectRoot: config ? config.projectRoot : undefined
    });

    detectedDrifts.push(...driftResult.drifts);
    missingSymbols.push(...driftResult.missing);
    untrackedSymbols.push(...driftResult.untracked);
  }

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

  if (drifts.length === 0 && missingDetails.length === 0 && untrackedSymbols.length === 0) {
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

    if (untrackedSymbols.length > 0) {
      logger.warn(`Found ${untrackedSymbols.length} untracked ${untrackedSymbols.length === 1 ? 'symbol' : 'symbols'} (not documented)`);
      logger.newline();

      // Only show top 10 if verbose is false to avoid spamming
      const showCount = options.verbose ? untrackedSymbols.length : Math.min(untrackedSymbols.length, 10);

      for (let i = 0; i < showCount; i++) {
        const symbol = untrackedSymbols[i];
        logger.log(`  ${Logger.symbol(symbol.symbolName)} in ${Logger.path(symbol.filePath)}`);
      }

      if (!options.verbose && untrackedSymbols.length > 10) {
        logger.log(`  ...and ${untrackedSymbols.length - 10} more. Use --verbose to see all.`);
      }

      logger.newline();
      logger.info('Run `npx sintesi fix` to automatically document these symbols.');
      logger.newline();
    }

    if (drifts.length > 0) {
      logger.info('Run `npx sintesi fix` to update the documentation');
    }
  }

  // Smart Check (High-level drift detection)
  if (options.smart) {
    logger.newline();
    const smartChecker = new SmartChecker(logger, codeRoot);
    const smartResult = await smartChecker.checkReadme({ baseBranch: options.base });

    if (smartResult.hasDrift) {
      logger.warn('⚠️ High-level drift detected: README might be outdated');
      if (smartResult.reason) logger.log(`  Reason: ${smartResult.reason}`);
      if (smartResult.suggestion) logger.log(`  Suggestion: ${smartResult.suggestion}`);
      logger.newline();

      // If smart check fails, we mark the command as failed so CI can react
      if (options.smart) {
        // Save context for other commands (like readme) to consume
        try {
          const sintesiDir = resolve(process.cwd(), '.sintesi');
          if (!existsSync(sintesiDir)) {
            mkdirSync(sintesiDir, { recursive: true });
          }
          const contextPath = join(sintesiDir, 'smart-context.json');
          writeFileSync(contextPath, JSON.stringify({
            reason: smartResult.reason,
            suggestion: smartResult.suggestion,
            timestamp: Date.now()
          }, null, 2));
          logger.debug(`Saved smart check context to ${contextPath}`);
        } catch (e) {
          logger.debug(`Failed to save smart context: ${e}`);
        }

        // Mark as failed by updating a local flag, which we will use to set the final result
        smartDriftDetected = true;
      }
    } else {
      logger.success('README appears to be in sync with recent changes');
    }
  }

  logger.divider();

  const result: CheckResult = {
    totalEntries: entries.length,
    driftedEntries: drifts.length,
    missingEntries: missingDetails.length,
    untrackedEntries: untrackedSymbols.length,
    drifts,
    missing: missingDetails,
    success: drifts.length === 0 && missingDetails.length === 0 && !smartDriftDetected,
  };

  return result;
}
