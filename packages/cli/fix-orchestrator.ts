/**
 * Fix Orchestrator - Core business logic for applying fixes/generations
 *
 * Centralizes the logic for:
 * - Initializing AI Agent
 * - looping through drifts
 * - Generating content (AI or placeholder)
 * - Injecting content
 * - Updating the map
 * - Auto-committing
 */

import { DoctypeMapManager } from '../content/map-manager';
import { ContentInjector } from '../content/content-injector';
import { extractAnchors, DoctypeAnchor } from '@doctypedev/core';
import { Logger } from './logger';
import { FixResult, FixOptions, FixDetail } from './types';
import { DriftInfo } from './drift-detector';
import { createAgentFromEnv, AIAgent } from '../ai';
import { GitHelper } from './git-helper';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { getMapPath } from './config-loader';
import { DoctypeConfig } from './types';
import { retry } from './retry';
import { spinner } from '@clack/prompts';

/**
 * Helper function to limit concurrency
 */
async function pMap<T, R>(
    items: T[],
    mapper: (item: T) => Promise<R>,
    concurrency: number,
    onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;
    let completed = 0;
    const total = items.length;

    const execThread = async (): Promise<void> => {
        while (index < items.length) {
            const curIndex = index++;
            results[curIndex] = await mapper(items[curIndex]);
            completed++;
            if (onProgress) {
                onProgress(completed, total);
            }
        }
    };
    const threads = [];
    for (let i = 0; i < concurrency; i++) {
        threads.push(execThread());
    }
    await Promise.all(threads);
    return results;
}

/**
 * Result of a generation task
 */
interface GenerationResult {
    drift: DriftInfo;
    content: string;
    success: boolean;
    error?: string;
}

/**
 * Execute a list of fixes (or generations)
 *
 * @param drifts - List of drifts to fix
 * @param mapManager - Map manager instance
 * @param options - CLI options
 * @param config - Doctype configuration
 * @param logger - Logger instance
 * @param actionLabel - Label for the action (e.g. "Updated", "Generated")
 */
