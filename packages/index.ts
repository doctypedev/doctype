/**
 * Doctype - The Self-Maintaining Documentation System
 *
 * Main entry point for the Doctype library
 */

// Core AST & Drift Detection
export { ASTAnalyzer } from './core/ast-analyzer';
export { SignatureHasher } from './core/signature-hasher';
export { scanAndCreateAnchors, determineOutputFile } from './core/init-orchestrator';
export type { InitConfig, ScanResult, OutputStrategy, ProgressCallback } from './core/init-orchestrator';
export { SymbolType, discoverFiles } from '@doctypedev/core';
export type {
  CodeRef,
  CodeSignature,
  SignatureHash,
  DocRef,
  DoctypeMapEntry,
  DoctypeMap,
  FileDiscoveryResult,
  FileDiscoveryOptions,
} from '@doctypedev/core';

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
