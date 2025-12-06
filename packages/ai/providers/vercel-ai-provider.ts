import { IAIProvider, AIProvider, DocumentationRequest, DocumentationResponse, AIModel, AIProviderError, BatchDocumentationResult } from '../types';
import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { PromptBuilder } from '../prompt-builder';
import { sanitizeContent, validateSanitizedContent } from '../content-sanitizer';
import { z } from 'zod';

export class VercelAIProvider implements IAIProvider {
  readonly provider: AIProvider;
  private modelConfig: AIModel;
  private debug: boolean;

  constructor(config: AIModel, debug: boolean = false) {
    this.provider = config.provider;
    this.modelConfig = config;
    this.debug = debug;
  }

  private getModel() {
    switch (this.provider) {
      case 'openai': {
        // Use createOpenAI for explicit configuration without env vars
        const provider = createOpenAI({
          apiKey: this.modelConfig.apiKey,
          baseURL: this.modelConfig.endpoint, // Custom endpoint if provided
        });
        return provider(this.modelConfig.modelId);
      }
      case 'gemini': {
        const provider = createGoogleGenerativeAI({
          apiKey: this.modelConfig.apiKey,
        });
        return provider(this.modelConfig.modelId);
      }
      case 'anthropic': {
        const provider = createAnthropic({
          apiKey: this.modelConfig.apiKey,
        });
        return provider(this.modelConfig.modelId);
      }
      case 'mistral': {
        const provider = createMistral({
          apiKey: this.modelConfig.apiKey,
        });
        return provider(this.modelConfig.modelId);
      }
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  async generateDocumentation(request: DocumentationRequest): Promise<DocumentationResponse> {
    const model = this.getModel();
    
    // Use PromptBuilder to construct the prompt
    let prompt: string;
    
    // Check if this is an update or initial generation
    // We consider it initial if there's no old documentation provided
    // (This logic aligns with how PromptBuilder distinguishes use cases)
    if (!request.oldDocumentation) {
        prompt = PromptBuilder.buildInitialPrompt(
            request.symbolName,
            request.newSignature.signatureText,
            { includeExamples: true } // Default options, could be passed in
        );
    } else {
        prompt = PromptBuilder.buildUserPrompt(request, { includeExamples: true });
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt();

    try {
      const options: any = {
        model,
        prompt,
        system: systemPrompt,
      };
      
      if (this.modelConfig.maxTokens) {
        options.maxTokens = this.modelConfig.maxTokens;
      }
      
      if (this.modelConfig.temperature !== undefined) {
        options.temperature = this.modelConfig.temperature;
      }

      const { text, usage } = await generateText(options);
      const usageAny = usage as any;

      // Sanitize output to preserve document structure and prevent anchor tag corruption
      const sanitizedText = sanitizeContent(text);

      // Validate that sanitization was successful
      const validationErrors = validateSanitizedContent(sanitizedText);
      if (validationErrors.length > 0) {
        const errorMessage = `Content validation failed after sanitization: ${validationErrors.join(', ')}`;

        if (this.debug) {
          console.warn('[VercelAIProvider] Validation warnings:', validationErrors);
          console.warn('[VercelAIProvider] Original text:', text);
          console.warn('[VercelAIProvider] Sanitized text:', sanitizedText);
        }

        // Throw error to prevent corrupted content from being injected
        throw new Error(errorMessage);
      }

      return {
        content: sanitizedText,
        provider: this.provider,
        modelId: this.modelConfig.modelId,
        timestamp: Date.now(),
        usage: usage ? {
          promptTokens: usageAny.promptTokens || 0,
          completionTokens: usageAny.completionTokens || 0,
          totalTokens: usageAny.totalTokens || 0,
        } : undefined,
      };
    } catch (error) {
      const err = error as any;
      const providerError: AIProviderError = {
        code: 'GENERATION_FAILED',
        message: err.message || 'Unknown error during generation',
        provider: this.provider,
        originalError: error,
      };
      
      // Map common error codes if possible
      if (err.name === 'APICallError' && err.statusCode === 429) {
          providerError.code = 'RATE_LIMIT';
      }

      throw providerError;
    }
  }

  async generateBatchDocumentation(
    items: Array<{ symbolName: string; signatureText: string }>
  ): Promise<BatchDocumentationResult> {
    const model = this.getModel();
    const prompt = PromptBuilder.buildBatchPrompt(items);
    const systemPrompt = PromptBuilder.buildSystemPrompt();

    try {
      const options: any = {
        model,
        prompt,
        system: systemPrompt,
        schema: z.object({
          documentations: z.array(
            z.object({
              symbolName: z.string(),
              content: z.string(),
            })
          ),
        }),
      };

      // Increase token limit for batches
      if (this.modelConfig.maxTokens) {
        options.maxTokens = this.modelConfig.maxTokens * items.length;
      } else {
         // Default generous limit for batches if not specified
         options.maxTokens = 4096;
      }

      if (this.modelConfig.temperature !== undefined) {
        options.temperature = this.modelConfig.temperature;
      }

      const result: any = await generateObject(options);

      // Collect successes and failures separately (partial success pattern)
      const success: Array<{ symbolName: string; content: string }> = [];
      const failures: Array<{ symbolName: string; errors: string[]; originalContent?: string }> = [];

      // Process each documentation entry
      result.object.documentations.forEach((doc: any) => {
        const sanitizedContent = sanitizeContent(doc.content);

        // Validate sanitized content
        const validationErrors = validateSanitizedContent(sanitizedContent);

        if (validationErrors.length > 0) {
          // Validation failed - collect the failure but continue processing others
          failures.push({
            symbolName: doc.symbolName,
            errors: validationErrors,
            originalContent: this.debug ? doc.content : undefined,
          });

          if (this.debug) {
            console.warn(`[VercelAIProvider] Validation failed for ${doc.symbolName}:`, validationErrors);
            console.warn('[VercelAIProvider] Original content:', doc.content);
            console.warn('[VercelAIProvider] Sanitized content:', sanitizedContent);
          }
        } else {
          // Validation passed - collect the success
          success.push({
            symbolName: doc.symbolName,
            content: sanitizedContent,
          });
        }
      });

      return {
        success,
        failures,
        stats: {
          total: items.length,
          succeeded: success.length,
          failed: failures.length,
        },
      };
    } catch (error) {
        const err = error as any;
        // Complete batch failure (network, API error, etc.)
        console.warn('[VercelAIProvider] Batch generation failed completely:', err.message);

        // Return empty result with all items marked as failures
        return {
          success: [],
          failures: items.map(item => ({
            symbolName: item.symbolName,
            errors: [`Batch generation error: ${err.message}`],
          })),
          stats: {
            total: items.length,
            succeeded: 0,
            failed: items.length,
          },
        };
    }
  }

  async validateConnection(): Promise<boolean> {
    const model = this.getModel();
    try {
      // Simple ping to validate key
      const options: any = {
        model,
        prompt: 'Hello',
        maxTokens: 5,
      };
      await generateText(options);
      return true;
    } catch (error) {
      if (this.debug) {
        console.error('Connection validation failed:', error);
      }
      return false;
    }
  }
}
