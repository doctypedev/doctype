#!/usr/bin/env ts-node
/**
 * Initialize hash values in doctype-map.json
 *
 * This script analyzes all code files referenced in the map
 * and generates/updates their signature hashes.
 */

import { ASTAnalyzer } from '../src/core/ast-analyzer';
import { SignatureHasher } from '../src/core/signature-hasher';
import { DoctypeMapManager } from '../src/content/map-manager';
import { Logger } from '../src/cli/logger';

const logger = new Logger(true);

async function initHashes(mapPath: string = './doctype-map.json'): Promise<void> {
  logger.header('🔧 Initialize Doctype Hashes');

  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();
  const mapManager = new DoctypeMapManager(mapPath);

  const entries = mapManager.getEntries();

  if (entries.length === 0) {
    logger.warn('No entries found in doctype-map.json');
    return;
  }

  logger.info(`Processing ${entries.length} entries...`);
  logger.newline();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    logger.debug(`Checking ${entry.codeRef.filePath}#${entry.codeRef.symbolName}`);

    // Skip if hash already exists and not empty
    if (entry.codeSignatureHash && entry.codeSignatureHash !== '') {
      logger.debug(`  Hash already exists: ${Logger.hash(entry.codeSignatureHash)}`);
      skipped++;
      continue;
    }

    try {
      // Analyze the code file
      const signatures = await analyzer.analyzeFile(entry.codeRef.filePath);
      const signature = signatures.find((sig) => sig.symbolName === entry.codeRef.symbolName);

      if (!signature) {
        logger.error(`  Symbol ${Logger.symbol(entry.codeRef.symbolName)} not found in ${Logger.path(entry.codeRef.filePath)}`);
        errors++;
        continue;
      }

      // Generate hash
      const hashResult = hasher.hash(signature);
      const hash = hashResult.hash;

      // Update entry
      mapManager.updateEntry(entry.id, { codeSignatureHash: hash });

      logger.success(`  Generated hash for ${Logger.symbol(entry.codeRef.symbolName)}: ${Logger.hash(hash)}`);
      updated++;
    } catch (error) {
      logger.error(
        `  Error processing ${entry.codeRef.symbolName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      errors++;
    }
  }

  // Save updated map
  if (updated > 0) {
    logger.debug('Saving updated map...');
    mapManager.save();
  }

  // Summary
  logger.newline();
  logger.divider();

  if (updated > 0) {
    logger.success(`Updated ${updated} ${updated === 1 ? 'entry' : 'entries'}`);
  }

  if (skipped > 0) {
    logger.info(`Skipped ${skipped} ${skipped === 1 ? 'entry' : 'entries'} (hash already exists)`);
  }

  if (errors > 0) {
    logger.error(`Failed ${errors} ${errors === 1 ? 'entry' : 'entries'}`);
    process.exit(1);
  }

  logger.divider();
}

// Run if called directly
if (require.main === module) {
  const mapPath = process.argv[2] || './doctype-map.json';
  initHashes(mapPath).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { initHashes };
