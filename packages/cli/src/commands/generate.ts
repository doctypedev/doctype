/**
 * CLI command: generate
 *
 * Generates documentation content using AI.
 * This is effectively a semantic alias for the 'fix' command but focused on content generation.
 */

import { DoctypeMapManager } from '../../../content/map-manager';
import { AstAnalyzer, extractAnchors, DoctypeAnchor, CodeSignature } from '@doctypedev/core';
import { Logger } from '../utils/logger';
import { GenerateResult, GenerateOptions } from '../types';
import { detectDrift } from '../services/drift-detector';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  loadConfig,
  getMapPath,
  ConfigNotFoundError,
  InvalidConfigError,
} from '../services/config-loader';
import { executeFixes } from '../orchestrators/fix-orchestrator';

/**
 * Execute the generate command
 */
export async function generateCommand(options: GenerateOptions): Promise<GenerateResult> {
  const logger = new Logger(options.verbose);

  logger.header('✨ Doctype Generate - AI Documentation Generation');

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

  // Detect drift (which includes missing content for new entries)
  const analyzer = new AstAnalyzer();
  const { drifts: detectedDrifts, missing } = detectDrift(mapManager, analyzer, {
    logger,
    basePath: codeRoot,
  });

  if (missing.length > 0) {
    logger.warn(`Skipping ${missing.length} missing symbols/files (cannot generate documentation). Run 'check' command for details.`);
  }

  // Second pass: Scan for "TODO" placeholders even if hashes match
  // This enables "doctype generate" to work after "doctype init"
  const driftedIds = new Set(detectedDrifts.map(d => d.entry.id));
  const projectBase = config ? (config.baseDir || process.cwd()) : dirname(mapPath);

  // We need to re-analyze files to get signatures if we find placeholders
  // Optimization: Only analyze if we find a placeholder

  for (const entry of entries) {
    if (driftedIds.has(entry.id)) {
      continue;
    }

    const docFilePath = resolve(projectBase, entry.docRef.filePath);
    if (!existsSync(docFilePath)) {
      continue;
    }

    try {
      const docContent = readFileSync(docFilePath, 'utf-8');
      const extractionResult = extractAnchors(docFilePath, docContent);
      const anchor = extractionResult.anchors.find((a: DoctypeAnchor) => a.id === entry.id);

      if (anchor && anchor.content.includes('TODO: Add documentation for this symbol')) {
        logger.debug(`Found placeholder for ${entry.codeRef.symbolName}, marking for generation`);

        // We need the current signature to generate content
        const codeFilePath = resolve(projectBase, entry.codeRef.filePath);
        if (existsSync(codeFilePath)) {
          const signatures = analyzer.analyzeFile(codeFilePath);
          const currentSignature = signatures.find((s: CodeSignature) => s.symbolName === entry.codeRef.symbolName);

          if (currentSignature) {
            detectedDrifts.push({
              entry,
              currentSignature,
              currentHash: currentSignature.hash!,
              oldHash: entry.codeSignatureHash,
              // No old signature needed as context since it's a new generation
            });
            driftedIds.add(entry.id);
          }
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  if (detectedDrifts.length === 0) {
    logger.success('All documentation is up to date! Nothing to generate.');
    return {
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixes: [],
      success: true,
    };
  }

  logger.info(`Found ${detectedDrifts.length} ${detectedDrifts.length === 1 ? 'entry' : 'entries'} needing generation/update`);

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
    'Generated/Updated'
  );
}