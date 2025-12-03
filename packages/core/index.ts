/**
 * Core module exports
 *
 * This module exports both TypeScript implementations and Rust native bindings.
 */

// TypeScript implementations
export { ASTAnalyzer } from './ast-analyzer';
export { SignatureHasher } from './signature-hasher';

// Rust native bindings (loaded via platform-specific package)
export {
  SymbolType,
  discoverFiles,
  helloWorld,
  getVersion,
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
} from './native-loader';
