/**
 * CLI command: fix
 *
 * Fixes documentation drift by updating Markdown files
 * Note: Phase 3 implements manual content updates
 * Phase 4 will add AI-generated content
 */

import { DoctypeMapManager } from '../content/map-manager';
import { ContentInjector } from '../content/content-injector';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { Logger } from './logger';
import { FixResult, FixOptions, FixDetail } from './types';
import { detectDrift } from './drift-detector';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Execute the fix command
 */
export async function fixCommand(options: FixOptions): Promise<FixResult> {
  const logger = new Logger(options.verbose);
  const mapPath = resolve(options.map || './doctype-map.json');

  logger.header('🔧 Doctype Fix - Update Documentation');

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

  logger.debug(`Loading map from: ${mapPath}`);

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

  // Detect drift using centralized logic
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();
  const detectedDrifts = detectDrift(mapManager, analyzer, hasher, { logger });

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

  // Fix each drifted entry
  const injector = new ContentInjector();
  const fixes: FixDetail[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const drift of detectedDrifts) {
    const { entry, currentSignature } = drift;

    logger.newline();
    logger.info(`${Logger.symbol(entry.codeRef.symbolName)} - ${Logger.path(entry.codeRef.filePath)}`);
    logger.info(`  Documentation: ${Logger.path(entry.docRef.filePath)}:${entry.docRef.startLine}`);

    try {

      // Phase 3: Simple placeholder content
      // Phase 4: This will be replaced with AI-generated content
      const newContent = generatePlaceholderContent(entry.codeRef.symbolName, currentSignature.signatureText);

      logger.debug(`Generated placeholder content (${newContent.length} chars)`);

      // Resolve doc file path to ensure it's absolute
      const docFilePath = resolve(entry.docRef.filePath);

      // Inject the content
      const writeToFile = !options.dryRun;
      const result = injector.injectIntoFile(docFilePath, entry.id, newContent, writeToFile);

      if (result.success) {
        successCount++;
        logger.success(`Updated documentation (${result.linesChanged} lines changed)`);

        // Update the map with new hash
        if (!options.dryRun) {
          const newHash = hasher.hash(currentSignature).hash;
          mapManager.updateEntry(entry.id, {
            codeSignatureHash: newHash,
            originalMarkdownContent: newContent,
          });
        }

        fixes.push({
          id: entry.id,
          symbolName: entry.codeRef.symbolName,
          codeFilePath: entry.codeRef.filePath,
          docFilePath: entry.docRef.filePath,
          success: true,
          newContent,
        });
      } else {
        failCount++;
        logger.error(`Failed to update: ${result.error}`);

        fixes.push({
          id: entry.id,
          symbolName: entry.codeRef.symbolName,
          codeFilePath: entry.codeRef.filePath,
          docFilePath: entry.docRef.filePath,
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      failCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Error: ${errorMsg}`);

      fixes.push({
        id: entry.id,
        symbolName: entry.codeRef.symbolName,
        codeFilePath: entry.codeRef.filePath,
        docFilePath: entry.docRef.filePath,
        success: false,
        error: errorMsg,
      });
    }
  }

  // Save updated map
  if (!options.dryRun && successCount > 0) {
    logger.debug('Saving updated doctype-map.json');
    mapManager.save();
  }

  // Summary
  logger.newline();
  logger.divider();

  if (successCount > 0) {
    logger.success(`Successfully updated ${successCount} ${successCount === 1 ? 'entry' : 'entries'}`);
  }

  if (failCount > 0) {
    logger.error(`Failed to update ${failCount} ${failCount === 1 ? 'entry' : 'entries'}`);
  }

  if (options.dryRun) {
    logger.info('Dry run complete - no files were modified');
  } else if (options.autoCommit && successCount > 0) {
    logger.info('Auto-commit is not yet implemented (coming in Phase 4)');
  }

  logger.divider();

  return {
    totalFixes: fixes.length,
    successfulFixes: successCount,
    failedFixes: failCount,
    fixes,
    success: failCount === 0,
  };
}

/**
 * Generate placeholder content for documentation
 * Phase 4: This will be replaced with AI-generated content
 */
function generatePlaceholderContent(symbolName: string, signature: string): string {
  return `**${symbolName}** - Documentation needs update

Current signature:
\`\`\`typescript
${signature}
\`\`\`

*This content was automatically generated by Doctype. The code signature has changed and this documentation needs to be updated manually.*

*Phase 4 (AI Integration) will automatically generate proper documentation based on code changes.*`;
}
