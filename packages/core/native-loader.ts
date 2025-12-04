/**
 * Native module loader for @doctypedev/core
 *
 * This module loads the correct platform-specific NAPI binary.
 * Binaries are published as separate packages for each supported platform.
 *
 * Supported platforms:
 * - @doctypedev/core-darwin-arm64 (macOS Apple Silicon)
 * - @doctypedev/core-darwin-x64 (macOS Intel)
 * - @doctypedev/core-linux-x64 (Linux x64)
 * - @doctypedev/core-linux-arm64 (Linux ARM64)
 * - @doctypedev/core-win32-x64 (Windows x64)
 */

import * as os from 'os';
import * as path from 'path';

// Platform to package name mapping
const PLATFORM_PACKAGES: Record<string, string> = {
  'darwin-arm64': '@doctypedev/core-darwin-arm64',
};

/**
 * Get the platform-specific package name
 */
function getPlatformPackageName(): string {
  const platform = os.platform();
  const arch = os.arch();
  const key = `${platform}-${arch}`;
  const packageName = PLATFORM_PACKAGES[key];

  if (!packageName) {
    const supported = Object.keys(PLATFORM_PACKAGES).join(', ');
    throw new Error(
      `Unsupported platform: ${platform}-${arch}\n` +
      `Supported platforms: ${supported}\n` +
      `Please file an issue at: https://github.com/doctypedev/doctype/issues`
    );
  }

  return packageName;
}

/**
 * Load the native module
 */
function loadNativeModule(): any {
  // Test mode: return mock for unsupported platforms
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    const platform = `${os.platform()}-${os.arch()}`;
    if (!PLATFORM_PACKAGES[platform]) {
      // Return a mock object for testing on unsupported platforms
      return {
        SymbolType: {
          Function: 'Function',
          Class: 'Class',
          Interface: 'Interface',
          TypeAlias: 'TypeAlias',
          Enum: 'Enum',
          Variable: 'Variable',
          Const: 'Const',
        },
        discoverFiles: () => ({
          markdownFiles: [],
          sourceFiles: [],
          totalFiles: 0,
          errors: 0,
        }),
        helloWorld: () => 'mock hello',
        getVersion: () => '0.0.0-mock',
        AstAnalyzer: class MockAstAnalyzer {
          analyzeFile() { return 'mock'; }
          getSymbols() { return []; }
        },
      };
    }
  }

  // Development mode: try to load from local crates/core first
  if (process.env.NODE_ENV !== 'production') {
    try {
      const localPath = path.join(__dirname, '../../crates/core');
      return require(localPath);
    } catch (err) {
      // Fall through to platform-specific package
      // This is expected when running tests or in CI without local build
    }
  }

  // Production mode: load from platform-specific package
  const packageName = getPlatformPackageName();

  try {
    return require(packageName);
  } catch (err) {
    const installHint = `npm install ${packageName}`;
    throw new Error(
      `Failed to load native module for your platform.\n\n` +
      `Platform: ${os.platform()}-${os.arch()}\n` +
      `Package: ${packageName}\n\n` +
      `This usually means the package was not installed correctly.\n` +
      `Try running: ${installHint}\n\n` +
      `If the problem persists, please file an issue at:\n` +
      `https://github.com/doctypedev/doctype/issues\n\n` +
      `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// Export the loaded module
const nativeModule = loadNativeModule();

// Re-export all exports from the native module
export const {
  SymbolType,
  discoverFiles,
  helloWorld,
  getVersion,
  AstAnalyzer,
} = nativeModule;

// Re-export types
// In development, types come from local native-types.d.ts
// In production, they come from the platform-specific package (all have same types)
import type * as CoreTypes from './native-types';

export type CodeRef = CoreTypes.CodeRef;
export type CodeSignature = CoreTypes.CodeSignature;
export type SignatureHash = CoreTypes.SignatureHash;
export type DocRef = CoreTypes.DocRef;
export type DoctypeMapEntry = CoreTypes.DoctypeMapEntry;
export type DoctypeMap = CoreTypes.DoctypeMap;
export type FileDiscoveryResult = CoreTypes.FileDiscoveryResult;
export type FileDiscoveryOptions = CoreTypes.FileDiscoveryOptions;

// Export SymbolType as a type (it's a const enum in the .d.ts)
export type { SymbolType as SymbolTypeValue } from './native-types';
