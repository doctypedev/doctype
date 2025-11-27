/**
 * Main AI Agent orchestrator for documentation generation
 */

import {
  AIAgentConfig,
  DocumentationRequest,
  DocumentationResponse,
  GenerateOptions,
  IAIProvider,
  AIProviderError,
} from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { CodeSignature } from '../core/types';

/**
 * AI Agent for generating documentation from code changes
 */
export class AIAgent {
  private provider: IAIProvider;
  private config: AIAgentConfig;
  private retryConfig: { maxAttempts: number; delayMs: number };

  constructor(config: AIAgentConfig) {
    this.config = config;
    this.retryConfig = config.retry || { maxAttempts: 3, delayMs: 1000 };

    // Initialize the appropriate provider
    this.provider = this.createProvider();
  }

  /**
   * Create provider based on configuration
   */
  private createProvider(): IAIProvider {
    const { model, timeout, debug } = this.config;

    switch (model.provider) {
      case 'openai':
        return new OpenAIProvider(model, timeout, debug);

      case 'gemini':
        // TODO: Implement Gemini provider in future
        throw new Error('Gemini provider not yet implemented. Please use OpenAI for now.');

      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Generate documentation for a code change
   */
  async generateDocumentation(
    request: DocumentationRequest,
    _options: GenerateOptions = {}
  ): Promise<DocumentationResponse> {
    this.log('Generating documentation', {
      symbol: request.symbolName,
      provider: this.provider.provider,
    });

    // TODO: Use options to customize generation (currently passed to provider)
    return this.executeWithRetry(() =>
      this.provider.generateDocumentation(request)
    );
  }

  /**
   * Generate documentation from a map entry and current signature
   */
  async generateFromDrift(
    symbolName: string,
    oldSignature: CodeSignature,
    newSignature: CodeSignature,
    oldDocumentation: string,
    filePath?: string
  ): Promise<string> {
    const request: DocumentationRequest = {
      symbolName,
      oldSignature,
      newSignature,
      oldDocumentation,
      context: filePath ? { filePath } : undefined,
    };

    const response = await this.generateDocumentation(request);
    return response.content;
  }

  /**
   * Generate initial documentation for a symbol (no previous docs)
   */
  async generateInitial(
    symbolName: string,
    signature: CodeSignature,
    options: GenerateOptions = {}
  ): Promise<string> {
    // Create a simple request with just the new signature
    const request: DocumentationRequest = {
      symbolName,
      oldSignature: signature, // Use same as old for initial docs
      newSignature: signature,
      oldDocumentation: '', // No previous documentation
    };

    const response = await this.generateDocumentation(request, options);
    return response.content;
  }

  /**
   * Validate the AI provider connection
   */
  async validateConnection(): Promise<boolean> {
    this.log('Validating provider connection');

    try {
      return await this.provider.validateConnection();
    } catch (error) {
      this.log('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      const hasAttemptsLeft = attempt < this.retryConfig.maxAttempts;

      if (isRetryable && hasAttemptsLeft) {
        this.log(`Attempt ${attempt} failed, retrying in ${this.retryConfig.delayMs}ms...`);

        await this.delay(this.retryConfig.delayMs);
        return this.executeWithRetry(fn, attempt + 1);
      }

      // No more retries or non-retryable error
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if ((error as AIProviderError).code) {
      const providerError = error as AIProviderError;

      // Retry on timeout, rate limit, and network errors
      return ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'].includes(providerError.code);
    }

    return false;
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log debug messages
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[AIAgent]', message, ...args);
    }
  }

  /**
   * Get the current provider name
   */
  getProvider(): string {
    return this.provider.provider;
  }

  /**
   * Get a summary of configuration
   */
  getConfig(): { provider: string; model: string; timeout: number } {
    return {
      provider: this.config.model.provider,
      model: this.config.model.modelId,
      timeout: this.config.timeout || 30000,
    };
  }
}

/**
 * Factory function to create an AI Agent with OpenAI
 */
export function createOpenAIAgent(
  apiKey: string,
  modelId: string = 'gpt-4',
  options: {
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    debug?: boolean;
  } = {}
): AIAgent {
  return new AIAgent({
    model: {
      provider: 'openai',
      modelId,
      apiKey,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    },
    timeout: options.timeout,
    debug: options.debug,
  });
}

/**
 * Factory function to create an AI Agent from environment variables
 */
export function createAgentFromEnv(
  options: {
    modelId?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    debug?: boolean;
  } = {}
): AIAgent {
  // Check for OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    return createOpenAIAgent(
      openaiKey,
      options.modelId || 'gpt-4',
      options
    );
  }

  // Check for Gemini API key (future)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    throw new Error('Gemini provider not yet implemented. Please use OPENAI_API_KEY.');
  }

  throw new Error(
    'No API key found. Please set OPENAI_API_KEY or GEMINI_API_KEY environment variable.'
  );
}