export async function executeFixes(
  drifts: DriftInfo[],
  mapManager: DoctypeMapManager,
  options: FixOptions,
  config: DoctypeConfig | undefined,
  logger: Logger,
  actionLabel: string = 'Updated'
): Promise<FixResult> {
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

  const fixes: FixDetail[] = [];
  let successCount = 0;
  let failCount = 0;

  // Determine map path and project base
  const mapPath = options.map ? resolve(options.map) : getMapPath(config!);
  const projectBase = config ? (config.baseDir || process.cwd()) : dirname(mapPath);

  // Phase 1: Generation (Parallel)
  const s = spinner();
  s.start(`Processing ${drifts.length} items...`);
  
  const generateTask = async (drift: DriftInfo): Promise<GenerationResult> => {
      const { entry, currentSignature, oldSignature } = drift;
      
      // Log start (debounced/limited by pMap, but still good to know)
      // logger.debug(`Processing ${entry.codeRef.symbolName}...`);

      try {
          let newContent: string;

          if (useAI && aiAgent) {
              try {
                  // Read current markdown content from file for AI context
                  // Note: Reading file here is safe as we are just reading for context.
                  // However, for high concurrency, reading same file multiple times might be redundant but safe.
                  const docFilePath = resolve(projectBase, entry.docRef.filePath);
                  let currentMarkdownContent = '';

                  if (existsSync(docFilePath)) {
                      const docContent = readFileSync(docFilePath, 'utf-8');
                      const extractionResult = extractAnchors(docFilePath, docContent);
                      const anchor = extractionResult.anchors.find((a: DoctypeAnchor) => a.id === entry.id);
                      if (anchor) {
                          currentMarkdownContent = anchor.content;
                      }
                  }

                  newContent = await retry(async () => {
                      if (oldSignature) {
                          return await aiAgent!.generateFromDrift(
                              entry.codeRef.symbolName,
                              oldSignature,
                              currentSignature,
                              currentMarkdownContent,
                              entry.codeRef.filePath
                          );
                      } else {
                          return await aiAgent!.generateInitial(
                              entry.codeRef.symbolName,
                              currentSignature,
                              {
                                  includeExamples: true,
                                  style: 'detailed',
                              }
                          );
                      }
                  }, {
                      retries: 3,
                      onRetry: (err, attempt) => {
                          logger.debug(`Retry ${attempt}/3 for ${entry.codeRef.symbolName}: ${err.message}`);
                      }
                  });
              } catch (aiError) {
                  const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
                  logger.error(`AI generation failed for ${entry.codeRef.symbolName} after retries: ${errorMsg}`);
                  newContent = generatePlaceholderContent(entry.codeRef.symbolName, currentSignature.signatureText);
              }
          } else {
              newContent = generatePlaceholderContent(entry.codeRef.symbolName, currentSignature.signatureText);
          }

          return { drift, content: newContent, success: true };
      } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { drift, content: '', success: false, error: errorMsg };
      }
  };

  const results = await pMap(drifts, generateTask, 5, (completed, total) => {
      s.message(`Processing items... (${completed}/${total})`);
  }); // Concurrency limit 5
  
  s.stop(`Processed ${drifts.length} items`);

  // Phase 2: Application (Sequential per file)
  const injector = new ContentInjector();
  
  // Group results by doc file path
  const resultsByFile = new Map<string, GenerationResult[]>();
  for (const res of results) {
      const docPath = resolve(projectBase, res.drift.entry.docRef.filePath);
      if (!resultsByFile.has(docPath)) {
          resultsByFile.set(docPath, []);
      }
      resultsByFile.get(docPath)!.push(res);
  }

  for (const [docPath, fileResults] of resultsByFile.entries()) {
      // logger.debug(`Updating ${fileResults.length} entries in ${docPath}`);
      
      // We process updates for a single file sequentially to avoid race conditions
      // ContentInjector reads file, modifies, returns result. 
      // Ideally we should read once, apply all patches, write once.
      // But ContentInjector.injectIntoFile is designed for single atomic operation (Read-Modify-Write).
      // So calling it sequentially is safe but inefficient (multiple I/O).
      // However, it IS safe because it writes sync.
      
      for (const res of fileResults) {
          const { drift, content, success, error } = res;
          const { entry, currentSignature } = drift;

          if (!success) {
              failCount++;
              logger.error(`Failed to generate for ${entry.codeRef.symbolName}: ${error}`);
              fixes.push({
                  id: entry.id,
                  symbolName: entry.codeRef.symbolName,
                  codeFilePath: entry.codeRef.filePath,
                  docFilePath: entry.docRef.filePath,
                  success: false,
                  error: error,
              });
              continue;
          }

          try {
              const writeToFile = !options.dryRun;
              // This is synchronous I/O, so it blocks. Safe for sequential loop.
              const result = injector.injectIntoFile(docPath, entry.id, content, writeToFile);

              if (result.success) {
                  successCount++;
                  // Only log if verbose or strict need
                  logger.success(`${actionLabel} ${entry.codeRef.symbolName} (${result.linesChanged} lines)`);

                  if (!options.dryRun) {
                      const newHash = currentSignature.hash!;
                      mapManager.updateEntry(entry.id, {
                          codeSignatureHash: newHash,
                          codeSignatureText: currentSignature.signatureText,
                      });
                  }

                  fixes.push({
                      id: entry.id,
                      symbolName: entry.codeRef.symbolName,
                      codeFilePath: entry.codeRef.filePath,
                      docFilePath: entry.docRef.filePath,
                      success: true,
                      newContent: content,
                  });
              } else {
                  failCount++;
                  logger.error(`Failed to inject ${entry.codeRef.symbolName}: ${result.error}`);
                  fixes.push({
                      id: entry.id,
                      symbolName: entry.codeRef.symbolName,
                      codeFilePath: entry.codeRef.filePath,
                      docFilePath: entry.docRef.filePath,
                      success: false,
                      error: result.error,
                  });
              }
          } catch (e) {
              failCount++;
              const msg = e instanceof Error ? e.message : String(e);
              logger.error(`Error writing ${entry.codeRef.symbolName}: ${msg}`);
              fixes.push({
                  id: entry.id,
                  symbolName: entry.codeRef.symbolName,
                  codeFilePath: entry.codeRef.filePath,
                  docFilePath: entry.docRef.filePath,
                  success: false,
                  error: msg,
              });
          }
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
    logger.success(`Successfully ${actionLabel.toLowerCase()} ${successCount} ${successCount === 1 ? 'entry' : 'entries'}`);
  }

  if (failCount > 0) {
    logger.error(`Failed to ${actionLabel.toLowerCase()} ${failCount} ${failCount === 1 ? 'entry' : 'entries'}`);
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
 */
function generatePlaceholderContent(symbolName: string, signature: string): string {
  return `**${symbolName}** - Documentation needs generation\n\n` +
         `Current signature:\n` +
         `\`\`\`typescript\n` +
         `${signature}\n` +
         `\`\`\`\n\n` +
         `*This content is a placeholder. Run 'doctype generate' with a valid AI API key to generate full documentation.*`;
}