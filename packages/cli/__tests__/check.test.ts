import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkCommand } from '../src/commands/check';
import { DoctypeMapManager } from '../../content/map-manager';
import { AstAnalyzer } from '@doctypedev/core';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('CLI: check command', () => {
  let originalCwd: string;
  let testDir: string;
  let testMapPath: string;
  let testCodeFile: string;
  let testDocFile: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = join(originalCwd, 'test-cli');
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

    // Create test code file
    const testCode = `export function testFunc(x: number): number {
  return x * 2;
}`;
    writeFileSync(testCodeFile, testCode);

    // Create test doc file with anchor
    const testDoc = `# Test
<!-- doctype:start id="test-id" code_ref="${testCodeFile}#testFunc" -->
Test documentation
<!-- doctype:end id="test-id" -->`;
    writeFileSync(testDocFile, testDoc);

    // Create test map with correct hash
    const analyzer = new AstAnalyzer();
    const signatures = analyzer.analyzeFile(testCodeFile);
    const signature = signatures.find((s) => s.symbolName === 'testFunc');

    if (signature && signature.hash) {
      const hash = signature.hash;
      const manager = new DoctypeMapManager(testMapPath);
      manager.addEntry({
        id: 'test-id',
        codeRef: {
          filePath: testCodeFile,
          symbolName: 'testFunc',
        },
        codeSignatureHash: hash,
        docRef: {
          filePath: testDocFile,
        },
        lastUpdated: Date.now(),
      });
      manager.save();
    }

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);

    // Cleanup test files
    const configPath = join(testDir, 'doctype.config.json');
    if (existsSync(testCodeFile)) unlinkSync(testCodeFile);
    if (existsSync(testDocFile)) unlinkSync(testDocFile);
    if (existsSync(testMapPath)) unlinkSync(testMapPath);
    if (existsSync(configPath)) unlinkSync(configPath);
    if (existsSync(testDir)) {
      try {
        unlinkSync(testDir);
      } catch {
        // Directory might not be empty, that's ok
      }
    }
  });

  it('should detect no drift when code is unchanged', async () => {
    const result = await checkCommand({
      map: testMapPath,
      verbose: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalEntries).toBe(1);
    expect(result.driftedEntries).toBe(0);
    expect(result.drifts).toHaveLength(0);
  });

  it('should detect drift when code signature changes', async () => {
    // Modify the code to change signature
    const modifiedCode = `export function testFunc(x: number, y: number): number {
  return x * y;
}`;
    writeFileSync(testCodeFile, modifiedCode);

    const result = await checkCommand({
      map: testMapPath,
      verbose: false,
    });

    expect(result.success).toBe(false);
    expect(result.totalEntries).toBe(1);
    expect(result.driftedEntries).toBe(1);
    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0].symbolName).toBe('testFunc');
  });

  it('should handle missing map file gracefully', async () => {
    const result = await checkCommand({
      map: './nonexistent-map.json',
      verbose: false,
    });

    expect(result.success).toBe(false);
    expect(result.totalEntries).toBe(0);
  });

  it('should handle empty map file', async () => {
    // Create empty map
    const emptyManager = new DoctypeMapManager(testMapPath);
    emptyManager.clear();
    emptyManager.save();

    const result = await checkCommand({
      map: testMapPath,
      verbose: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalEntries).toBe(0);
    expect(result.driftedEntries).toBe(0);
  });

  it('should handle missing code file gracefully', async () => {
    // Delete code file
    unlinkSync(testCodeFile);

    const result = await checkCommand({
      map: testMapPath,
      verbose: false,
    });

    // Should detect missing file
    expect(result.success).toBe(false);
    expect(result.driftedEntries).toBe(0);
    expect(result.missingEntries).toBe(1);
    expect(result.missing[0].reason).toBe('file_not_found');
  });

  it('should detect missing symbol (rename) in existing file', async () => {
    // Rename function in code (simulating a rename)
    const modifiedCode = `export function renamedFunc(x: number): number {
  return x * 2;
}`;
    writeFileSync(testCodeFile, modifiedCode);

    const result = await checkCommand({
      map: testMapPath,
      verbose: false,
    });

    expect(result.success).toBe(false);
    expect(result.missingEntries).toBe(1);
    expect(result.missing[0].reason).toBe('symbol_not_found');
    expect(result.missing[0].symbolName).toBe('testFunc');
  });

  it('should provide detailed drift information in verbose mode', async () => {
    // Modify the code
    const modifiedCode = `export function testFunc(x: string): string {
  return x.toUpperCase();
}`;
    writeFileSync(testCodeFile, modifiedCode);

    const result = await checkCommand({
      map: testMapPath,
      verbose: true,
    });

    expect(result.drifts[0]).toHaveProperty('id');
    expect(result.drifts[0]).toHaveProperty('symbolName');
    expect(result.drifts[0]).toHaveProperty('codeFilePath');
    expect(result.drifts[0]).toHaveProperty('docFilePath');
    expect(result.drifts[0]).toHaveProperty('oldHash');
    expect(result.drifts[0]).toHaveProperty('newHash');
    expect(result.drifts[0]).toHaveProperty('newSignature');
  });
});
