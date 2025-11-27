/**
 * Example: Phase 2 Integration
 *
 * Demonstrates how to use the Content & Mapping modules together
 * to manage documentation anchors and inject content
 */

import { MarkdownParser } from '../content/markdown-parser';
import { DoctypeMapManager } from '../content/map-manager';
import { ContentInjector } from '../content/content-injector';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { v4 as uuidv4 } from 'uuid';

/**
 * Example workflow for managing documentation
 */
export function exampleWorkflow(): void {
  console.log('=== Doctype Phase 2 Integration Example ===\n');

  // Step 1: Parse markdown files to find all anchors
  console.log('Step 1: Parsing markdown files...');
  const parser = new MarkdownParser();
  const mdFilePath = 'src/content/__tests__/fixtures/example-docs.md';

  const anchors = parser.parseFile(mdFilePath);
  console.log(`Found ${anchors.length} anchors in ${mdFilePath}`);

  // Step 2: Initialize the doctype-map manager
  console.log('\nStep 2: Initializing doctype-map.json...');
  const mapManager = new DoctypeMapManager('./example-doctype-map.json');

  // Step 3: For each anchor, analyze the referenced code and create map entries
  console.log('\nStep 3: Analyzing code and creating map entries...');
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();

  for (const anchor of anchors) {
    console.log(`\nProcessing anchor: ${anchor.id}`);

    // Parse code reference
    const { filePath, symbolName } = parser.parseCodeRef(anchor.codeRef);
    console.log(`  Code ref: ${filePath}#${symbolName}`);

    try {
      // Analyze the code file
      const signatures = analyzer.analyzeFile(filePath);
      const symbolSignature = signatures.find((sig) => sig.symbolName === symbolName);

      if (!symbolSignature) {
        console.log(`  ⚠️  Symbol "${symbolName}" not found in ${filePath}`);
        continue;
      }

      // Generate hash
      const signatureHash = hasher.hash(symbolSignature);

      // Create map entry
      const mapEntry = {
        id: anchor.id,
        codeRef: {
          filePath,
          symbolName,
        },
        codeSignatureHash: signatureHash.hash,
        docRef: {
          filePath: mdFilePath,
          startLine: anchor.startLine,
          endLine: anchor.endLine,
        },
        originalMarkdownContent: anchor.content,
        lastUpdated: Date.now(),
      };

      // Add to map
      mapManager.addEntry(mapEntry);
      console.log(`  ✓ Added to map with hash: ${signatureHash.hash.substring(0, 8)}...`);
    } catch (error) {
      console.log(`  ⚠️  Error processing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Step 4: Save the map
  console.log('\nStep 4: Saving doctype-map.json...');
  mapManager.save();
  console.log(`✓ Saved ${mapManager.getEntryCount()} entries`);

  // Step 5: Demonstrate drift detection
  console.log('\nStep 5: Checking for drift...');
  const entries = mapManager.getEntries();

  for (const entry of entries) {
    try {
      // Re-analyze the code to get current hash
      const signatures = analyzer.analyzeFile(entry.codeRef.filePath);
      const currentSignature = signatures.find((sig) => sig.symbolName === entry.codeRef.symbolName);

      if (currentSignature) {
        const currentHash = hasher.hash(currentSignature).hash;
        const hasDrift = mapManager.hasDrift(entry.id, currentHash);

        if (hasDrift) {
          console.log(`  ⚠️  DRIFT DETECTED for ${entry.codeRef.symbolName}`);
          console.log(`     Old hash: ${entry.codeSignatureHash.substring(0, 8)}...`);
          console.log(`     New hash: ${currentHash.substring(0, 8)}...`);
        } else {
          console.log(`  ✓ No drift for ${entry.codeRef.symbolName}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error checking drift: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Step 6: Demonstrate content injection
  console.log('\nStep 6: Content injection example...');
  const injector = new ContentInjector();

  const firstEntry = entries[0];
  if (firstEntry) {
    const newContent = `UPDATED: This content was automatically injected by Doctype.

The function signature is tracked and any changes will trigger drift detection.`;

    // Preview the injection (without writing)
    const preview = injector.preview(firstEntry.docRef.filePath, firstEntry.id, newContent);

    if (preview.success) {
      console.log(`  ✓ Preview successful for anchor ${firstEntry.id}`);
      console.log(`  Lines changed: ${preview.linesChanged}`);
    } else {
      console.log(`  ⚠️  Preview failed: ${preview.error}`);
    }
  }

  console.log('\n=== Example completed ===');
}

/**
 * Example: Create a new documentation anchor programmatically
 */
export function createNewAnchor(
  mdFilePath: string,
  codeFilePath: string,
  symbolName: string
): string {
  // Generate a new UUID for the anchor
  const anchorId = uuidv4();

  console.log(`Creating new anchor with ID: ${anchorId}`);
  console.log(`Code reference: ${codeFilePath}#${symbolName}`);

  // The anchor should be manually added to the markdown file:
  const anchorStart = `<!-- doctype:start id="${anchorId}" code_ref="${codeFilePath}#${symbolName}" -->`;
  const anchorEnd = `<!-- doctype:end id="${anchorId}" -->`;

  console.log('\nAdd these lines to your markdown file:');
  console.log(anchorStart);
  console.log('Your documentation content here...');
  console.log(anchorEnd);

  return anchorId;
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleWorkflow();
}
