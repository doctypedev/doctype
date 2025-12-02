/**
 * CLI command: fix
 *
 * Fixes documentation drift by updating Markdown files with AI-generated content
 *
 * Manual content updates (placeholder)
 * AI-powered documentation generation (OpenAI, Gemini)
 */

import { DoctypeMapManager } from '../content/map-manager';
import { ContentInjector } from '../content/content-injector';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { Logger } from './logger';
import { FixResult, FixOptions, FixDetail } from './types';
import { detectDrift } from './drift-detector';
import { createAgentFromEnv, AIAgent } from '../ai';
import { GitHelper } from './git-helper';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  loadConfig,
  getMapPath,
  ConfigNotFoundError,
  InvalidConfigError,
} from './config-loader';

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
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();
  const detectedDrifts = await detectDrift(mapManager, analyzer, hasher, {
    logger,
    basePath: codeRoot,
  });

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

  // Initialize AI Agent if API key is available
  let aiAgent: AIAgent | null = null;
  let useAI = false;

  if (!options.noAI) {
    try {
      aiAgent = createAgentFromEnv({ debug: options.verbose });
      const isConnected = await aiAgent.validateConnection();

      if (isConnected) {
        useAI = true;
        logger.info(`Using AI provider: ${aiAgent.getProvider()}`);
      } else {
        logger.warn('AI provider connection failed, falling back to placeholder content');
      }
    } catch (error) {
      if (options.verbose) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.debug(`AI initialization failed: ${errorMsg}`);
      }
      logger.info('No AI API key found, using placeholder content');
    }
  } else {
    logger.info('AI generation disabled (--no-ai flag)');
  }

  // Fix each drifted entry
  const injector = new ContentInjector();
  const fixes: FixDetail[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const drift of detectedDrifts) {
    const { entry, currentSignature, oldSignature } = drift;

    logger.newline();
    logger.info(`${Logger.symbol(entry.codeRef.symbolName)} - ${Logger.path(entry.codeRef.filePath)}`);
    logger.info(`  Documentation: ${Logger.path(entry.docRef.filePath)}:${entry.docRef.startLine}`);

    try {
      let newContent: string;

      // Use AI Agent if available
      if (useAI && aiAgent) {
        logger.debug('Generating AI-powered documentation...');

        try {
          // If we have old signature, use it; otherwise AI will infer from old docs
          if (oldSignature) {
            newContent = await aiAgent.generateFromDrift(
              entry.codeRef.symbolName,
              oldSignature,
              currentSignature,
              entry.originalMarkdownContent || '',
              entry.codeRef.filePath
            );
          } else {
            // No old signature available - generate based on current signature only
            logger.debug('No old signature available, generating from current signature');
            newContent = await aiAgent.generateInitial(
              entry.codeRef.symbolName,
              currentSignature,
              {
                includeExamples: true,
                style: 'detailed',
              }
            );
          }

          logger.debug(`AI generated content (${newContent.length} chars)`);
        } catch (aiError) {
          const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
          logger.warn(`AI generation failed: ${errorMsg}`);
          logger.info('Falling back to placeholder content');

          newContent = generatePlaceholderContent(entry.codeRef.symbolName, currentSignature.signatureText);
        }
      } else {
        // Simple placeholder content
        newContent = generatePlaceholderContent(entry.codeRef.symbolName, currentSignature.signatureText);
        logger.debug(`Generated placeholder content (${newContent.length} chars)`);
      }

      // Resolve doc file path to ensure it's absolute
      // Doc paths are relative to project root (where config lives)
      const projectBase = config ? (config.baseDir || process.cwd()) : dirname(mapPath);
      const docFilePath = resolve(projectBase, entry.docRef.filePath);

      // Inject the content
      const writeToFile = !options.dryRun;
      const result = injector.injectIntoFile(docFilePath, entry.id, newContent, writeToFile);

      if (result.success) {
        successCount++;
        logger.success(`Updated documentation (${result.linesChanged} lines changed)`);

        // Update the map with new hash and signature text
        if (!options.dryRun) {
          const newHash = hasher.hash(currentSignature).hash;
          mapManager.updateEntry(entry.id, {
            codeSignatureHash: newHash,
            codeSignatureText: currentSignature.signatureText, // Store for future AI context
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
    // Auto-commit functionality
    logger.newline();
    logger.info('Auto-committing changes...');

    const gitHelper = new GitHelper(logger);

    // Collect all modified files
    const modifiedFiles = new Set<string>();
    for (const fix of fixes) {
      if (fix.success) {
        modifiedFiles.add(fix.docFilePath);
      }
    }

    // Add doctype-map.json
    modifiedFiles.add(mapPath);

    // Get symbol names for commit message
    const symbolNames = fixes
      .filter(f => f.success)
      .map(f => f.symbolName);

    // Commit changes
    const commitResult = gitHelper.autoCommit(
      Array.from(modifiedFiles),
      symbolNames,
      false // Don't push by default
    );

    if (commitResult.success) {
      logger.success('Changes committed successfully');
      if (commitResult.output) {
        logger.info(`Commit message: "${commitResult.output}"`);
      }
    } else {
      logger.error(`Auto-commit failed: ${commitResult.error}`);
      logger.info('You can manually commit the changes');
    }
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
