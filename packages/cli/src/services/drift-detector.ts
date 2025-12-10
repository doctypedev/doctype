/**
 * Drift detection utility
 *
 * Centralizes the logic for detecting documentation drift
 * by comparing current code signatures with saved hashes
 */

import { DoctypeMapManager } from '../../../content';
import { CodeSignature, DoctypeMapEntry, AstAnalyzer, discoverFiles } from '@sintesi/core';
import { Logger } from '../utils/logger';
import { existsSync, readFileSync } from 'fs';
import { resolve, relative, sep } from 'path';

/**
 * Information about a detected drift
 */
export interface DriftInfo {
  /** The map entry that has drifted */
  entry: DoctypeMapEntry;
  /** The old signature (reconstructed from signature text, if available) */
  oldSignature?: CodeSignature;
  /** The current signature from the code */
  currentSignature: CodeSignature;
  /** The current hash of the signature */
  currentHash: string;
  /** The old hash from the map */
  oldHash: string;
}

/**
 * Information about a missing symbol
 */
export interface MissingSymbolInfo {
  entry: DoctypeMapEntry;
  reason: 'file_not_found' | 'symbol_not_found';
  codeFilePath: string;
}

/**
 * Information about an untracked symbol
 */
export interface UntrackedSymbolInfo {
  symbolName: string;
  filePath: string;
  signature: CodeSignature;
}

/**
 * Result of drift detection
 */
export interface DriftResult {
  drifts: DriftInfo[];
  missing: MissingSymbolInfo[];
  untracked: UntrackedSymbolInfo[];
}

/**
 * Options for drift detection
 */
export interface DriftDetectionOptions {
  /** Base path for resolving relative paths (defaults to process.cwd()) */
  basePath?: string;
  /** Logger for debug output (optional) */
  logger?: Logger;
  /** Whether to scan for untracked symbols (defaults to false) */
  discoverUntracked?: boolean;
  /** Directory to scan for untracked symbols (required if discoverUntracked is true) */
  projectRoot?: string;
}

/**
 * Verify if a symbol is truly exported by checking source content
 * This is a workaround for AST analyzers that might be too aggressive (marking locals as exported)
 */
function verifyExported(content: string, symbolName: string): boolean {
  // 1. Direct export: export const/let/var/function/class/interface/type/enum name
  const directExport = new RegExp(
    `export\\s+(?:declare\\s+)?(?:async\\s+)?(?:const|let|var|function|class|interface|type|enum)\\s+${symbolName}\\b`
  );
  if (directExport.test(content)) return true;

  // 2. Named export list: export { name } or export { other as name }
  // We check if the symbol name appears in an export block
  const exportBlocks = content.match(/export\s*\{[^}]+\}/g) || [];
  for (const block of exportBlocks) {
    if (new RegExp(`\\b${symbolName}\\b`).test(block)) return true;
  }

  // 3. Default export: export default name
  // Note: Oxc might report "default" as symbol name, or the actual name
  if (symbolName === 'default') {
    return /export\s+default\b/.test(content);
  }

  // Check for "export default class/function Name"
  if (new RegExp(`export\\s+default\\s+(?:class|function)\\s+${symbolName}\\b`).test(content)) {
    return true;
  }

  return false;
}

/**
 * Detect drift across all entries in the doctype map
 *
 * This function centralizes the drift detection logic used by both
 * the check and fix commands to avoid code duplication.
 *
 * @param mapManager - The doctype map manager
 * @param analyzer - AST analyzer instance
 * @param options - Detection options
 * @returns Object containing drifts and missing symbols
 */
