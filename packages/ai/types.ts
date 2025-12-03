/**
 * Type definitions for AI Agent module
 */

import { CodeSignature } from '../core/native-loader';

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'gemini';

/**
 * AI model configuration
 */
export interface AIModel {
  /** Provider name (openai, gemini) */
  provider: AIProvider;

  /** Model identifier (e.g., 'gpt-4', 'gemini-1.5-pro') */
  modelId: string;

  /** API key for authentication */
  apiKey: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature for response randomness (0-1) */
  temperature?: number;

  /** API endpoint (optional, for custom endpoints) */
  endpoint?: string;
}

/**
 * Request to generate documentation
 */
export interface DocumentationRequest {
  /** Symbol name being documented */
  symbolName: string;

  /** Previous code signature (before change) */
  oldSignature: CodeSignature;

  /** Current code signature (after change) */
  newSignature: CodeSignature;

  /** Previous documentation content */
  oldDocumentation: string;

  /** Additional context (optional) */
  context?: {
    /** File path of the code */
    filePath?: string;

    /** Surrounding code context */
    surroundingCode?: string;

    /** Related symbols */
    relatedSymbols?: string[];
  };
}

/**
 * Response from AI provider
 */
export interface DocumentationResponse {
  /** Generated documentation content */
  content: string;

  /** Provider that generated the response */
  provider: AIProvider;

  /** Model used */
  modelId: string;

  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Generation timestamp */
  timestamp: number;
}

/**
 * Error from AI provider
 */
export interface AIProviderError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Provider name */
  provider: AIProvider;

  /** Original error (if available) */
  originalError?: unknown;
}

/**
 * Configuration for AI Agent
 */
export interface AIAgentConfig {
  /** AI model configuration */
  model: AIModel;

  /** Enable debug logging */
  debug?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * Abstract base class for AI providers
 */
export interface IAIProvider {
  /** Provider name */
  readonly provider: AIProvider;

  /**
   * Generate documentation for a code change
   */
  generateDocumentation(request: DocumentationRequest): Promise<DocumentationResponse>;

  /**
   * Validate API key and connection
   */
  validateConnection(): Promise<boolean>;
}

/**
 * Options for generating documentation
 */
export interface GenerateOptions {
  /** Include code context */
  includeContext?: boolean;

  /** Include usage examples */
  includeExamples?: boolean;

  /** Maximum length of documentation */
  maxLength?: number;

  /** Documentation style (concise, detailed, tutorial) */
  style?: 'concise' | 'detailed' | 'tutorial';
}
