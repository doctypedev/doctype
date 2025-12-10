# AI Module - Gen AI Agent

The **AI Module** provides intelligent, context-aware documentation generation using Large Language Models (LLMs). This transforms Sintesi from a simple drift detector into an AI-powered documentation assistant.

## Purpose

This module implements the **probabilistic logic layer** of Sintesi:

- Generate high-quality documentation based on code signature changes
- Support multiple AI providers (OpenAI, Gemini)
- Engineer prompts for optimal documentation quality
- Handle API errors with retry logic and graceful degradation
- Provide fallback to placeholder content when AI is unavailable

## Architecture

```
┌──────────────────────────────────────────────┐
│              AI Agent                        │
│  (Orchestrator & Retry Logic)                │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│          Prompt Builder                      │
│  • System Prompt (Technical Writer Persona)  │
│  • User Prompt (Drift Context)               │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│          Provider Interface                  │
│  • OpenAI Provider (GPT-4, GPT-3.5)          │
│  • Gemini Provider (future)                  │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│          Generated Documentation             │
│  (Markdown with proper formatting)           │
└──────────────────────────────────────────────┘
```

## Modules

### AIAgent (`ai-agent.ts`)

<!-- sintesi:start id="550e8400-e29b-41d4-a716-446655440008" code_ref="src/ai/ai-agent.ts#AIAgent" -->
Main orchestrator for AI-powered documentation generation.

**Features:**
- Provider abstraction (supports multiple AI vendors)
- Retry logic with exponential backoff
- Connection validation
- Error handling and fallback to placeholder
- Token usage tracking

**API:**

```typescript
import { createAgentFromEnv, createOpenAIAgent } from 'sintesi';

// Create from environment variables
const agent = createAgentFromEnv({
  modelId: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.3
});

// Or create with explicit configuration
const agent = createOpenAIAgent('your-api-key', 'gpt-4', {
  maxTokens: 1000,
  temperature: 0.3,
  timeout: 30000
});

// Generate documentation for drift
const newDocs = await agent.generateFromDrift(
  'login',              // Symbol name
  oldSignature,         // Old CodeSignature object
  newSignature,         // New CodeSignature object
  oldDocumentation,     // Previous markdown content
  'src/auth/login.ts'   // File path (for context)
);

console.log(newDocs); // Generated markdown documentation

// Validate connection (useful for CI checks)
const isValid = await agent.validateConnection();
if (!isValid) {
  console.error('Cannot connect to AI provider');
}
```
<!-- sintesi:end id="550e8400-e29b-41d4-a716-446655440008" -->

**Retry Logic:**

The agent automatically retries failed requests with exponential backoff:

```typescript
// Attempt 1: Immediate
// Attempt 2: Wait 1 second
// Attempt 3: Wait 2 seconds
// Attempt 4: Give up, return placeholder
```

### PromptBuilder (`prompt-builder.ts`)

<!-- sintesi:start id="550e8400-e29b-41d4-a716-446655440009" code_ref="src/ai/prompt-builder.ts#PromptBuilder" -->
Generates optimized prompts for AI providers to produce high-quality documentation.
<!-- sintesi:end id="550e8400-e29b-41d4-a716-446655440009" -->

**Prompt Structure:**

```
System Prompt:
  → Sets the AI's persona as a technical documentation expert
  → Provides guidelines for clear, concise documentation
  → Specifies Markdown formatting rules

User Prompt:
  → Previous signature (TypeScript code)
  → New signature (TypeScript code)
  → Previous documentation (Markdown)
  → Context (file path, related symbols)
  → Instructions (what to focus on)
```

**API:**

```typescript
import { PromptBuilder } from 'sintesi';

// Build system prompt (same for all requests)
const systemPrompt = PromptBuilder.buildSystemPrompt();

// Build user prompt (specific to each drift)
const userPrompt = PromptBuilder.buildUserPrompt(
  {
    symbolName: 'login',
    oldSignature: oldSig,
    newSignature: newSig,
    oldDocumentation: oldDocs,
    filePath: 'src/auth/login.ts'
  },
  {
    includeContext: true,
    includeExamples: true,
    style: 'detailed' // 'concise' | 'detailed' | 'tutorial'
  }
);
```

**Example System Prompt:**

```markdown
You are a technical documentation expert specializing in TypeScript.

Your task is to update documentation when function/class signatures change.

Guidelines:
- Be clear and concise
- Focus on what changed and why it matters
- Include parameter descriptions with types
- Document return types
- Use Markdown formatting
- Include code examples when helpful

Output Format:
- Use proper Markdown (**, `, ``` blocks)
- Structure: Description → Parameters → Returns → Example
- Be specific about parameter types and constraints
```

**Example User Prompt:**