export function detectDrift(
  mapManager: DoctypeMapManager,
  analyzer: InstanceType<typeof AstAnalyzer>,
  options: DriftDetectionOptions = {}
): DriftResult {
  const { basePath = process.cwd(), logger, discoverUntracked = false, projectRoot } = options;
  const entries = mapManager.getEntries();
  const drifts: DriftInfo[] = [];
  const missing: MissingSymbolInfo[] = [];
  const untracked: UntrackedSymbolInfo[] = [];

  // Set of tracked symbols: "filePath#symbolName"
  const tracked = new Set<string>();

  // Use a local cache for file analysis to avoid re-parsing the same file multiple times
  const analysisCache = new Map<string, CodeSignature[]>();
  const contentCache = new Map<string, string>();

  const getAnalysis = (filePath: string): CodeSignature[] => {
    if (!analysisCache.has(filePath)) {
      // Analyze the file and cache the result
      const signatures = analyzer.analyzeFile(filePath);
      analysisCache.set(filePath, signatures);
    }
    return analysisCache.get(filePath)!;
  };

  const getContent = (filePath: string): string => {
    if (!contentCache.has(filePath)) {
      if (existsSync(filePath)) {
        contentCache.set(filePath, readFileSync(filePath, 'utf-8'));
      } else {
        contentCache.set(filePath, '');
      }
    }
    return contentCache.get(filePath)!;
  };

  for (const entry of entries) {
    // Resolve code file path relative to base path
    const codeFilePath = resolve(basePath, entry.codeRef.filePath);
    // Normalize tracked key
    tracked.add(`${entry.codeRef.filePath}#${entry.codeRef.symbolName}`);

    logger?.debug(`Analyzing ${codeFilePath}#${entry.codeRef.symbolName}`);

    try {
      // Check if code file exists
      if (!existsSync(codeFilePath)) {
        logger?.warn(
          `Code file not found: ${Logger.path(codeFilePath)} (${Logger.symbol(entry.codeRef.symbolName)})`
        );
        missing.push({
          entry,
          reason: 'file_not_found',
          codeFilePath
        });
        continue;
      }

      // Analyze the code file using cache
      const signatures = getAnalysis(codeFilePath);
      const currentSignature = signatures.find((sig: CodeSignature) => sig.symbolName === entry.codeRef.symbolName);

      if (!currentSignature) {
        logger?.warn(
          `Symbol ${Logger.symbol(entry.codeRef.symbolName)} not found in ${Logger.path(codeFilePath)}`
        );
        missing.push({
          entry,
          reason: 'symbol_not_found',
          codeFilePath
        });
        continue;
      }

      // START WORKAROUND: Verify it is truly exported (filter out locals that AST analyzer caught)
      const content = getContent(codeFilePath);
      if (!verifyExported(content, entry.codeRef.symbolName)) {
        logger?.warn(
          `Symbol ${Logger.symbol(entry.codeRef.symbolName)} is not exported in ${Logger.path(codeFilePath)} (removing)`
        );
        missing.push({
          entry,
          reason: 'symbol_not_found', // Treat as not found to trigger prune
          codeFilePath
        });
        continue;
      }
      // END WORKAROUND

      // Get current hash from signature (computed by Rust analyzer)
      const currentHash = currentSignature.hash!;
      if (!currentHash) {
        logger?.warn(`No hash computed for ${Logger.symbol(entry.codeRef.symbolName)}`);
        continue;
      }

      // Check for drift
      if (mapManager.hasDrift(entry.id, currentHash)) {
        // Reconstruct old signature from stored text (if available)
        let oldSignature: CodeSignature | undefined;
        if (entry.codeSignatureText) {
          oldSignature = {
            symbolName: entry.codeRef.symbolName,
            symbolType: currentSignature.symbolType, // Assume same type
            signatureText: entry.codeSignatureText,
            isExported: currentSignature.isExported, // Assume same export status
            hash: undefined,
          };
        }

        drifts.push({
          entry,
          oldSignature,
          currentSignature,
          currentHash,
          oldHash: entry.codeSignatureHash,
        });

        logger?.debug(`Drift detected: ${entry.codeRef.symbolName} (${Logger.hash(entry.codeSignatureHash)} → ${Logger.hash(currentHash)})`);
      }
    } catch (error) {
      logger?.error(
        `Error analyzing ${codeFilePath}#${entry.codeRef.symbolName}: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Detect untracked symbols if requested
  if (discoverUntracked && projectRoot) {
    const absProjectRoot = resolve(basePath, projectRoot);
    logger?.debug(`Scanning for untracked symbols in ${absProjectRoot}`);

    try {
      const discoveryResult = discoverFiles(absProjectRoot, {
        respectGitignore: true,
        includeHidden: false,
        maxDepth: undefined,
      });

      for (const file of discoveryResult.sourceFiles) {
        try {
          // Use cached analysis
          const signatures = getAnalysis(file);
          const relativePath = relative(basePath, file).split(sep).join('/');

          for (const sig of signatures) {
            if (sig.isExported) {
              // START WORKAROUND
              // Verify if it is strictly exported using regex on content
              const content = getContent(file);
              if (!verifyExported(content, sig.symbolName)) {
                // logger?.debug(`Skipping ${sig.symbolName} in ${file} (marked exported but failed verification)`);
                continue;
              }
              // END WORKAROUND

              const key = `${relativePath}#${sig.symbolName}`;
              if (!tracked.has(key)) {
                untracked.push({
                  symbolName: sig.symbolName,
                  filePath: relativePath,
                  signature: sig
                });
              }
            }
          }
        } catch (e) {
          // Ignore analysis errors for discovery
        }
      }
    } catch (e) {
      logger?.warn(`Failed to discover untracked files: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { drifts, missing, untracked };
}
