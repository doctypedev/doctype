/**
 * Drift detection utility
 *
 * Centralizes the logic for detecting documentation drift
 * by comparing current code signatures with saved hashes
 */

import { DoctypeMapManager } from '../content';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { CodeSignature, DoctypeMapEntry } from '../core/types';
import { Logger } from './logger';
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
 * @param hasher - Signature hasher instance
 * @param options - Detection options
 * @returns Array of drift information for entries that have drifted
 */
export async function detectDrift(
  mapManager: DoctypeMapManager,
  analyzer: ASTAnalyzer,
  hasher: SignatureHasher,
  options: DriftDetectionOptions = {}
): Promise<DriftInfo[]> {
  const { basePath = process.cwd(), logger } = options;
  const entries = mapManager.getEntries();
  const drifts: DriftInfo[] = [];

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
        continue;
      }

      // Analyze the code file
      const signatures = await analyzer.analyzeFile(codeFilePath);
      const currentSignature = signatures.find((sig) => sig.symbolName === entry.codeRef.symbolName);

      if (!currentSignature) {
        logger?.warn(
          `Symbol ${Logger.symbol(entry.codeRef.symbolName)} not found in ${Logger.path(codeFilePath)}`
        );
        continue;
      }

      // Generate current hash
      const currentHashObj = hasher.hash(currentSignature);
      const currentHash = currentHashObj.hash;

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
        `Error analyzing ${codeFilePath}#${entry.codeRef.symbolName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return drifts;
}
