/**
 * Drift detection utility
 *
 * Centralizes the logic for detecting documentation drift
 * by comparing current code signatures with saved hashes
 */

import { DoctypeMapManager } from '../../../content';
import { CodeSignature, DoctypeMapEntry, AstAnalyzer } from '@doctypedev/core';
import { Logger } from '../utils/logger';
import { existsSync } from 'fs';
import { resolve } from 'path';

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
 * Result of drift detection
 */
export interface DriftResult {
  drifts: DriftInfo[];
  missing: MissingSymbolInfo[];
}

/**
 * Options for drift detection
 */
export interface DriftDetectionOptions {
  /** Base path for resolving relative paths (defaults to process.cwd()) */
  basePath?: string;
  /** Logger for debug output (optional) */
  logger?: Logger;
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
  const { basePath = process.cwd(), logger } = options;
  const entries = mapManager.getEntries();
  const drifts: DriftInfo[] = [];
  const missing: MissingSymbolInfo[] = [];

  for (const entry of entries) {
    // Resolve code file path relative to base path
    const codeFilePath = resolve(basePath, entry.codeRef.filePath);

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

      // Analyze the code file
      const signatures = analyzer.analyzeFile(codeFilePath);
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

  return { drifts, missing };
}
