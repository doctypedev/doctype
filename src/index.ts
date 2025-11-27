/**
 * Doctype - The Self-Maintaining Documentation System
 *
 * Main entry point for the Doctype library
 */

// Phase 1: Core AST & Drift Detection
export { ASTAnalyzer } from './core/ast-analyzer';
export { SignatureHasher } from './core/signature-hasher';
export { SymbolType } from './core/types';
export type {
  CodeRef,
  CodeSignature,
  SignatureHash,
  DocRef,
  DoctypeMapEntry,
  DoctypeMap,
} from './core/types';

// Phase 2: Content & Mapping
export { MarkdownParser, DoctypeMapManager, ContentInjector } from './content';
export type { DoctypeAnchor, InjectionResult } from './content';