```markdown
The function signature has changed. Update the documentation accordingly.

File: src/auth/login.ts

Previous Signature:
```typescript
function login(email: string): Promise<string>
```

New Signature:
```typescript
function login(email: string, password: string): Promise<string>
```

Previous Documentation:
```markdown
Authenticates a user with email.

**Parameters:**
- `email` (string): User's email address

**Returns:**
- `Promise<string>`: Authentication token
```

Generate updated documentation that:
1. Reflects the new `password` parameter
2. Maintains consistency with previous style
3. Includes examples if helpful
```

### OpenAIProvider (`providers/openai-provider.ts`)

<!-- sintesi:start id="550e8400-e29b-41d4-a716-446655440010" code_ref="src/ai/providers/openai-provider.ts#OpenAIProvider" -->
OpenAI API integration for documentation generation using GPT models.

**Features:**
- Chat Completions API (GPT-4, GPT-4-turbo, GPT-3.5-turbo)
- Configurable model, max tokens, temperature
- Usage statistics tracking (prompt tokens, completion tokens, total tokens)
- Error handling with detailed messages
- Timeout support
<!-- sintesi:end id="550e8400-e29b-41d4-a716-446655440010" -->

**Models Supported:**

| Model | Best For | Cost (relative) |
|-------|----------|-----------------|
| `gpt-4` | Highest quality docs | $$$ |
| `gpt-4-turbo` | Fast, high-quality docs | $$ |
| `gpt-3.5-turbo` | Simple docs, cost-conscious | $ |

**API:**

```typescript
import { OpenAIProvider } from 'sintesi';

const provider = new OpenAIProvider({
  provider: 'openai',
  modelId: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
  maxTokens: 1000,
  temperature: 0.3,
  timeout: 30000
});

// Generate documentation
const response = await provider.generateDocumentation({
  systemPrompt: 'You are a technical writer...',
  userPrompt: 'Update docs for...',
  symbolName: 'login',
  filePath: 'src/auth/login.ts'
});

console.log(response.content);      // Generated markdown
console.log(response.usage);        // Token usage stats
console.log(response.modelId);      // Model used
console.log(response.finishReason); // 'stop' | 'length' | 'error'
```

**Usage Statistics:**

```typescript
{
  promptTokens: 250,
  completionTokens: 180,
  totalTokens: 430
}
```

**Error Handling:**

```typescript
try {
  const response = await provider.generateDocumentation(request);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Rate limited - retry later
  } else if (error.message.includes('invalid API key')) {
    // Invalid credentials
  } else if (error.message.includes('timeout')) {
    // Request timeout
  }
}
```

### BaseProvider (`providers/base-provider.ts`)

Abstract base class for AI providers, enabling multi-vendor support.

**Features:**
- Standardized provider interface
- Timeout handling
- HTTP request abstraction
- Error standardization
- Debug logging

**Interface:**

```typescript
abstract class BaseProvider {
  abstract generateDocumentation(
    request: DocumentationRequest
  ): Promise<DocumentationResponse>;

  abstract validateConnection(): Promise<boolean>;
}
```

**Implementing a New Provider:**

```typescript
import { BaseProvider } from 'sintesi/ai/providers';

class GeminiProvider extends BaseProvider {
  async generateDocumentation(request: DocumentationRequest) {
    // Make API call to Google Gemini
    const response = await this.callGeminiAPI(request);
    return this.formatResponse(response);
  }

  async validateConnection() {
    // Test Gemini API credentials
    return await this.testGeminiConnection();
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { createOpenAIAgent } from 'sintesi';

// Create agent
const agent = createOpenAIAgent(
  process.env.OPENAI_API_KEY,
  'gpt-4'
);

// Generate documentation
const newDocs = await agent.generateFromDrift(
  'calculateTotal',
  oldSignature,
  newSignature,
  oldDocumentation,
  'src/utils/calculator.ts'
);

console.log(newDocs);
```

### With Custom Options

```typescript
import { createOpenAIAgent } from 'sintesi';

const agent = createOpenAIAgent(
  process.env.OPENAI_API_KEY,
  'gpt-4',
  {
    maxTokens: 1500,      // Allow longer documentation
    temperature: 0.2,     // More deterministic output
    timeout: 60000        // 60 second timeout
  }
);
```

### From Environment Variables

```typescript
import { createAgentFromEnv } from 'sintesi';

// Reads OPENAI_API_KEY or GEMINI_API_KEY automatically
const agent = createAgentFromEnv({ modelId: 'gpt-4' });
```

### Error Handling

