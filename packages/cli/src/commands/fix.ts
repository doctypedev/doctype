/**
 * CLI command: fix
 *
 * Fixes documentation drift by updating Markdown files with AI-generated content
 *
 * Manual content updates (placeholder)
 * AI-powered documentation generation (OpenAI, Gemini)
 */

import { DoctypeMapManager } from '../../../content/map-manager';
import { ContentInjector } from '../../../content/content-injector';
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
import { determineOutputFile } from '../orchestrators/init-orchestrator';
import { v4 as uuidv4 } from 'uuid';

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

  // Resolve the root directory for source code
  const codeRoot = config
    ? resolve(config.baseDir || process.cwd(), config.projectRoot)
    : dirname(mapPath);

  // Detect drift using centralized logic
  const analyzer = new AstAnalyzer();
  const { drifts: detectedDrifts, missing, untracked } = detectDrift(mapManager, analyzer, {
    logger,
    basePath: codeRoot,
    discoverUntracked: true,
    projectRoot: config ? config.projectRoot : undefined
  });

  if (options.prune && missing.length > 0) {
    logger.info(`Pruning ${missing.length} missing entries...`);
    const injector = new ContentInjector();
    let prunedCount = 0;

    for (const m of missing) {
      try {
        const docFilePath = resolve(config?.baseDir || process.cwd(), m.entry.docRef.filePath);
        let anchorRemoved = true;

        // 1. Try to remove from markdown first
        if (existsSync(docFilePath) && !options.dryRun) {
          const result = injector.removeAnchor(docFilePath, m.entry.id, true);
          anchorRemoved = result.success;

          if (result.success) {
            logger.debug(`Removed anchor for ${m.entry.codeRef.symbolName} from ${m.entry.docRef.filePath}`);
          } else {
            logger.warn(`Could not remove anchor for ${m.entry.codeRef.symbolName}: ${result.error}`);
          }
        }

        // 2. Only remove from map if anchor was removed (or file didn't exist)
        if (anchorRemoved) {
          if (mapManager.removeEntry(m.entry.id)) {
            prunedCount++;
          }
        }
      } catch (error) {
        logger.error(`Failed to prune ${m.entry.codeRef.symbolName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!options.dryRun) {
      mapManager.save();
    }

    logger.success(`Pruned ${prunedCount} entries from the map.`);
  } else if (missing.length > 0) {
    logger.warn(`Skipping ${missing.length} missing symbols/files (cannot fix automatically). Run 'fix --prune' to remove them.`);
  }

  // Process untracked symbols
  if (untracked.length > 0) {
    logger.info(`Found ${untracked.length} untracked symbols. Adding them to tracking...`);

    for (const symbol of untracked) {
      // Determine output file
      const targetDocFile = determineOutputFile(
        config.outputStrategy || 'mirror',
        config.docsFolder,
        symbol.filePath,
        symbol.signature.symbolType
      );

      // Create new entry
      const newEntry = {
        id: uuidv4(),
        codeRef: {
          filePath: symbol.filePath,
          symbolName: symbol.symbolName
        },
        codeSignatureHash: symbol.signature.hash!, // Hash is computed by analyzer
        codeSignatureText: symbol.signature.signatureText,
        docRef: {
          filePath: targetDocFile
        },
        lastUpdated: Date.now()
      };

      // Add to drifts list to be processed (generated/injected)
      detectedDrifts.push({
        entry: newEntry,
        currentSignature: symbol.signature,
        currentHash: symbol.signature.hash!,
        oldHash: '', // New entry
        oldSignature: undefined
      });
    }
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

  logger.info(`Found ${detectedDrifts.length} ${detectedDrifts.length === 1 ? 'entry' : 'entries'} to update/generate`);

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
