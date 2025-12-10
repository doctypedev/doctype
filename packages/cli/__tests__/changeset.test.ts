import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { changesetCommand } from '../src/commands/changeset';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Mock child_process.execSync
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

// Mock @sintesi/core to avoid native binding issues
vi.mock('@sintesi/core', () => {
  return {
    ASTAnalyzer: vi.fn().mockImplementation(() => ({
      analyzeFile: vi.fn().mockResolvedValue([]),
    })),
  };
});

describe('CLI: changeset command', () => {
  let originalCwd: string;
  let testDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = join(originalCwd, 'test-changeset-repo');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    // Mock process.cwd
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    // process.chdir(testDir); // Not supported in workers

    // Initialize a dummy git repository
    (execSync as vi.Mock).mockClear(); // Clear mocks before setting up git
    (execSync as vi.Mock).mockImplementation((command: string) => {
      if (command.startsWith('git init')) {
        return '';
      }
      if (command.startsWith('git config')) {
        return '';
      }
      if (command.startsWith('git add')) {
        return '';
      }
      if (command.startsWith('git commit')) {
        return '';
      }
      if (command.startsWith('git rev-parse --git-dir')) {
        return '.git';
      }
      // Mock git merge-base and diff to return empty/no changes
      if (command.startsWith('git merge-base')) {
        return '';
      }
      if (command.startsWith('git diff')) {
        return '';
      }
      if (command.startsWith('git show')) {
        return ''; // No content
      }
      if (command.startsWith('git fetch')) {
        console.log(`Mocking git fetch: ${command}`); // For debugging
        return '';
      }
      return actualExecSync(command); // Use actual for other commands if needed
    });

    // Need a real execSync reference for commands not mocked
    const actualExecSync = vi.fn((cmd: string) => {
      try {
        return originalExecSync(cmd);
      } catch (e: any) {
        throw new Error(`Command failed: ${cmd}\n${e.message}`);
      }
    });

    // Mock git init
    execSync('git init -b main');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');
    writeFileSync('test.ts', 'export function foo() {}');
    execSync('git add .');
    execSync('git commit -m "initial commit"');
  });

  afterEach(() => {
    // process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks(); // Restore all mocks to original implementation
  });

  it('should not fetch from origin/main by default', async () => {
    (execSync as vi.Mock).mockClear(); // Clear mocks again to only count calls within the test

    await changesetCommand({
      baseBranch: 'main',
      noAI: true, // Speed up test by skipping AI
    });

    const fetchCalls = (execSync as vi.Mock).mock.calls.filter(call =>
      (call[0] as string).includes('git fetch origin main')
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it('should fetch from origin/main when forceFetch is true', async () => {
    (execSync as vi.Mock).mockClear(); // Clear mocks again to only count calls within the test

    await changesetCommand({
      baseBranch: 'main',
      noAI: true,
      forceFetch: true,
    });

    const fetchCalls = (execSync as vi.Mock).mock.calls.filter(call =>
      (call[0] as string).includes('git fetch origin main')
    );
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0][0]).toBe('git fetch origin main');

    // Also verify that subsequent git diff/show calls use origin/main
    const diffCalls = (execSync as vi.Mock).mock.calls.filter(call =>
      (call[0] as string).startsWith('git diff origin/main') ||
      (call[0] as string).startsWith('git merge-base origin/main')
    );
    // Depending on implementation details, it might call merge-base or diff directly
    // checking for at least one call that uses origin/main
    expect(diffCalls.length).toBeGreaterThan(0);
  });

  it('should fetch from specified base branch when forceFetch is true', async () => {
    (execSync as vi.Mock).mockClear();

    await changesetCommand({
      baseBranch: 'develop',
      noAI: true,
      forceFetch: true,
    });

    const fetchCalls = (execSync as vi.Mock).mock.calls.filter(call =>
      (call[0] as string).includes('git fetch origin develop')
    );
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0][0]).toBe('git fetch origin develop');
  });
});

// Store original execSync to be able to call it if needed for git setup
const originalExecSync = execSync;