```typescript
import { createAgentFromEnv } from 'sintesi';

try {
  const agent = createAgentFromEnv();
  const newDocs = await agent.generateFromDrift(...);
} catch (error) {
  console.error('AI generation failed:', error.message);
  // Fallback to placeholder content
  const placeholder = `# ${symbolName}\n\nSignature: ${newSignature.signature}`;
}
```

## Prompt Engineering

The `PromptBuilder` uses best practices for prompt engineering:

### 1. Clear Role Definition

```markdown
You are a technical documentation expert specializing in TypeScript.
```

This sets the AI's persona and expected expertise level.

### 2. Specific Instructions

```markdown
Generate updated documentation that:
1. Reflects the new parameter
2. Maintains consistency with previous style
3. Includes examples if helpful
```

Clear, numbered instructions improve output quality.

### 3. Context Provision

```markdown
File: src/auth/login.ts

Previous Signature:
...

New Signature:
...
```

Providing context helps the AI understand the change better.

### 4. Output Format Specification

```markdown
Output Format:
- Use proper Markdown
- Structure: Description → Parameters → Returns → Example
```

Explicit format requirements ensure consistent output.

## Cost Optimization

### 1. Choose the Right Model

```typescript
// For simple function documentation
const agent = createOpenAIAgent(apiKey, 'gpt-3.5-turbo'); // Cheaper

// For complex class/interface documentation
const agent = createOpenAIAgent(apiKey, 'gpt-4'); // Better quality
```

### 2. Limit Token Usage

```typescript
const agent = createOpenAIAgent(apiKey, 'gpt-4', {
  maxTokens: 500 // Limit output length (cheaper)
});
```

### 3. Batch Processing

Instead of calling the AI for every single change:

```bash
# Don't do this (calls AI 10 times)
git commit
npx sintesi fix --auto-commit
git commit
npx sintesi fix --auto-commit
# ... 8 more times

# Do this (calls AI once for all changes)
# Make all code changes
# ...
git commit
npx sintesi fix --auto-commit
```

### 4. Use `--no-ai` for Testing

```bash
# During development/testing, use placeholder
npx sintesi fix --no-ai --dry-run
```

## Rate Limiting

OpenAI enforces rate limits. The AI module handles this automatically:

```typescript
// Automatic retry with exponential backoff
try {
  const response = await provider.generateDocumentation(request);
} catch (error) {
  if (isRateLimitError(error)) {
    await sleep(1000);  // Wait 1 second
    return await provider.generateDocumentation(request); // Retry
  }
}
```

**Rate Limit Best Practices:**

1. **Spread out requests**: Don't fix all drifts at once if you have many
2. **Use retries**: Let the module handle rate limits automatically
3. **Monitor usage**: Check OpenAI dashboard for usage patterns
4. **Increase limits**: Contact OpenAI for higher rate limits if needed

## Testing

The AI module has comprehensive test coverage:

```bash
npm test src/ai
```

**Test Coverage:**
- Prompt generation
- OpenAI API integration (mocked)
- Retry logic
- Connection validation
- Error handling
- Fallback behavior

## Environment Variables

```bash
# Required for AI-powered documentation
export OPENAI_API_KEY=sk-your-api-key-here

# Alternative (future support)
export GEMINI_API_KEY=your-gemini-key

# Optional: Model selection
export DOCTYPE_AI_MODEL=gpt-4

# Optional: Custom API endpoint
export OPENAI_API_ENDPOINT=https://custom-endpoint.com
```

## Security

### API Key Management

**❌ DON'T:**
```bash
# Never commit API keys
git add .env
git commit -m "Added API key"
```

**✅ DO:**
```bash
# Add .env to .gitignore
echo ".env" >> .gitignore

# Use environment variables
export OPENAI_API_KEY=sk-your-key-here

# In CI/CD, use secrets management
# GitHub: Settings → Secrets → Actions
# GitLab: Settings → CI/CD → Variables
```

### Rate Limit Protection

The module automatically:
- Retries on rate limit errors (with backoff)
- Respects retry-after headers
- Falls back to placeholder on persistent failures

## Future Enhancements

### Gemini Provider (Coming Soon)

```typescript
import { createGeminiAgent } from 'sintesi';

const agent = createGeminiAgent(
  process.env.GEMINI_API_KEY,
  'gemini-pro'
);
```

### Local LLM Support

Support for locally-hosted models:

```typescript
import { createLocalAgent } from 'sintesi';

const agent = createLocalAgent('http://localhost:8080', 'llama-2');
```

### Fine-tuned Models

Support for custom fine-tuned models optimized for your codebase:

```typescript
const agent = createOpenAIAgent(apiKey, 'ft:gpt-4-0613:your-org:model-id');
```

## Dependencies

- **openai**: Official OpenAI SDK (future - currently using fetch API)
- Node.js `https` (built-in): HTTP requests
- Node.js `crypto` (built-in): Request signing (future)

## Further Reading

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [GPT-4 Documentation](https://platform.openai.com/docs/models/gpt-4)
