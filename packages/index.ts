/**
 * Doctype - The Self-Maintaining Documentation System
 *
 * Main entry point for the Doctype library
 */

// Core AST & Drift Detection
export {
  ASTAnalyzer,
  SignatureHasher,
  scanAndCreateAnchors,
  determineOutputFile,
  SymbolType,
  discoverFiles,
  helloWorld,
  getVersion,
} from './core';

export type {
  InitConfig,
  ScanResult,
  OutputStrategy,
  ProgressCallback,
  CodeRef,
  CodeSignature,
  SignatureHash,
  DocRef,
  DoctypeMapEntry,
  DoctypeMap,
  FileDiscoveryResult,
  FileDiscoveryOptions,
} from './core';

// Content & Mapping
export { MarkdownParser, DoctypeMapManager, ContentInjector } from './content';
export type { DoctypeAnchor, InjectionResult } from './content';

// Gen AI Agent
export { AIAgent, createOpenAIAgent, createAgentFromEnv, PromptBuilder } from './ai';
export type {
  AIProvider,
  AIModel,
  AIAgentConfig,
  DocumentationRequest,
  DocumentationResponse,
  GenerateOptions,
  IAIProvider,
  AIProviderError,
} from './ai';
