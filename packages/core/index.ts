/**
 * Core module exports
 *
 * This module exports both TypeScript implementations and Rust native bindings.
 */

// Import Rust analyzer
import { AstAnalyzer as RustAstAnalyzer } from './native-loader';

// Re-export with TypeScript-compatible name for backward compatibility
export { RustAstAnalyzer as ASTAnalyzer };

// Rust native bindings (loaded via platform-specific package)
export {
  SymbolType,
  discoverFiles,
  helloWorld,
  getVersion,
  AstAnalyzer, // Also export with Rust name
  // Markdown extraction (Rust-powered)
  extractAnchors,
  validateMarkdownAnchors,
  parseCodeRef,
  // Project Context
  getProjectContext,
} from './native-loader';

export type {
  CodeRef,
  CodeSignature,
  SignatureHash,
  DocRef,
  DoctypeMapEntry,
  DoctypeMap,
  FileDiscoveryResult,
  FileDiscoveryOptions,
  SymbolTypeValue,
  // Markdown extraction types
  DoctypeAnchor,
  ExtractionResult,
  CodeRefParts,
  // Project Context types
  ProjectContext,
  FileContext,
  PackageJson,
} from './native-loader';
