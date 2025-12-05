/**
 * Init Orchestrator - Core business logic for initialization
 *
 * This module contains the core logic for:
 * - Scanning codebases for TypeScript files
 * - Extracting symbols and generating signatures
 * - Creating documentation anchors
 * - Managing the doctype-map.json
 *
 * This is pure business logic with no CLI dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AstAnalyzer, SymbolType, discoverFiles } from '@doctypedev/core';
import { DoctypeMapManager } from '../content/map-manager';
import { MarkdownAnchorInserter } from '../content/markdown-anchor-inserter';
import type { DoctypeMapEntry, SymbolTypeValue, CodeSignature } from '@doctypedev/core';
import { AIAgent } from '../ai';

/**
 * Output strategy for documentation files
 */
export type OutputStrategy = 'mirror' | 'module' | 'type';

/**
 * Configuration for the initialization process
 */
export interface InitConfig {
  projectRoot: string;
  docsFolder: string;
  mapFile: string;
  outputStrategy?: OutputStrategy;
  aiAgent?: AIAgent;
}

/**
 * Result of the scanning process
 */
export interface ScanResult {
  totalFiles: number;
  totalSymbols: number;
  anchorsCreated: number;
  filesCreated: number;
  errors: string[];
}

/**
 * Progress callback for reporting scan progress
 */
export type ProgressCallback = (message: string) => void;

/**
 * Determine the output file path based on strategy and symbol
 */
export function determineOutputFile(
  strategy: OutputStrategy,
  docsFolder: string,
  filePath: string,
  symbolType: SymbolTypeValue
): string {
  // Default to mirror if undefined
  const effectiveStrategy = strategy || 'mirror';

  if (effectiveStrategy === 'mirror') {
    // src/auth/login.ts -> docs/src/auth/login.md
    // We keep the full path structure to avoid collisions
    const parsed = path.parse(filePath);
    const dirPath = path.join(docsFolder, parsed.dir);
    return path.join(dirPath, `${parsed.name}.md`);
  }

  if (effectiveStrategy === 'module') {
    // src/auth/login.ts -> docs/src/auth.md
    // src/index.ts -> docs/src.md
    const dir = path.dirname(filePath);
    // If file is at root (e.g. index.ts), dir is "."
    if (dir === '.' || dir === '') {
      return path.join(docsFolder, 'index.md');
    }
    return path.join(docsFolder, `${dir}.md`);
  }

  if (effectiveStrategy === 'type') {
    switch (symbolType) {
      case SymbolType.Class:
        return path.join(docsFolder, 'classes.md');
      case SymbolType.Function:
        return path.join(docsFolder, 'functions.md');
      case SymbolType.Interface:
        return path.join(docsFolder, 'interfaces.md');
      case SymbolType.TypeAlias:
      case SymbolType.Enum:
        return path.join(docsFolder, 'types.md');
      case SymbolType.Variable:
      case SymbolType.Const:
        return path.join(docsFolder, 'variables.md');
      default:
        return path.join(docsFolder, 'api.md');
    }
  }

  return path.join(docsFolder, 'api.md');
}

/**
 * Generates a meaningful H1 title for a new Markdown documentation file
 */
function generateMarkdownTitle(docPath: string): string {
  const basename = path.basename(docPath, '.md');

  if (basename === 'index' || basename === 'api') {
    return 'API Reference';
  }

  // Capitalize the first letter
  return basename.charAt(0).toUpperCase() + basename.slice(1);
}

/**
 * Helper function to limit concurrency
 */
