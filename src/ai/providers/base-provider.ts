/**
 * Base provider class for AI integrations
 */

import {
  AIProvider,
  DocumentationRequest,
  DocumentationResponse,
  IAIProvider,
  AIModel,
  AIProviderError,
} from '../types';

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider implements IAIProvider {
  protected model: AIModel;
  protected timeout: number;
  protected debug: boolean;

  constructor(model: AIModel, timeout: number = 30000, debug: boolean = false) {
    this.model = model;
    this.timeout = timeout;
    this.debug = debug;
  }

  /**
   * Provider name (implemented by subclass)
   */
  abstract get provider(): AIProvider;

  /**
   * Generate documentation (implemented by subclass)
   */
  abstract generateDocumentation(request: DocumentationRequest): Promise<DocumentationResponse>;

  /**
   * Validate connection (implemented by subclass)
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * Log debug messages
   */
  protected log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[${this.provider}]`, message, ...args);
    }
  }

  /**
   * Create a standardized error
   */
  protected createError(code: string, message: string, originalError?: unknown): AIProviderError {
    return {
      code,
      message,
      provider: this.provider,
      originalError,
    };
  }

  /**
   * Make HTTP request with timeout
   */
  protected async makeRequest(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError(
          'TIMEOUT',
          `Request timed out after ${this.timeout}ms`,
          error
        );
      }

      throw this.createError(
        'NETWORK_ERROR',
        'Network request failed',
        error
      );
    }
  }
}
