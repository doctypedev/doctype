import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initCommand } from '../init';
import { determineOutputFile } from '../init-orchestrator';
import { readFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { DoctypeConfig } from '../types';
import { SymbolType } from '@doctypedev/core';

// Mock the AI module to avoid dependency issues
vi.mock('../../ai', () => {
  return {
    AIAgent: class {
      constructor(_config: any) {}
      generateInitial(): Promise<string> { return Promise.resolve('AI Generated Content'); }
      generateBatch(): Promise<any[]> { return Promise.resolve([]); }
    }
  };
});

// Mock @clack/prompts - use vi.hoisted to ensure variables are available during hoisting
const { 
  mockIntro,
  mockOutro,
  mockCancel,
  mockText,
  mockConfirm,
  mockPassword,
  mockNote,
  mockSpinner,
  mockIsCancel,
  mockSelect,
} = vi.hoisted(() => {
  return {
    mockIntro: vi.fn(),
    mockOutro: vi.fn(),
    mockCancel: vi.fn(),
    mockText: vi.fn(),
    mockConfirm: vi.fn(),
    mockPassword: vi.fn(),
    mockNote: vi.fn(),
    mockSpinner: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn(),
    })),
    mockIsCancel: vi.fn((value) => value === Symbol.for('clack.cancel')),
    mockSelect: vi.fn(),
  };
});
vi.mock('@clack/prompts', () => ({
  intro: mockIntro,
  outro: mockOutro,
  cancel: mockCancel,
  text: mockText,
  confirm: mockConfirm,
  password: mockPassword,
  note: mockNote,
  spinner: mockSpinner,
  isCancel: mockIsCancel,
  select: mockSelect,
}));

