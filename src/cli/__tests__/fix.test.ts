import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixCommand } from '../fix';
import { DoctypeMapManager } from '../../content/map-manager';
import { ASTAnalyzer } from '../../core/ast-analyzer';
import { SignatureHasher } from '../../core/signature-hasher';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('CLI: fix command', () => {
  const testDir = './test-cli-fix';
  const testMapPath = join(testDir, 'doctype-map.json');
  const testCodeFile = join(testDir, 'test.ts');
  const testDocFile = join(testDir, 'test.md');

  // Increase timeout for all tests in this suite
  const TEST_TIMEOUT = 15000;

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create test doc file with anchor
    const testDoc = `# Test
<!-- doctype:start id="test-id" code_ref="${testCodeFile}#testFunc" -->
Old documentation
<!-- doctype:end id="test-id" -->`;
    writeFileSync(testDocFile, testDoc);

    // Step 1: Create map with OLD hash (from old code signature)
    const oldCode = `export function testFunc(x: number): number {
  return x;
}`;
    const analyzer = new ASTAnalyzer();
    const hasher = new SignatureHasher();
    const oldSignatures = analyzer.analyzeCode(oldCode);
    const oldSignature = oldSignatures.find((s) => s.symbolName === 'testFunc');

    if (oldSignature) {
      const oldHash = hasher.hash(oldSignature).hash;
      const manager = new DoctypeMapManager(testMapPath);
      manager.addEntry({
        id: 'test-id',
        codeRef: {
          filePath: testCodeFile,
          symbolName: 'testFunc',
        },
        codeSignatureHash: oldHash,
        docRef: {
          filePath: testDocFile,
          startLine: 1,
          endLine: 3,
        },
        originalMarkdownContent: 'Old documentation',
        lastUpdated: Date.now(),
      });
      manager.save();
    }

    // Step 2: Create CURRENT code file with DIFFERENT signature (adds parameter = drift!)
    const currentCode = `export function testFunc(x: number, y: number): number {
  return x * y;
}`;
    writeFileSync(testCodeFile, currentCode);
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testCodeFile)) unlinkSync(testCodeFile);
    if (existsSync(testDocFile)) unlinkSync(testDocFile);
    if (existsSync(testMapPath)) unlinkSync(testMapPath);
    if (existsSync(testDir)) {
      try {
        unlinkSync(testDir);
      } catch {
        // Directory might not be empty
      }
    }
  });

  it('should fix drift by updating documentation', async () => {
    const result = await fixCommand({
      map: testMapPath,
      verbose: false,
      dryRun: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalFixes).toBe(1);
    expect(result.successfulFixes).toBe(1);
    expect(result.failedFixes).toBe(0);

    // Verify doc file was updated
    const updatedDoc = readFileSync(testDocFile, 'utf-8');
    expect(updatedDoc).toContain('<!-- doctype:start id="test-id"');
    expect(updatedDoc).toContain('<!-- doctype:end id="test-id" -->');
    expect(updatedDoc).not.toContain('Old documentation');
  }, TEST_TIMEOUT);

  it('should not modify files in dry-run mode', async () => {
    const originalDoc = readFileSync(testDocFile, 'utf-8');

    const result = await fixCommand({
      map: testMapPath,
      verbose: false,
      dryRun: true,
    });

    expect(result.totalFixes).toBe(1);

    // Verify doc file was NOT updated
    const currentDoc = readFileSync(testDocFile, 'utf-8');
    expect(currentDoc).toBe(originalDoc);
  }, TEST_TIMEOUT);

  it('should handle missing map file gracefully', async () => {
    const result = await fixCommand({
      map: './nonexistent-map.json',
      verbose: false,
    });

    expect(result.success).toBe(false);
    expect(result.totalFixes).toBe(0);
  });

  it('should handle no drift detected', async () => {
    // Update map to match current code
    const analyzer = new ASTAnalyzer();
    const hasher = new SignatureHasher();
    const signatures = await analyzer.analyzeFile(testCodeFile);
    const signature = signatures.find((s) => s.symbolName === 'testFunc');

    if (signature) {
      const currentHash = hasher.hash(signature).hash;
      const manager = new DoctypeMapManager(testMapPath);
      manager.updateEntry('test-id', {
        codeSignatureHash: currentHash,
      });
      manager.save();
    }

    const result = await fixCommand({
      map: testMapPath,
      verbose: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalFixes).toBe(0);
  });

  it('should update map file after successful fix', async () => {
    await fixCommand({
      map: testMapPath,
      verbose: false,
      dryRun: false,
    });

    // Load updated map
    const manager = new DoctypeMapManager(testMapPath);
    const entry = manager.getEntryById('test-id');

    expect(entry).toBeDefined();

    // Verify hash was updated
    const analyzer = new ASTAnalyzer();
    const hasher = new SignatureHasher();
    const signatures = await analyzer.analyzeFile(testCodeFile);
    const signature = signatures.find((s) => s.symbolName === 'testFunc');

    if (signature) {
      const currentHash = hasher.hash(signature).hash;
      expect(entry?.codeSignatureHash).toBe(currentHash);
    }
  });

  it('should generate placeholder content with signature', async () => {
    const result = await fixCommand({
      map: testMapPath,
      verbose: false,
      dryRun: false,
    });

    expect(result.fixes[0].newContent).toContain('testFunc');
    expect(result.fixes[0].newContent).toContain('Current signature');
    expect(result.fixes[0].newContent).toContain('```typescript');
  });
});
