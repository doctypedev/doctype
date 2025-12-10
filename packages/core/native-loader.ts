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
  'linux-x64': '@doctypedev/core-linux-x64-gnu',
  'win32-x64': '@doctypedev/core-win32-x64-msvc',
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
  const platform = `${os.platform()}-${os.arch()}`;
  const isSupported = !!PLATFORM_PACKAGES[platform];
  const isTestMode = process.env.VITEST || process.env.NODE_ENV === 'test';

  // Development/Test mode: try to load from local crates/core first
  // This allows CI to build and test the native module on any platform
  if (process.env.NODE_ENV !== 'production') {
    try {
      // __dirname is packages/core/dist, so we need to go up 3 levels to reach crates/core
      const localPath = path.join(__dirname, '../../../crates/core');
      return require(localPath);
    } catch (err) {
      // If local load fails in test mode on unsupported platform, return mock
      if (!isSupported && isTestMode) {
        // Return a mock object for testing on unsupported platforms without local build
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
            analyzeFile() { return []; }
            analyzeCode() { return []; }
            analyzeWithErrors() { return { signatures: [], errors: [] }; }
          },
          // Markdown extraction mocks
          extractAnchors: () => ({
            anchors: [],
            anchorCount: 0,
            errors: [],
          }),
          validateMarkdownAnchors: () => [],
          parseCodeRef: (ref: string) => {
            const [filePath, symbolName] = ref.split('#');
            return { filePath, symbolName };
          },
        };
      }
      // Fall through to platform-specific package
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

// Re-export types
import type * as CoreTypes from './native-types';

export type CodeRef = CoreTypes.CodeRef;
// ... (other types)

// Export values with types
const {
  SymbolType: SymbolTypeVal,
  discoverFiles: discoverFilesVal,
  helloWorld: helloWorldVal,
  getVersion: getVersionVal,
  AstAnalyzer: AstAnalyzerVal,
  extractAnchors: extractAnchorsVal,
  validateMarkdownAnchors: validateMarkdownAnchorsVal,
  parseCodeRef: parseCodeRefVal,
  getProjectContext: getProjectContextVal,
} = nativeModule;

export const SymbolType = SymbolTypeVal;
export const discoverFiles = discoverFilesVal as typeof CoreTypes.discoverFiles;
export const helloWorld = helloWorldVal as typeof CoreTypes.helloWorld;
export const getVersion = getVersionVal as typeof CoreTypes.getVersion;
export const AstAnalyzer = AstAnalyzerVal as typeof CoreTypes.AstAnalyzer;
export const extractAnchors = extractAnchorsVal as typeof CoreTypes.extractAnchors;
export const validateMarkdownAnchors = validateMarkdownAnchorsVal as typeof CoreTypes.validateMarkdownAnchors;
export const parseCodeRef = parseCodeRefVal as typeof CoreTypes.parseCodeRef;
export const getProjectContext = getProjectContextVal as typeof CoreTypes.getProjectContext;

export type CodeSignature = CoreTypes.CodeSignature;
export type SignatureHash = CoreTypes.SignatureHash;
export type DocRef = CoreTypes.DocRef;
export type DoctypeMapEntry = CoreTypes.DoctypeMapEntry;
export type DoctypeMap = CoreTypes.DoctypeMap;
export type FileDiscoveryResult = CoreTypes.FileDiscoveryResult;
export type FileDiscoveryOptions = CoreTypes.FileDiscoveryOptions;

// Markdown extraction types
export type DoctypeAnchor = CoreTypes.DoctypeAnchor;
export type ExtractionResult = CoreTypes.ExtractionResult;
export type CodeRefParts = CoreTypes.CodeRefParts;

// Project Context types
export type ProjectContext = CoreTypes.ProjectContext;
export type FileContext = CoreTypes.FileContext;
export type PackageJson = CoreTypes.PackageJson;

// Export SymbolType as a type (it's a const enum in the .d.ts)
export type { SymbolType as SymbolTypeValue } from './native-types';
