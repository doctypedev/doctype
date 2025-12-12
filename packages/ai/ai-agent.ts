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
  AIAgentRoleConfig,
  AIProvider // Import AIProvider type here
} from './types';
import { VercelAIProvider } from './providers/vercel-ai-provider';

import { getDefaultModel } from './constants';

/**
 * Collection of AI Agent instances for different roles.
 */
export interface AIAgents {
  planner: AIAgent;
  writer: AIAgent;
  researcher?: AIAgent;
  reviewer?: AIAgent;
}

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
    const { model, debug } = this.config;

    // Use Vercel AI SDK for all supported providers
    return new VercelAIProvider(model, debug);
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

  async generateBatch(
    items: Array<{ symbolName: string; signatureText: string }>,
    prompt: string,
    systemPrompt: string
  ): Promise<Array<{ symbolName: string; content: string }>> {
    this.log(`Generating batch documentation for ${items.length} items`);

    // Try batch generation if provider supports it
    if (this.provider.generateBatchDocumentation) {
      try {
        const batchResult = await this.executeWithRetry(() =>
          this.provider.generateBatchDocumentation!(items, prompt, systemPrompt)
        );

        // Start with successful generations from batch
        const results = [...batchResult.success];

        // Log batch statistics
        if (batchResult.stats.failed > 0) {
          this.log(
            `Batch generated ${batchResult.stats.succeeded}/${batchResult.stats.total} successfully. ` +
            `Retrying ${batchResult.stats.failed} failed items sequentially...`
          );

          // For the sake of refactor, removing complex batch retry fallback that depends on single prompt logic
          // as it's not directly relevant to the current Model Routing task and would require more complex changes
          // to pass single prompts or dynamically generate them here.
          this.log(`Batch retry fallback currently not supported for ${batchResult.stats.failed} failed items.`);
        } else {
          this.log(`Batch completed successfully: ${batchResult.stats.succeeded}/${batchResult.stats.total}`);
        }

        return results;
      } catch (error: unknown) { // Use unknown for caught errors
        this.log('Batch generation failed completely', error);
      }
    }

    this.log('Batch generation not supported by provider or failed, returning empty.');
    return [];
  }

  /**
   * Generate generic text using the AI provider
   */
  async generateText(
    prompt: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    this.log('Generating text', { promptLength: prompt.length, model: this.config.model.modelId });

    if (this.provider.generateText) {
      return this.executeWithRetry(() =>
        this.provider.generateText!(prompt, options)
      );
    }

    throw new Error(`Provider ${this.config.model.provider} with model ${this.config.model.modelId} does not support text generation`);
  }

  /**
   * Validate the AI provider connection
   */
  async validateConnection(): Promise<boolean> {
    this.log('Validating provider connection for model: ' + this.config.model.modelId);

    try {
      return await this.provider.validateConnection();
    } catch (error: unknown) { // Use unknown for caught errors
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
    } catch (error: unknown) { // Use unknown for caught errors
      const isRetryable = this.isRetryableError(error);
      const hasAttemptsLeft = attempt < this.retryConfig.maxAttempts;

      if (isRetryable && hasAttemptsLeft) {
        this.log(`Attempt ${attempt} for model ${this.config.model.modelId} failed, retrying in ${this.retryConfig.delayMs}ms...`);

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
    if (error instanceof AIProviderError && error.code) { // Check if it's an instance of AIProviderError
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
      console.log(`[AIAgent ${this.config.model.modelId}]`, message, ...args);
    }
  }

  /**
   * Get the current provider name
   */
  getProvider(): AIProvider { // Use AIProvider type
    return this.config.model.provider;
  }

  /**
   * Get the current model ID
   */
  getModelId(): string {
    return this.config.model.modelId;
  }

  /**
   * Get a summary of configuration
   */
  getConfig(): { provider: AIProvider; model: string; timeout: number } { // Use AIProvider type
    return {
      provider: this.config.model.provider,
      model: this.config.model.modelId,
      timeout: this.config.timeout || 30000,
    };
  }
}

/**
 * Internal helper to create a single AI Agent based on role configuration and ENV vars.
 * @param roleOptions Specific options for this role, potentially overriding ENV.
 * @param globalOptions Global options like debug flag.
 */
function _createSingleAgentFromEnv(
  roleOptions: AIAgentRoleConfig,
  globalOptions: { debug?: boolean; timeout?: number }
): AIAgent {
  const providers: Array<{ env: string; provider: AIProvider; defaultModel: string }> = [
    { env: 'OPENAI_API_KEY', provider: 'openai', defaultModel: 'gpt-4o' },
    { env: 'GEMINI_API_KEY', provider: 'gemini', defaultModel: 'gemini-1.5-flash' },
    { env: 'ANTHROPIC_API_KEY', provider: 'anthropic', defaultModel: 'claude-3-5-haiku-20241022' },
    { env: 'MISTRAL_API_KEY', provider: 'mistral', defaultModel: 'mistral-large-latest' }, // Updated Mistral default
  ];

  // Try to find a provider that has its API key set in the environment
  let selectedProvider: { env: string; provider: AIProvider; defaultModel: string } | undefined;

  // First, check if a specific provider is requested for this role (e.g., roleOptions.provider = 'gemini')
  if (roleOptions.provider) {
    selectedProvider = providers.find(p => p.provider === roleOptions.provider && process.env[p.env]);
  } else {
    // If no specific provider is requested for the role, use the first available one from the list
    selectedProvider = providers.find(p => process.env[p.env]);
  }

  if (selectedProvider) {
    const modelId = roleOptions.modelId || getDefaultModel(selectedProvider.provider) || selectedProvider.defaultModel;
    return new AIAgent({
      model: {
        provider: selectedProvider.provider,
        modelId: modelId,
        apiKey: process.env[selectedProvider.env]!,
        maxTokens: roleOptions.maxTokens,
        temperature: roleOptions.temperature,
      },
      timeout: globalOptions.timeout,
      debug: globalOptions.debug,
    });
  }

  const specificProviderMsg = roleOptions.provider ? ` for provider '${roleOptions.provider}'` : '';
  throw new Error(`No API key found in environment for the requested role${specificProviderMsg}. Please set relevant environment variable.`);
}

/**
 * Factory function to create role-based AI Agents from environment variables.
 * Planner typically uses a more capable (and potentially pricier) model for reasoning.
 * Writer typically uses a faster, cheaper model for text generation.
 * @returns {AIAgents} An object containing configured planner and writer AIAgent instances.
 */
export function createAIAgentsFromEnv(
  globalOptions: { debug?: boolean; timeout?: number; maxTokens?: number; temperature?: number } = {},
  roleConfigs?: { planner?: AIAgentRoleConfig; writer?: AIAgentRoleConfig; researcher?: AIAgentRoleConfig; reviewer?: AIAgentRoleConfig }
): AIAgents {
  const defaultPlannerModel = 'gpt-4o'; // OpenAI default
  const defaultWriterModel = 'gpt-4o-mini'; // OpenAI default
  const defaultResearcherModel = 'gpt-4o-mini'; // Fast, cheap
  const defaultReviewerModel = 'gpt-4o'; // Good reasoning

  let plannerAgent: AIAgent;
  let writerAgent: AIAgent;
  let researcherAgent: AIAgent | undefined;
  let reviewerAgent: AIAgent | undefined;

  const currentProvider = (process.env.OPENAI_API_KEY ? 'openai' :
    (process.env.GEMINI_API_KEY ? 'gemini' :
      (process.env.ANTHROPIC_API_KEY ? 'anthropic' :
        (process.env.MISTRAL_API_KEY ? 'mistral' : undefined))));

  if (!currentProvider) {
    throw new Error('No API key found in environment variables to initialize any AI provider.');
  }

  const getModelDefaults = (provider: AIProvider) => { // Use AIProvider type
    switch (provider) {
      case 'openai': return {
        planner: 'o3-mini',
        writer: 'gpt-4o-mini',
        researcher: 'gpt-4o-mini',
        reviewer: 'gpt-4o'
      };
      case 'gemini': return {
        planner: 'gemini-1.5-flash',
        writer: 'gemini-1.5-flash-001',
        researcher: 'gemini-1.5-flash-001',
        reviewer: 'gemini-1.5-pro' // Reviewer needs more IQ
      };
      case 'anthropic': return {
        planner: 'claude-3-5-haiku-20241022',
        writer: 'claude-3-5-haiku-20241022',
        researcher: 'claude-3-5-haiku-20241022',
        reviewer: 'claude-3-5-sonnet-20241022'
      };
      case 'mistral': return {
        planner: 'mistral-large-latest',
        writer: 'mistral-small-latest',
        researcher: 'mistral-small-latest',
        reviewer: 'mistral-large-latest'
      };
      default: return {
        planner: defaultPlannerModel,
        writer: defaultWriterModel,
        researcher: defaultResearcherModel,
        reviewer: defaultReviewerModel
      };
    }
  };

  const modelDefaults = getModelDefaults(currentProvider);

  // Helper to create agent safely
  const createAgent = (role: 'planner' | 'writer' | 'researcher' | 'reviewer', required: boolean = true) => {
    try {
      const config = roleConfigs?.[role];
      const defaults = modelDefaults[role];

      const options: AIAgentRoleConfig = {
        modelId: config?.modelId || defaults,
        provider: config?.provider || currentProvider,
        maxTokens: config?.maxTokens,
        temperature: config?.temperature
      };

      const agent = _createSingleAgentFromEnv(options, globalOptions);
      console.log(`[AIAgentManager] ${role.charAt(0).toUpperCase() + role.slice(1)} initialized with ${agent.getModelId()} (${agent.getProvider()})`);
      return agent;
    } catch (e: any) {
      if (required) throw e;
      // For optional agents, just log warning and return undefined
      console.warn(`[AIAgentManager] Optional agent ${role} failed to initialize: ${e.message}`);
      return undefined;
    }
  };

  try {
    plannerAgent = createAgent('planner')!;
  } catch (e) {
    // Fallback: try using writer config for planner if planner fails
    console.warn("Planner failed to init, trying writer config as fallback...");
    plannerAgent = createAgent('writer')!;
  }

  writerAgent = createAgent('writer')!;

  // Optional Agents
  researcherAgent = createAgent('researcher', false);
  reviewerAgent = createAgent('reviewer', false);

  // Use writer as fallback for researcher if it failed
  if (!researcherAgent && writerAgent) {
    researcherAgent = writerAgent;
    console.log(`[AIAgentManager] Researcher using Writer agent as fallback.`);
  }

  // Ensure both agents are initialized
  if (!plannerAgent || !writerAgent) {
    throw new Error("Failed to initialize both planner and writer AI agents.");
  }

  return {
    planner: plannerAgent,
    writer: writerAgent,
    researcher: researcherAgent,
    reviewer: reviewerAgent
  };
}
