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
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Execute the check command
 */
export async function checkCommand(options: CheckOptions): Promise<CheckResult> {
  const logger = new Logger(options.verbose);
  const mapPath = resolve(options.map || './doctype-map.json');

  logger.header('🔍 Doctype Check - Drift Detection');

  // Validate map file exists
  if (!existsSync(mapPath)) {
    logger.error(`Map file not found: ${Logger.path(mapPath)}`);
    logger.info('Run this command from your project root, or specify --map path');
    return {
      totalEntries: 0,
      driftedEntries: 0,
      drifts: [],
      success: false,
    };
  }

  logger.debug(`Loading map from: ${mapPath}`);

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

  // Analyze current code and detect drift
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();
  const drifts: DriftDetail[] = [];
  const currentHashes = new Map<string, string>();

  for (const entry of entries) {
    logger.debug(`Analyzing ${entry.codeRef.filePath}#${entry.codeRef.symbolName}`);

    try {
      // Check if code file exists
      if (!existsSync(entry.codeRef.filePath)) {
        logger.warn(
          `Code file not found: ${Logger.path(entry.codeRef.filePath)} (${Logger.symbol(entry.codeRef.symbolName)})`
        );
        continue;
      }

      // Analyze the code file
      const signatures = analyzer.analyzeFile(entry.codeRef.filePath);
      const currentSignature = signatures.find((sig) => sig.symbolName === entry.codeRef.symbolName);

      if (!currentSignature) {
        logger.warn(
          `Symbol ${Logger.symbol(entry.codeRef.symbolName)} not found in ${Logger.path(entry.codeRef.filePath)}`
        );
        continue;
      }

      // Generate current hash
      const currentHashObj = hasher.hash(currentSignature);
      const currentHash = currentHashObj.hash;
      currentHashes.set(entry.id, currentHash);

      // Check for drift
      if (mapManager.hasDrift(entry.id, currentHash)) {
        drifts.push({
          id: entry.id,
          symbolName: entry.codeRef.symbolName,
          codeFilePath: entry.codeRef.filePath,
          docFilePath: entry.docRef.filePath,
          docLine: entry.docRef.startLine,
          oldHash: entry.codeSignatureHash,
          newHash: currentHash,
          oldSignature: undefined, // Could be retrieved from map if needed
          newSignature: currentSignature.signatureText,
        });
      }
    } catch (error) {
      logger.error(
        `Error analyzing ${entry.codeRef.filePath}#${entry.codeRef.symbolName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

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
