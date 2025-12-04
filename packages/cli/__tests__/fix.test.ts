import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixCommand } from '../fix';
import { DoctypeMapManager } from '../../content/map-manager';
import { AstAnalyzer } from '@doctypedev/core';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('CLI: fix command', () => {
  let originalCwd: string;
  let testDir: string;
  let testMapPath: string;
  let testCodeFile: string;
  let testDocFile: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = join(originalCwd, 'test-cli-fix');
    testMapPath = join(testDir, 'doctype-map.json');
    testCodeFile = join(testDir, 'test.ts');
    testDocFile = join(testDir, 'test.md');

    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create doctype config file
    const configPath = join(testDir, 'doctype.config.json');
    const config = {
      projectName: 'test-project',
      projectRoot: testDir,
      docsFolder: 'docs',
      mapFile: 'doctype-map.json',
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

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
    // Write old code to a temp file to analyze it
    const tempOldFile = join(testDir, 'temp-old.ts');
    writeFileSync(tempOldFile, oldCode);

    const analyzer = new AstAnalyzer();
    const oldSignatures = analyzer.analyzeFile(tempOldFile);
    const oldSignature = oldSignatures.find((s) => s.symbolName === 'testFunc');

    if (oldSignature && oldSignature.hash) {
      const oldHash = oldSignature.hash;
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

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);

    // Cleanup
    const configPath = join(testDir, 'doctype.config.json');
    if (existsSync(testCodeFile)) unlinkSync(testCodeFile);
    if (existsSync(testDocFile)) unlinkSync(testDocFile);
    if (existsSync(testMapPath)) unlinkSync(testMapPath);
    if (existsSync(configPath)) unlinkSync(configPath);
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
  });

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
  });

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
    const analyzer = new AstAnalyzer();
    const signatures = analyzer.analyzeFile(testCodeFile);
    const signature = signatures.find((s) => s.symbolName === 'testFunc');

    if (signature && signature.hash) {
      const currentHash = signature.hash;
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
    const analyzer = new AstAnalyzer();
    const signatures = analyzer.analyzeFile(testCodeFile);
    const signature = signatures.find((s) => s.symbolName === 'testFunc');

    if (signature && signature.hash) {
      const currentHash = signature.hash;
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
