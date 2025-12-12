import { IAIProvider, AIProvider, DocumentationRequest, DocumentationResponse, AIModel, AIProviderError, BatchDocumentationResult } from '../types';
import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { BatchDocumentationStructureSchema, DocumentationStructureSchema, type DocumentationStructure } from '../structured-schema';
import { buildMarkdownFromStructure } from '../markdown-builder';
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

    // Use structured prompt from request
    const prompt = request.prompt;
    const systemPrompt = request.systemPrompt;

    try {
      const options: any = {
        model,
        prompt,
        system: systemPrompt,
        schema: z.object({
          documentation: DocumentationStructureSchema,
        }),
      };

      if (this.modelConfig.maxTokens) {
        options.maxTokens = this.modelConfig.maxTokens;
      }

      if (this.modelConfig.temperature !== undefined) {
        options.temperature = this.modelConfig.temperature;
      }

      const result: any = await generateObject(options);
      const doc: DocumentationStructure = result.object.documentation;
      const usageAny = result.usage as any;

      // Build Markdown from structure (Zod schema already validated the data)
      const markdown = buildMarkdownFromStructure(doc);

      return {
        content: markdown,
        provider: this.provider,
        modelId: this.modelConfig.modelId,
        timestamp: Date.now(),
        usage: result.usage ? {
          promptTokens: usageAny.promptTokens || 0,
          completionTokens: usageAny.completionTokens || 0,
          totalTokens: usageAny.totalTokens || 0,
        } : undefined,
      };
    } catch (error) {
      const err = error as any;
      let code = 'GENERATION_FAILED';
      const message = err.message || 'Unknown error during generation';

      // Map common error codes if possible
      if (err.name === 'APICallError' && err.statusCode === 429) {
        code = 'RATE_LIMIT';
      }

      throw new AIProviderError(
        code,
        message,
        this.provider,
        error
      );
    }
  }

  async generateBatchDocumentation(
    items: Array<{ symbolName: string; signatureText: string }>,
    prompt: string,
    systemPrompt: string
  ): Promise<BatchDocumentationResult> {
    const model = this.getModel();

    try {
      const options: any = {
        model,
        prompt,
        system: systemPrompt,
        schema: BatchDocumentationStructureSchema,
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

      // Build Markdown from each structured documentation entry
      // (Zod schema already validated all data during parsing)
      const success: Array<{ symbolName: string; content: string }> =
        result.object.documentations.map((doc: DocumentationStructure) => {
          const markdown = buildMarkdownFromStructure(doc);

          if (this.debug) {
            console.log(`[VercelAIProvider] Generated markdown for ${doc.symbolName}`);
          }

          return {
            symbolName: doc.symbolName,
            content: markdown,
          };
        });

      return {
        success,
        failures: [],
        stats: {
          total: items.length,
          succeeded: success.length,
          failed: 0,
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
    const isO1Model = this.modelConfig.modelId.startsWith('o1-');

    try {
      // Simple ping to validate key
      const options: any = {
        model,
        prompt: 'Hello',
      };

      // o1 models do not support maxTokens in the same way (or might reject small values)
      if (!isO1Model) {
        options.maxTokens = 5;
      }

      await generateText(options);
      return true;
    } catch (error) {
      if (this.debug) {
        console.error('Connection validation failed:', error);
      }
      return false;
    }
  }

  /**
   * Generate plain text from a prompt (useful for non-documentation tasks)
   */
  async generateText(
    prompt: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const model = this.getModel();
    const isO1Model = this.modelConfig.modelId.startsWith('o1-');

    try {
      const genOptions: any = {
        model,
        prompt,
      };

      // Only add parameters if not o1 model (which has strict parameter validation)
      if (!isO1Model) {
        genOptions.temperature = options.temperature ?? this.modelConfig.temperature;
        genOptions.maxTokens = options.maxTokens ?? this.modelConfig.maxTokens ?? 1000;
      } else {
        // For o1, we might use maxCompletionTokens if provided, but Vercel AI SDK mapping might handle it.
        // Safer to just omit temperature/maxTokens for now if using standard o1 reasoning.
        // If user explicitly requests maxTokens, we could map it to maxCompletionTokens but let's keep it simple.
      }

      const result = await generateText(genOptions);
      return result.text;
    } catch (error) {
      const err = error as any;
      throw new AIProviderError(
        'GENERATION_FAILED',
        err.message || 'Text generation failed',
        this.provider,
        error
      );
    }
  }
}
