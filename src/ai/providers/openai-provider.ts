/**
 * OpenAI provider implementation
 */

import { BaseAIProvider } from './base-provider';
import {
  AIProvider,
  AIModel,
  DocumentationRequest,
  DocumentationResponse,
  AIProviderError,
} from '../types';
import { PromptBuilder } from '../prompt-builder';

/**
 * OpenAI API response structure
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI error response structure
 */
interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * OpenAI provider for generating documentation
 */
export class OpenAIProvider extends BaseAIProvider {
  private static readonly DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'gpt-4';
  private static readonly DEFAULT_MAX_TOKENS = 2000;
  private static readonly DEFAULT_TEMPERATURE = 0.3;

  constructor(model: AIModel, timeout?: number, debug?: boolean) {
    super(model, timeout, debug);
  }

  get provider(): AIProvider {
    return 'openai';
  }

  /**
   * Generate documentation using OpenAI API
   */
  async generateDocumentation(request: DocumentationRequest): Promise<DocumentationResponse> {
    this.log('Generating documentation with OpenAI', {
      symbol: request.symbolName,
      model: this.model.modelId,
    });

    try {
      // Build the prompt
      const systemPrompt = PromptBuilder.buildSystemPrompt();
      const userPrompt = PromptBuilder.buildUserPrompt(request, {
        includeContext: true,
        includeExamples: true,
        style: 'detailed',
      });

      this.log('System prompt:', systemPrompt.substring(0, 100) + '...');
      this.log('User prompt length:', userPrompt.length);

      // Make API request
      const endpoint = this.model.endpoint || OpenAIProvider.DEFAULT_ENDPOINT;
      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.model.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model.modelId || OpenAIProvider.DEFAULT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.model.maxTokens || OpenAIProvider.DEFAULT_MAX_TOKENS,
          temperature: this.model.temperature ?? OpenAIProvider.DEFAULT_TEMPERATURE,
        }),
      });

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json() as OpenAIError;
        throw this.createError(
          errorData.error.code || 'API_ERROR',
          errorData.error.message,
          errorData
        );
      }

      // Parse successful response
      const data = await response.json() as OpenAIResponse;

      this.log('OpenAI response received:', {
        model: data.model,
        usage: data.usage,
      });

      if (!data.choices || data.choices.length === 0) {
        throw this.createError(
          'EMPTY_RESPONSE',
          'OpenAI returned no choices'
        );
      }

      const content = data.choices[0].message.content.trim();

      return {
        content,
        provider: 'openai',
        modelId: this.model.modelId || OpenAIProvider.DEFAULT_MODEL,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      this.log('Error generating documentation:', error);

      if ((error as AIProviderError).provider) {
        // Already an AIProviderError
        throw error;
      }

      // Wrap unknown errors
      throw this.createError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      );
    }
  }

  /**
   * Validate OpenAI API key and connection
   */
  async validateConnection(): Promise<boolean> {
    this.log('Validating OpenAI connection');

    try {
      const endpoint = 'https://api.openai.com/v1/models';
      const response = await this.makeRequest(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.model.apiKey}`,
        },
      });

      const isValid = response.ok;
      this.log('Connection validation:', isValid ? 'success' : 'failed');

      return isValid;
    } catch (error) {
      this.log('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const endpoint = 'https://api.openai.com/v1/models';
      const response = await this.makeRequest(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.model.apiKey}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { data: Array<{ id: string }> };
      return data.data.map(model => model.id);
    } catch {
      return [];
    }
  }
}
