import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initCommand } from '../init';
import { readFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import * as readline from 'readline';
import { DoctypeConfig } from '../types';

// Mock readline
vi.mock('readline', async () => {
  const actual = await vi.importActual<typeof readline>('readline');
  return {
    ...actual,
    createInterface: vi.fn(() => ({
      question: vi.fn(),
      close: vi.fn(),
    })),
  };
});

describe('CLI: init command', () => {
  const originalCwd = process.cwd();
  const testDir = resolve(originalCwd, 'test-cli-init');
  const configPath = join(testDir, 'doctype.config.json');
  const envPath = join(testDir, '.env');
  let originalProcessCwd: typeof process.cwd;

  // Helper to mock readline responses
  const mockReadlineResponses = (responses: string[]) => {
    let responseIndex = 0;
    const mockInterface = {
      question: vi.fn((query: string, callback: (answer: string) => void) => {
        const response = responses[responseIndex++] || '';
        callback(response);
      }),
      close: vi.fn(),
    };

    vi.mocked(readline.createInterface).mockReturnValue(
      mockInterface as unknown as readline.Interface
    );

    return mockInterface;
  };

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Mock process.cwd() to return test directory
    originalProcessCwd = process.cwd;
    process.cwd = vi.fn(() => testDir);

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original process.cwd
    process.cwd = originalProcessCwd;

    // Cleanup test files
    if (existsSync(configPath)) unlinkSync(configPath);
    if (existsSync(envPath)) unlinkSync(envPath);
    if (existsSync(testDir)) {
      try {
        rmdirSync(testDir);
      } catch {
        // Directory might not be empty, that's ok
      }
    }
  });

  it('should create config file with default values', async () => {
    // Mock user pressing enter for all prompts (using defaults, skip API key)
    mockReadlineResponses(['', '', '', '', '']);

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

    // Verify .env was not created (API key skipped)
    expect(existsSync(envPath)).toBe(false);
  });

  it('should create config file with custom values', async () => {
    // Mock custom responses (skip API key)
    mockReadlineResponses([
      'My Custom Project',
      './src',
      './documentation',
      'custom-map.json',
      '',
    ]);

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

    // Mock responses: 'yes' to overwrite, then defaults (skip API key)
    mockReadlineResponses(['yes', '', '', '', '', '']);

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
    mockReadlineResponses(['no']);

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

    // Mock responses with non-existent project root (skip API key)
    mockReadlineResponses(['Test Project', newProjectRoot, './docs', 'doctype-map.json', '']);

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);
    expect(existsSync(newProjectRootPath)).toBe(true);

    // Cleanup
    if (existsSync(newProjectRootPath)) {
      rmdirSync(newProjectRootPath);
    }
  });

  it('should format config file as valid JSON with proper indentation', async () => {
    mockReadlineResponses(['', '', '', '', '']);

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

    // Test with 'Y' (uppercase) for overwrite, then defaults (skip API key)
    mockReadlineResponses(['Y', '', '', '', '', '']);

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);
  });

  it('should trim whitespace from user input', async () => {
    // Mock responses with extra whitespace (skip API key)
    mockReadlineResponses([
      '  My Project  ',
      '  ./src  ',
      '  ./docs  ',
      '  map.json  ',
      '',
    ]);

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    // Values should be trimmed
    expect(config.projectName).toBe('My Project');
    expect(config.projectRoot).toBe('./src');
    expect(config.docsFolder).toBe('./docs');
    expect(config.mapFile).toBe('map.json');
  });

  it('should use project directory name as default project name', async () => {
    // Mock empty responses (all defaults, skip API key)
    mockReadlineResponses(['', '', '', '', '']);

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    // Should use the test directory name
    expect(config.projectName).toBe('test-cli-init');
  });

  it('should handle errors gracefully', async () => {
    // Mock readline to throw an error
    vi.mocked(readline.createInterface).mockImplementation(() => {
      throw new Error('Readline error');
    });

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Readline error');
    expect(result.configPath).toBeUndefined();
  });

  it('should save all required fields in config', async () => {
    mockReadlineResponses(['Test', './root', './docs', 'map.json', '']);

    await initCommand({ verbose: false });

    const configContent = readFileSync(configPath, 'utf-8');
    const config: DoctypeConfig = JSON.parse(configContent);

    // Verify all required fields are present
    expect(config).toHaveProperty('projectName');
    expect(config).toHaveProperty('projectRoot');
    expect(config).toHaveProperty('docsFolder');
    expect(config).toHaveProperty('mapFile');

    // Verify no extra fields
    expect(Object.keys(config)).toHaveLength(4);
  });

  // Tests for API key handling

  it('should save API key to .env file when provided', async () => {
    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'sk-test-api-key-12345']);

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);

    // Verify .env file was created
    expect(existsSync(envPath)).toBe(true);

    // Verify .env content
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('OPENAI_API_KEY=sk-test-api-key-12345\n');

    // Verify API key is NOT in config file
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).not.toContain('sk-test-api-key');
  });

  it('should not create .env file when API key is skipped', async () => {
    mockReadlineResponses(['Test', '.', './docs', 'map.json', '']);

    const result = await initCommand({ verbose: false });

    expect(result.success).toBe(true);
    expect(existsSync(envPath)).toBe(false);
  });

  it('should update existing .env file with new API key', async () => {
    // Create existing .env with different key
    writeFileSync(envPath, 'OPENAI_API_KEY=old-api-key\n');

    // Now it asks if we want to replace the existing key, so we need to answer 'yes' and then provide the new key
    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'yes', 'sk-new-api-key']);

    await initCommand({ verbose: false });

    // Verify .env was updated
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('OPENAI_API_KEY=sk-new-api-key\n');
    expect(envContent).not.toContain('old-api-key');
  });

  it('should append API key to existing .env without OPENAI_API_KEY', async () => {
    // Create existing .env with other variables
    writeFileSync(envPath, 'NODE_ENV=production\nDEBUG=true\n');

    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'sk-test-key']);

    await initCommand({ verbose: false });

    // Verify .env was appended
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toContain('NODE_ENV=production');
    expect(envContent).toContain('DEBUG=true');
    expect(envContent).toContain('OPENAI_API_KEY=sk-test-key');
    expect(envContent.split('\n').length).toBe(4); // 3 lines + final newline
  });

  it('should handle .env file with missing final newline', async () => {
    // Create existing .env without final newline
    writeFileSync(envPath, 'NODE_ENV=production');

    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'sk-test-key']);

    await initCommand({ verbose: false });

    // Verify .env has proper formatting
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('NODE_ENV=production\nOPENAI_API_KEY=sk-test-key\n');
  });

  it('should trim whitespace from API key input', async () => {
    mockReadlineResponses(['Test', '.', './docs', 'map.json', '  sk-test-key  ']);

    await initCommand({ verbose: false });

    // Verify API key was trimmed
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('OPENAI_API_KEY=sk-test-key\n');
  });

  it('should detect existing API key and ask to replace it - user keeps existing', async () => {
    // Create existing .env with API key
    writeFileSync(envPath, 'OPENAI_API_KEY=sk-existing-key\n');

    // Mock responses: config values, then 'no' to keep existing key
    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'no']);

    await initCommand({ verbose: false });

    // Verify existing API key was kept
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('OPENAI_API_KEY=sk-existing-key\n');
  });

  it('should detect existing API key and ask to replace it - user replaces', async () => {
    // Create existing .env with API key
    writeFileSync(envPath, 'OPENAI_API_KEY=sk-old-key\n');

    // Mock responses: config values, then 'yes' to replace, then new key
    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'yes', 'sk-new-key']);

    await initCommand({ verbose: false });

    // Verify API key was replaced
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('OPENAI_API_KEY=sk-new-key\n');
    expect(envContent).not.toContain('sk-old-key');
  });

  it('should handle case-insensitive response for replacing existing key', async () => {
    // Create existing .env with API key
    writeFileSync(envPath, 'OPENAI_API_KEY=sk-old-key\n');

    // Mock responses: config values, then 'Y' (uppercase) to replace, then new key
    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'Y', 'sk-new-key']);

    await initCommand({ verbose: false });

    // Verify API key was replaced
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toBe('OPENAI_API_KEY=sk-new-key\n');
  });

  it('should preserve other env variables when replacing API key', async () => {
    // Create existing .env with API key and other variables
    writeFileSync(envPath, 'NODE_ENV=production\nOPENAI_API_KEY=sk-old-key\nDEBUG=true\n');

    // Mock responses: config values, then 'yes' to replace, then new key
    mockReadlineResponses(['Test', '.', './docs', 'map.json', 'yes', 'sk-new-key']);

    await initCommand({ verbose: false });

    // Verify API key was replaced but other variables preserved
    const envContent = readFileSync(envPath, 'utf-8');
    expect(envContent).toContain('NODE_ENV=production');
    expect(envContent).toContain('DEBUG=true');
    expect(envContent).toContain('OPENAI_API_KEY=sk-new-key');
    expect(envContent).not.toContain('sk-old-key');
  });
});
