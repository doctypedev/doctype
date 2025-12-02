/**
 * Script to generate doctype-map.json from documentation anchors
 */
import { ASTAnalyzer, SignatureHasher, MarkdownParser } from '../src';
import { writeFileSync } from 'fs';
import { DoctypeMap } from '../src/core/types';

const analyzer = new ASTAnalyzer('./tsconfig.json');
const hasher = new SignatureHasher();
const parser = new MarkdownParser();

// Define all documentation files with anchors
const docsWithAnchors = [
  'docs/cli/check.md',
  'docs/cli/fix.md',
  'docs/api/ast-analyzer.md',
  'docs/api/signature-hasher.md',
  'docs/api/markdown-parser.md',
  'docs/api/map-manager.md',
  'docs/api/content-injector.md',
];

const map: DoctypeMap = {
  version: '1.0',
  entries: [],
};

(async () => {
  console.log('🔍 Generating doctype-map.json...\n');

  for (const docFile of docsWithAnchors) {
    console.log(`Processing: ${docFile}`);

    try {
      const anchors = parser.parseFile(docFile);
      console.log(`  Found ${anchors.length} anchor(s)`);

      for (const anchor of anchors) {
        const [filePath, symbolName] = anchor.codeRef.split('#');

        console.log(`    • ${symbolName} (${filePath})`);

        try {
          // Analyze file and find the specific symbol
          const signatures = await analyzer.analyzeFile(filePath);
          const signature = signatures.find((sig) => sig.symbolName === symbolName);

          if (!signature) {
            console.warn(`      ⚠️  Symbol not found: ${symbolName} in ${filePath}`);
            continue;
          }

          const signatureHash = hasher.hash(signature);

          map.entries.push({
            id: anchor.id,
            codeRef: {
              filePath: filePath,
              symbolName: symbolName,
            },
            codeSignatureHash: signatureHash.hash,
            docRef: {
              filePath: docFile,
              startLine: anchor.startLine,
              endLine: anchor.endLine,
            },
            originalMarkdownContent: anchor.content,
            lastUpdated: Date.now(),
          });

          console.log(`      ✓ Hash: ${signatureHash.hash.substring(0, 16)}...`);
        } catch (error) {
          console.error(`      ✗ Error analyzing ${symbolName}:`, error instanceof Error ? error.message : error);
        }
      }
    } catch (error) {
      console.error(`  ✗ Error parsing ${docFile}:`, error instanceof Error ? error.message : error);
    }

    console.log();
  }

  // Save to file
  const outputPath = './doctype-map.json';
  writeFileSync(outputPath, JSON.stringify(map, null, 2));

  console.log(`✅ Generated ${map.entries.length} entries`);
  console.log(`📝 Saved to: ${outputPath}\n`);
})();