async function pMap<T, R>(
    items: T[],
    mapper: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;
    const execThread = async (): Promise<void> => {
        while (index < items.length) {
            const curIndex = index++;
            results[curIndex] = await mapper(items[curIndex]);
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
 * Scan codebase and create documentation anchors
 *
 * This is the core orchestration function that:
 * 1. Discovers TypeScript files using Rust-powered discovery
 * 2. Analyzes each file for exported symbols
 * 3. Generates signature hashes
 * 4. Creates documentation anchors in markdown files
 * 5. Updates the doctype-map.json
 *
 * @param config - Configuration for the scan
 * @param onProgress - Optional callback for progress updates
 * @returns Scan result with statistics
 */
export async function scanAndCreateAnchors(
  config: InitConfig,
  onProgress?: ProgressCallback
): Promise<ScanResult> {
  const projectRoot = path.resolve(process.cwd(), config.projectRoot);
  const docsFolder = path.resolve(process.cwd(), config.docsFolder);
  const mapFilePath = path.resolve(process.cwd(), config.mapFile);

  const result: ScanResult = {
    totalFiles: 0,
    totalSymbols: 0,
    anchorsCreated: 0,
    filesCreated: 0,
    errors: [],
  };

  // Ensure docs folder exists
  if (!fs.existsSync(docsFolder)) {
    fs.mkdirSync(docsFolder, { recursive: true });
  }

  // Initialize modules
  const analyzer = new AstAnalyzer();
  const mapManager = new DoctypeMapManager(mapFilePath);
  const anchorInserter = new MarkdownAnchorInserter();

  // Find all TypeScript files using Rust-powered discovery
  onProgress?.('Scanning TypeScript files...');
  const discoveryResult = discoverFiles(projectRoot, {
    respectGitignore: true,
    includeHidden: false,
    maxDepth: undefined, // Unlimited depth
  });

  const tsFiles = discoveryResult.sourceFiles.filter((file: string) => {
    const relativeToRoot = path.relative(projectRoot, file);
    const relativeDocs = path.relative(projectRoot, docsFolder);
    
    // Exclude files inside docs folder
    if (relativeToRoot.startsWith(relativeDocs)) {
        return false;
    }
    
    return true;
  });
  
  result.totalFiles = tsFiles.length;

  if (tsFiles.length === 0) {
    onProgress?.('No TypeScript files found.');
    return result;
  }

  onProgress?.(`Found ${tsFiles.length} TypeScript files. Analyzing...`);

  // Collect all symbols
  const symbolsToDocument: Array<{
    filePath: string;
    symbolName: string;
    symbolType: SymbolTypeValue;
    signatureText: string;
    hash: string;
    targetDocFile: string;
    originalSignature: CodeSignature;
  }> = [];

  for (const tsFile of tsFiles) {
    try {
      const signatures = analyzer.analyzeFile(tsFile);
      // Normalize path to use forward slashes on all platforms
      const relativePath = path.relative(projectRoot, tsFile).split(path.sep).join('/');

      for (const signature of signatures) {
        if (signature.isExported) {
          // Hash is already computed by Rust analyzer
          const hash = signature.hash;
          if (!hash) {
            const errorMsg = `No hash computed for ${signature.symbolName} in ${tsFile}`;
            result.errors.push(errorMsg);
            onProgress?.(errorMsg);
            continue;
          }

          const targetDocFile = determineOutputFile(
            config.outputStrategy || 'mirror',
            docsFolder,
            relativePath,
            signature.symbolType
          );

          symbolsToDocument.push({
            filePath: relativePath,
            symbolName: signature.symbolName,
            symbolType: signature.symbolType,
            signatureText: signature.signatureText,
            hash: hash,
            targetDocFile,
            originalSignature: signature,
          });
        }
      }
    } catch (error) {
      const errorMsg = `Could not analyze ${tsFile}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      onProgress?.(errorMsg);
    }
  }

  result.totalSymbols = symbolsToDocument.length;

  if (symbolsToDocument.length === 0) {
    onProgress?.('No exported symbols found.');
    return result;
  }

  onProgress?.(`Found ${symbolsToDocument.length} exported symbols. Creating anchors...`);

  // Group by target document
  const symbolsByDoc = new Map<string, typeof symbolsToDocument>();
  for (const sym of symbolsToDocument) {
    if (!symbolsByDoc.has(sym.targetDocFile)) {
      symbolsByDoc.set(sym.targetDocFile, []);
    }
    symbolsByDoc.get(sym.targetDocFile)!.push(sym);
  }

  // 1. Identify all missing symbols to batch AI processing
  const missingSymbols: typeof symbolsToDocument = [];
  
  // To avoid re-reading files later, we might cache content, but files are modified in loop.
  // However, anchor insertion is sequential per file.
  // We only need to know which symbols need documentation.
  
  // First pass: Check what's missing
  for (const [docPath, symbols] of symbolsByDoc.entries()) {
      let docContent = '';
      if (fs.existsSync(docPath)) {
          docContent = fs.readFileSync(docPath, 'utf-8');
      } else {
          // New file - all symbols are missing
          missingSymbols.push(...symbols);
          continue;
      }
      
      const existingCodeRefs = new Set(anchorInserter.getExistingCodeRefs(docContent));
      
      for (const symbol of symbols) {
          const codeRef = `${symbol.filePath}#${symbol.symbolName}`;
          if (!existingCodeRefs.has(codeRef)) {
              missingSymbols.push(symbol);
          }
      }
  }

  // 2. Generate AI Content in Batches
  const generatedContentMap = new Map<string, string>();
  
  if (config.aiAgent && missingSymbols.length > 0) {
      onProgress?.(`Generating documentation for ${missingSymbols.length} symbols...`);
      
      const BATCH_SIZE = 10;
      const BATCH_CONCURRENCY = 5; // Process 5 batches in parallel
      const chunks = [];
      
      for (let i = 0; i < missingSymbols.length; i += BATCH_SIZE) {
          chunks.push(missingSymbols.slice(i, i + BATCH_SIZE));
      }
      
      let completedBatches = 0;

      await pMap(chunks, async (chunk) => {
          try {
              const batchItems = chunk.map(s => ({
                  symbolName: s.symbolName,
                  signatureText: s.signatureText
              }));
              
              const results = await config.aiAgent!.generateBatch(batchItems);
              
              results.forEach(res => {
                  const originalSymbol = chunk.find(s => s.symbolName === res.symbolName);
                  if (originalSymbol) {
                      const codeRef = `${originalSymbol.filePath}#${originalSymbol.symbolName}`;
                      generatedContentMap.set(codeRef, res.content);
                  }
              });

              completedBatches++;
              onProgress?.(`Processed batch ${completedBatches}/${chunks.length} (${generatedContentMap.size}/${missingSymbols.length} symbols done)`);
              
          } catch (error) {
              // Log and continue - this batch failed, will use placeholders
              completedBatches++; // still count as processed (though failed)
              // const msg = error instanceof Error ? error.message : String(error);
              // onProgress?.(`Batch failed: ${msg}`);
          }
      }, BATCH_CONCURRENCY);
  }

  // 3. Process files and insert content
  for (const [docPath, symbols] of symbolsByDoc.entries()) {
    let docContent = '';
    let isNewFile = false;

    // Ensure directory exists for this doc file
    const docDir = path.dirname(docPath);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    if (fs.existsSync(docPath)) {
      docContent = fs.readFileSync(docPath, 'utf-8');
    } else {
      const title = generateMarkdownTitle(docPath);
      docContent = `# ${title}\n\nAuto-generated documentation via Doctype.\n\n`;
      isNewFile = true;
      result.filesCreated++;
    }

    const existingCodeRefs = anchorInserter.getExistingCodeRefs(docContent);
    const existingSet = new Set(existingCodeRefs);
    let hasChanges = false;

    for (const symbol of symbols) {
      const codeRef = `${symbol.filePath}#${symbol.symbolName}`;

      if (existingSet.has(codeRef)) {
        continue;
      }

      let content = 'TODO: Add documentation for this symbol';
      
      // Check if we have pre-generated content
      if (generatedContentMap.has(codeRef)) {
          content = generatedContentMap.get(codeRef)!;
      }

      const normalizedContent = content.trim();

      const insertResult = anchorInserter.insertIntoContent(docContent, codeRef, {
        createSection: true,
        placeholder: normalizedContent,
      });

      if (insertResult.success) {
        docContent = insertResult.content;
        hasChanges = true;

        const mapEntry: DoctypeMapEntry = {
          id: insertResult.anchorId,
          codeRef: {
            filePath: symbol.filePath,
            symbolName: symbol.symbolName,
          },
          codeSignatureHash: symbol.hash,
          codeSignatureText: symbol.signatureText,
          docRef: {
            filePath: path.relative(process.cwd(), docPath),
          },
          lastUpdated: Date.now(),
        };

        mapManager.addEntry(mapEntry);
        result.anchorsCreated++;
      }
    }

    if (isNewFile || hasChanges) {
      fs.writeFileSync(docPath, docContent, 'utf-8');
    }
  }

  mapManager.save();
  onProgress?.(`Created ${result.anchorsCreated} anchors in ${result.filesCreated} files`);

  return result;
}
