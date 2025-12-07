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
import { FileMutex } from './utils/mutex';

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

  // Determine map path and project base
  const mapPath = options.map ? resolve(options.map) : getMapPath(config!);
  const projectBase = config ? (config.baseDir || process.cwd()) : dirname(mapPath);

  const fileMutex = new FileMutex();
  const injector = new ContentInjector();
  let successCount = 0;
  let failCount = 0;

  // Phase 1: Generation & Application (Parallel with Mutex)
  const s = spinner();
  s.start(`Processing ${drifts.length} items...`);
  
  const processTask = async (drift: DriftInfo): Promise<FixDetail> => {
      const { entry, currentSignature, oldSignature } = drift;
      const docFilePath = resolve(projectBase, entry.docRef.filePath);

      try {
          let newContent: string;

          // 1. Generate Content (Slow, Parallel)
          if (useAI && aiAgent) {
              try {
                  // Read context safely (read-only)
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

          // 2. Inject Content (Fast, Sequential per file via Mutex)
          return await fileMutex.run(docFilePath, async () => {
              try {
                  const writeToFile = !options.dryRun;
                  const result = injector.injectIntoFile(docFilePath, entry.id, newContent, writeToFile);

                  if (result.success) {
                      if (!options.dryRun) {
                          const newHash = currentSignature.hash!;
                          mapManager.updateEntry(entry.id, {
                                                        codeSignatureHash: newHash,
                                                        codeSignatureText: currentSignature.signatureText,
                                                    });
                                                    
                                                    // Save map immediately to keep it in sync with the file system
                                                    // This prevents inconsistent state if the process is interrupted (Ctrl+C)
                                                    mapManager.save();
                                                }
                                                    
                                                // Using a simple counter isn't thread-safe for reading/writing if we depended on the value,
                              
                      // but for incrementing it's fine in JS event loop (single threaded execution of callbacks).
                      successCount++;
                      
                      return {
                          id: entry.id,
                          symbolName: entry.codeRef.symbolName,
                          codeFilePath: entry.codeRef.filePath,
                          docFilePath: entry.docRef.filePath,
                          success: true,
                          newContent: newContent,
                      };
                  } else {
                      failCount++;
                      logger.error(`Failed to inject ${entry.codeRef.symbolName}: ${result.error}`);
                      return {
                          id: entry.id,
                          symbolName: entry.codeRef.symbolName,
                          codeFilePath: entry.codeRef.filePath,
                          docFilePath: entry.docRef.filePath,
                          success: false,
                          error: result.error,
                      };
                  }
              } catch (e) {
                  failCount++;
                  const msg = e instanceof Error ? e.message : String(e);
                  logger.error(`Error writing ${entry.codeRef.symbolName}: ${msg}`);
                  return {
                      id: entry.id,
                      symbolName: entry.codeRef.symbolName,
                      codeFilePath: entry.codeRef.filePath,
                      docFilePath: entry.docRef.filePath,
                      success: false,
                      error: msg,
                  };
              }
          });

      } catch (error) {
          failCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          return {
              id: entry.id,
              symbolName: entry.codeRef.symbolName,
              codeFilePath: entry.codeRef.filePath,
              docFilePath: entry.docRef.filePath,
              success: false,
              error: errorMsg,
          };
      }
  };

  const fixes = await pMap(drifts, processTask, 5, (completed, total) => {
      s.message(`Processing items... (${completed}/${total})`);
  });
  
  s.stop(`Processed ${drifts.length} items`);

  // Save updated map (final consistency)
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