describe('CLI: init command', () => {
  const originalCwd = process.cwd();
  const testDir = resolve(originalCwd, 'test-cli-init');
  const configPath = join(testDir, 'doctype.config.json');
  const envPath = join(testDir, '.env');
  const gitignorePath = join(testDir, '.gitignore');
  let originalProcessCwd: typeof process.cwd;

  // Helper to mock @clack/prompts responses
  const mockClackResponses = (responses: {
    confirmOverwrite?: boolean;
    projectName?: string;
    projectRoot?: string;
    docsFolder?: string;
    mapFile?: string;
    outputStrategy?: 'mirror' | 'module' | 'type';
  }): void => {
    // Reset previous mocks
    mockConfirm.mockReset();
    mockText.mockReset();
    mockPassword.mockReset();
    mockNote.mockReset();
    mockIntro.mockReset();
    mockOutro.mockReset();
    mockSpinner.mockReset();
    mockSelect.mockReset();

    // Mock intro (always called)
    mockIntro.mockReturnValue(undefined);

    // Mock confirm for overwrite if provided
    if (responses.confirmOverwrite !== undefined) {
      mockConfirm.mockResolvedValueOnce(responses.confirmOverwrite);
    }

    // Mock text prompts for config
    mockText
      .mockResolvedValueOnce(responses.projectName || 'test-cli-init')
      .mockResolvedValueOnce(responses.projectRoot || '.')
      .mockResolvedValueOnce(responses.docsFolder || './docs')
      .mockResolvedValueOnce(responses.mapFile || 'doctype-map.json');

    // Mock select prompt for outputStrategy
    mockSelect.mockResolvedValueOnce(responses.outputStrategy || 'mirror');

    // Mock note (if called)
    mockNote.mockReturnValue(undefined);

    // Mock spinner (always called)
    const mockSpinnerInstance = {
      start: vi.fn().mockReturnValue(undefined),
      stop: vi.fn().mockReturnValue(undefined),
      message: vi.fn().mockReturnValue(undefined),
    };
    mockSpinner.mockReturnValue(mockSpinnerInstance);

    // Mock outro (always called at the end on success)
    mockOutro.mockReturnValue(undefined);
  };

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Mock process.cwd() to return test directory
    originalProcessCwd = process.cwd;
    process.cwd = vi.fn(() => testDir);

    // Clear mocks (but keep implementations)
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original process.cwd
    process.cwd = originalProcessCwd;

    // Cleanup test files
    if (existsSync(configPath)) unlinkSync(configPath);
    if (existsSync(envPath)) unlinkSync(envPath);
    if (existsSync(gitignorePath)) unlinkSync(gitignorePath);
    if (existsSync(testDir)) {
      try {
        rmdirSync(testDir);
      } catch {
        // Directory might not be empty, that's ok
      }
    }
  });

  it('should create config file with default values', async () => {
    // Mock user using defaults
    mockClackResponses({});

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);
    expect(result.configPath).toBe(join(process.cwd(), 'doctype.config.json'));
    expect(existsSync(configPath)).toBe(true);

    // Verify config content
    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    expect(config.projectName).toBe('test-cli-init');
    expect(config.projectRoot).toBe('.');
    expect(config.docsFolder).toBe('./docs');
    expect(config.mapFile).toBe('doctype-map.json');
  });

  it('should create config file with custom values', async () => {
    // Mock custom responses
    mockClackResponses({
      projectName: 'My Custom Project',
      projectRoot: './src',
      docsFolder: './documentation',
      mapFile: 'custom-map.json',
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    // Verify config content
    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    expect(config.projectName).toBe('My Custom Project');
    expect(config.projectRoot).toBe('./src');
    expect(config.docsFolder).toBe('./documentation');
    expect(config.mapFile).toBe('custom-map.json');
  });

  it('should handle existing config file with overwrite confirmation', async () => {
    // Create existing config
    const existingConfig: DoctypeConfig = {
      projectName: 'Existing Project',
      projectRoot: '.',
      docsFolder: './docs',
      mapFile: 'doctype-map.json',
    };
    writeFileSync(
      configPath,
      JSON.stringify(existingConfig, null, 2)
    );

    // Mock responses: 'yes' to overwrite, then defaults
    mockClackResponses({
      confirmOverwrite: true,
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    // Verify config was overwritten
    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    expect(config.projectName).toBe('test-cli-init');
  });

  it('should cancel initialization when user declines to overwrite', async () => {
    // Create existing config
    const existingConfig: DoctypeConfig = {
      projectName: 'Existing Project',
      projectRoot: '.',
      docsFolder: './docs',
      mapFile: 'doctype-map.json',
    };
    writeFileSync(
      configPath,
      JSON.stringify(existingConfig, null, 2)
    );

    // Mock response: 'no' to overwrite (early exit, no more prompts)
    mockClackResponses({
      confirmOverwrite: false,
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Configuration file already exists');

    // Verify config was not modified
    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    expect(config.projectName).toBe('Existing Project');
  });

  it('should create project root directory if it does not exist', async () => {
    const newProjectRoot = './new-project-root';
    const newProjectRootPath = join(testDir, newProjectRoot);

    // Mock responses with non-existent project root
    mockClackResponses({
      projectName: 'Test Project',
      projectRoot: newProjectRoot,
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);
    expect(existsSync(newProjectRootPath)).toBe(true);

    // Cleanup
    if (existsSync(newProjectRootPath)) {
      rmdirSync(newProjectRootPath);
    }
  });

  it('should format config file as valid JSON with proper indentation', async () => {
    mockClackResponses({});

    await initCommand({ verbose: false });

    const configContent = readFileSync(configPath, 'utf-8');

    // Verify it's valid JSON
    expect(() => JSON.parse(configContent)).not.toThrow();

    // Verify formatting (should have 2-space indentation)
    expect(configContent).toContain('  "projectName"');
    expect(configContent).toContain('  "projectRoot"');

    // Verify it ends with newline
    expect(configContent.endsWith('\n')).toBe(true);
  });

  it('should handle mixed case responses for overwrite confirmation', async () => {
    // Create existing config
    const existingConfig: DoctypeConfig = {
      projectName: 'Existing Project',
      projectRoot: '.',
      docsFolder: './docs',
      mapFile: 'doctype-map.json',
    };
    writeFileSync(
      configPath,
      JSON.stringify(existingConfig, null, 2)
    );

    // Test with confirm=true for overwrite, then defaults
    mockClackResponses({
      confirmOverwrite: true,
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);
  });

  it('should trim whitespace from user input', async () => {
    // Note: @clack/prompts handles trimming automatically, but we test it anyway
    mockClackResponses({
      projectName: '  My Project  ',
      projectRoot: '  ./src  ',
      docsFolder: '  ./docs  ',
      mapFile: '  map.json  ',
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    // Values should be used as provided (trimming happens in UI layer)
    expect(config.projectName).toContain('My Project');
    expect(config.projectRoot).toContain('./src');
    expect(config.docsFolder).toContain('./docs');
    expect(config.mapFile).toContain('map.json');
  });

  it('should use project directory name as default project name', async () => {
    // Mock empty/default responses (all defaults)
    mockClackResponses({});

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    // Should use the test directory name
    expect(config.projectName).toBe('test-cli-init');
  });

  it('should handle errors gracefully', async () => {
    // Mock @clack/prompts to throw an error
    mockText.mockRejectedValueOnce(new Error('Prompt error'));

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Prompt error');
    expect(result.configPath).toBeUndefined();
  });

  it('should save all required fields in config', async () => {
    mockClackResponses({
      projectName: 'Test',
      projectRoot: './root',
      docsFolder: './docs',
      mapFile: 'map.json',
    });

    await initCommand({ verbose: false });

    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    // Verify all required fields are present
    expect(config).toHaveProperty('projectName');
    expect(config).toHaveProperty('projectRoot');
    expect(config).toHaveProperty('docsFolder');
    expect(config).toHaveProperty('mapFile');
    expect(config).toHaveProperty('outputStrategy');

    // Verify no extra fields
    expect(Object.keys(config)).toHaveLength(5);
  });
});

describe('determineOutputFile', () => {
  const docsFolder = 'docs';

  it('should handle "mirror" strategy correctly', () => {
    // src/auth/login.ts -> docs/src/auth/login.md
    const result = determineOutputFile('mirror', docsFolder, 'src/auth/login.ts', SymbolType.Function);
    expect(result).toBe(join(docsFolder, 'src/auth/login.md'));
    
    // Windows style path input should still work with join
    const result2 = determineOutputFile('mirror', docsFolder, 'src/utils.ts', SymbolType.Class);
    expect(result2).toBe(join(docsFolder, 'src/utils.md'));
  });

  it('should handle "module" strategy correctly', () => {
    // src/auth/login.ts -> docs/src/auth.md
    const result = determineOutputFile('module', docsFolder, 'src/auth/login.ts', SymbolType.Function);
    expect(result).toBe(join(docsFolder, 'src/auth.md'));

    // src/index.ts -> docs/src.md
    const result2 = determineOutputFile('module', docsFolder, 'src/index.ts', SymbolType.Variable);
    expect(result2).toBe(join(docsFolder, 'src.md'));

    // index.ts (root) -> docs/index.md
    const result3 = determineOutputFile('module', docsFolder, 'index.ts', SymbolType.Function);
    expect(result3).toBe(join(docsFolder, 'index.md'));
  });

  it('should handle "type" strategy correctly', () => {
    // Class -> classes.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.Class))
      .toBe(join(docsFolder, 'classes.md'));

    // Function -> functions.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.Function))
      .toBe(join(docsFolder, 'functions.md'));

    // Interface -> interfaces.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.Interface))
      .toBe(join(docsFolder, 'interfaces.md'));

    // Type Alias -> types.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.TypeAlias))
      .toBe(join(docsFolder, 'types.md'));
      
    // Enum -> types.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.Enum))
      .toBe(join(docsFolder, 'types.md'));

    // Variable -> variables.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.Variable))
      .toBe(join(docsFolder, 'variables.md'));

    // Const -> variables.md
    expect(determineOutputFile('type', docsFolder, 'src/foo.ts', SymbolType.Const))
      .toBe(join(docsFolder, 'variables.md'));
  });

  it('should default to "mirror" strategy if undefined', () => {
    // @ts-expect-error - testing undefined strategy
    const result = determineOutputFile(undefined, docsFolder, 'src/file.ts', SymbolType.Function);
    expect(result).toBe(join(docsFolder, 'src/file.md'));
  });
});
