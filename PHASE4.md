# Phase 4 - Gen AI Agent

**Status**: ✅ Complete
**Completion Date**: 2025-11-27

## Overview

Phase 4 implements the Gen AI Agent module for Doctype, providing **AI-powered documentation generation** using OpenAI or Gemini APIs. This phase transforms the `fix` command from generating placeholder content to producing intelligent, context-aware documentation updates.

### Key Features

- **AI-Powered Documentation**: Generates high-quality documentation based on code signature changes
- **Multi-Provider Support**: OpenAI (implemented) and Gemini (future)
- **Intelligent Prompt Engineering**: Context-aware prompts for better documentation quality
- **Auto-Commit Functionality**: Automatically commit documentation changes with git
- **Retry Logic**: Robust error handling with automatic retry on transient failures
- **Graceful Degradation**: Falls back to placeholder content if AI is unavailable

## Architecture

Phase 4 is built on a **probabilistic logic** layer (AI) integrated with the **deterministic logic** from Phases 1-3:

```
┌─────────────────────────────────────────────────────────┐
│                     CLI (Phase 3)                       │
│                  npx doctype fix                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Drift Detection                        │
│         (AST Analyzer + Signature Hasher)               │
│                   Phase 1 + 2                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   AI Agent (Phase 4)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Prompt Builder                           │  │
│  │  • System Prompt (Technical Writer)               │  │
│  │  • User Prompt (Old Signature + New Signature)    │  │
│  │  • Context (File Path, Related Symbols)           │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │                                   │
│                      ▼                                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │          AI Provider                              │  │
│  │  • OpenAI Provider (GPT-4, GPT-3.5)               │  │
│  │  • Gemini Provider (future)                       │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │                                   │
│                      ▼                                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │       Generated Documentation                     │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Content Injection (Phase 2)                  │
│   • Inject into Markdown between anchors                │
│   • Update doctype-map.json with new hash               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Git Auto-Commit (Phase 4)                    │
│   • Stage modified files                                │
│   • Create commit with standard message                 │
│   • Optional push to remote                             │
└─────────────────────────────────────────────────────────┘
```

## Modules Implemented

### 1. AI Agent (`src/ai/ai-agent.ts`)

Main orchestrator for AI-powered documentation generation.

**Key Features:**
- Provider abstraction (OpenAI, Gemini)
- Retry logic with exponential backoff
- Connection validation
- Error handling and fallback

**API:**
```typescript
import { createAgentFromEnv, createOpenAIAgent } from 'doctype';

// Create from environment variables
const agent = createAgentFromEnv({ modelId: 'gpt-4' });

// Or create with explicit configuration
const agent = createOpenAIAgent('your-api-key', 'gpt-4', {
  maxTokens: 1000,
  temperature: 0.3,
});

// Generate documentation for drift
const docs = await agent.generateFromDrift(
  'login',
  oldSignature,
  newSignature,
  oldDocumentation,
  'src/auth/login.ts'
);

// Validate connection
const isValid = await agent.validateConnection();
```

### 2. Prompt Builder (`src/ai/prompt-builder.ts`)

Generates optimized prompts for AI providers.

**Key Features:**
- System prompt with technical writer persona
- Context-aware user prompts
- Signature comparison and change detection
- Customizable generation options (style, examples)

**Prompt Structure:**
```
System Prompt:
  → Technical documentation expert
  → Guidelines for clear, concise documentation
  → Markdown formatting rules

User Prompt:
  → Previous Signature (TypeScript)
  → New Signature (TypeScript)
  → Previous Documentation (Markdown)
  → Context (File path, related symbols)
  → Instructions (parameters, return type, examples)
```

**API:**
```typescript
import { PromptBuilder } from 'doctype';

// Build system prompt
const systemPrompt = PromptBuilder.buildSystemPrompt();

// Build user prompt
const userPrompt = PromptBuilder.buildUserPrompt(request, {
  includeContext: true,
  includeExamples: true,
  style: 'detailed', // 'concise' | 'detailed' | 'tutorial'
});
```

### 3. OpenAI Provider (`src/ai/providers/openai-provider.ts`)

OpenAI API integration for documentation generation.

**Key Features:**
- Chat Completions API (GPT-4, GPT-3.5-turbo)
- Configurable model, tokens, temperature
- Usage statistics tracking
- Error handling with detailed messages

**Models Supported:**
- `gpt-4` (recommended for best quality)
- `gpt-4-turbo`
- `gpt-3.5-turbo` (faster, cheaper)

**API:**
```typescript
import { OpenAIProvider } from 'doctype';

const provider = new OpenAIProvider({
  provider: 'openai',
  modelId: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
  maxTokens: 1000,
  temperature: 0.3,
});

const response = await provider.generateDocumentation(request);
console.log(response.content); // Generated markdown
console.log(response.usage);   // Token usage stats
```

### 4. Base Provider (`src/ai/providers/base-provider.ts`)

Abstract base class for AI providers.

**Features:**
- Timeout handling
- HTTP request abstraction
- Error standardization
- Debug logging

### 5. Git Helper (`src/cli/git-helper.ts`)

Git operations for auto-commit functionality.

**Key Features:**
- Repository validation
- File staging
- Commit creation with standard messages
- Optional push to remote

**API:**
```typescript
import { GitHelper } from 'doctype';

const git = new GitHelper(logger);

// Check if git repo
const isRepo = git.isGitRepository();

// Auto-commit changes
const result = git.autoCommit(
  ['docs/api.md', 'doctype-map.json'],
  ['login', 'logout'],
  false // don't push
);
```

**Commit Message Format:**
```
🤖 Doctype Bot: Auto-fix documentation for <symbol>
🤖 Doctype Bot: Auto-fix documentation for <symbol1>, <symbol2>
🤖 Doctype Bot: Auto-fix documentation for 5 symbols
```

## CLI Integration

### Enhanced `fix` Command

The `fix` command now supports AI-powered documentation generation:

```bash
# Use AI (requires OPENAI_API_KEY or GEMINI_API_KEY)
npx doctype fix --verbose

# Disable AI (use placeholder content)
npx doctype fix --no-ai

# AI with auto-commit
npx doctype fix --auto-commit

# Preview AI-generated docs without writing
npx doctype fix --dry-run
```

**New Options:**
- `--no-ai`: Disable AI generation, use placeholder content
- `--auto-commit`: Automatically commit changes with git

**Behavior:**
1. Checks for `OPENAI_API_KEY` or `GEMINI_API_KEY` environment variable
2. Validates AI provider connection
3. Generates documentation for each drifted entry
4. Falls back to placeholder if AI fails or is unavailable
5. Injects content into Markdown files
6. Updates `doctype-map.json` with new hash and signature text
7. Auto-commits if `--auto-commit` flag is set

### Example Output

```
🔧 Doctype Fix - Update Documentation

 ℹ Analyzing 10 documentation entries...

 ℹ Found 2 entries with drift
 ℹ Using AI provider: openai

────────────────────────────────────────────────────────────

 ℹ login - src/auth/login.ts
 ℹ   Documentation: docs/api.md:42
 ✓ Updated documentation (15 lines changed)

 ℹ logout - src/auth/logout.ts
 ℹ   Documentation: docs/api.md:78
 ✓ Updated documentation (8 lines changed)

────────────────────────────────────────────────────────────
 ✓ Successfully updated 2 entries

 ℹ Auto-committing changes...
 ℹ Staged 2 files
 ✓ Changes committed successfully
 ℹ Commit message: "🤖 Doctype Bot: Auto-fix documentation for login, logout"
────────────────────────────────────────────────────────────
```

## Data Model Updates

### DoctypeMapEntry (Enhanced)

Added `codeSignatureText` field to store signature for AI context:

```typescript
export interface DoctypeMapEntry {
  id: string;
  codeRef: CodeRef;
  codeSignatureHash: string;
  codeSignatureText?: string;  // ← NEW in Phase 4
  docRef: DocRef;
  originalMarkdownContent: string;
  lastUpdated: number;
}
```

**Purpose:** Provides the AI with the old signature text for better context when generating documentation for changes.

## Environment Variables

### Required for AI Features

```bash
# OpenAI (recommended)
export OPENAI_API_KEY=sk-...

# Gemini (future)
export GEMINI_API_KEY=...
```

### Optional Configuration

The following can be configured via code but not environment variables:

- `MODEL_ID`: Model to use (default: `gpt-4`)
- `MAX_TOKENS`: Maximum tokens to generate (default: 2000)
- `TEMPERATURE`: Randomness (0-1, default: 0.3)
- `TIMEOUT`: Request timeout in ms (default: 30000)

## Example Usage

### Basic Usage

```typescript
import { createAgentFromEnv } from 'doctype';

// Create AI agent from environment
const agent = createAgentFromEnv({ modelId: 'gpt-4' });

// Generate documentation
const docs = await agent.generateFromDrift(
  'calculateDiscount',
  oldSignature,
  newSignature,
  oldDocumentation
);

console.log(docs);
```

### Complete Workflow

See `src/examples/phase4-ai-integration.ts` for complete examples:

1. Create AI Agent
2. Validate connection
3. Generate documentation for code changes
4. Handle errors and retries
5. Integrate with AST analysis

## Quality of Generated Documentation

The AI Agent generates high-quality documentation with:

**Parameters:**
- Type annotations
- Descriptions of purpose and constraints

**Return Types:**
- Type information
- Description of what is returned

**Examples:**
- Practical usage examples
- Common patterns

**Error Handling:**
- Exceptions that may be thrown
- Error conditions

**Context:**
- Related functions/classes
- Integration points

### Example Generated Output

**Input:**
```typescript
// Old
export function login(email: string): Promise<string>

// New
export function login(email: string, password: string): Promise<string>
```

**Generated Documentation:**
```markdown
Authenticates a user with email and password credentials.

**Parameters:**
- `email` (string): User's email address for authentication
- `password` (string): User's password (minimum 8 characters required)

**Returns:**
- `Promise<string>`: JWT authentication token with 24-hour expiry

**Throws:**
- `AuthError`: If credentials are invalid or user account is locked

**Example:**
\`\`\`typescript
const token = await login('user@example.com', 'securePassword123');
// Use token for authenticated requests
\`\`\`

**Security:**
- Passwords are hashed using bcrypt before validation
- Failed attempts are rate-limited to prevent brute force attacks
```

## Error Handling

### Retry Logic

The AI Agent implements intelligent retry logic:

**Retryable Errors:**
- `TIMEOUT`: Request timeout
- `RATE_LIMIT`: API rate limit exceeded
- `NETWORK_ERROR`: Network connectivity issues

**Non-Retryable Errors:**
- `INVALID_API_KEY`: Authentication failure
- `INVALID_REQUEST`: Malformed request
- `UNKNOWN_ERROR`: Other errors

**Configuration:**
```typescript
const agent = new AIAgent({
  model: { provider: 'openai', ... },
  retry: {
    maxAttempts: 3,      // Retry up to 3 times
    delayMs: 1000,       // Wait 1 second between retries
  },
});
```

### Graceful Degradation

If AI generation fails:
1. Log warning with error details
2. Fall back to placeholder content
3. Continue with fix operation
4. Update documentation with placeholder

**User Experience:**
- Always succeeds (doesn't block on AI failures)
- Provides clear feedback about fallback
- Allows manual documentation updates

## Performance Considerations

### Cost Optimization

**Token Usage:**
- System prompt: ~200 tokens
- User prompt: ~500-1000 tokens (varies by signature complexity)
- Generated response: ~500-2000 tokens
- **Total per request:** ~1200-3200 tokens

**Cost Estimates (GPT-4):**
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens
- **Per documentation update:** ~$0.06-$0.15

**Optimization Tips:**
1. Use `gpt-3.5-turbo` for simpler documentation (10x cheaper)
2. Set lower `maxTokens` for concise docs
3. Batch multiple changes before running fix
4. Use `--no-ai` flag for testing

### Response Time

**Typical Latency:**
- GPT-4: 5-15 seconds per request
- GPT-3.5-turbo: 2-5 seconds per request

**Parallel Processing:**
Currently sequential (one at a time). Future enhancement: parallel requests with rate limiting.

## Limitations & Future Enhancements

### Current Limitations

1. **Sequential Processing:** One symbol at a time (slow for large changes)
2. **Gemini Not Implemented:** Only OpenAI is currently supported
3. **No Interactive Mode:** Can't review/approve AI output before injection
4. **No Custom Templates:** Documentation style is AI-determined
5. **No Fine-Tuning:** Uses base models without customization

### Future Enhancements (Planned)

#### Phase 4.1: Advanced Features
- **Gemini Provider:** Google's Gemini API integration
- **Interactive Mode:** Review AI output before injection (`--interactive`)
- **Custom Templates:** User-defined documentation templates
- **Parallel Processing:** Generate multiple docs concurrently
- **Caching:** Cache AI responses for repeated operations

#### Phase 4.2: Quality & Intelligence
- **Context Enhancement:** Include surrounding code, imports, usage examples
- **Fine-Tuning:** Custom models trained on project-specific documentation style
- **Multi-Modal:** Screenshots, diagrams in documentation
- **Diff-Based Prompts:** Smarter prompts based on exact code changes

#### Phase 4.3: Enterprise Features
- **Team Collaboration:** Shared AI configuration and templates
- **Audit Logging:** Track all AI-generated documentation
- **Cost Tracking:** Monitor API usage and costs
- **Custom Providers:** Support for self-hosted or enterprise AI models

## Testing

### Manual Testing

```bash
# Set up API key
export OPENAI_API_KEY=sk-...

# Test AI generation
npx doctype fix --verbose --dry-run

# Test auto-commit
npx doctype fix --auto-commit

# Test fallback (invalid key)
export OPENAI_API_KEY=invalid
npx doctype fix --verbose
```

### Integration Testing

See `src/examples/phase4-ai-integration.ts` for programmatic testing.

## Security Considerations

### API Key Management

**Best Practices:**
- Never commit API keys to git
- Use environment variables or CI secrets
- Rotate keys regularly
- Use service accounts in CI/CD

**`.env` File (for local development):**
```bash
# .env (add to .gitignore!)
OPENAI_API_KEY=sk-...
```

**GitHub Actions:**
```yaml
- name: Fix Documentation
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: npx doctype fix --auto-commit
```

### Rate Limiting

OpenAI enforces rate limits:
- **Free tier:** 3 requests/minute
- **Paid tier:** 60-3500 requests/minute (varies by model)

**Handling Rate Limits:**
- Automatic retry with exponential backoff
- Clear error messages
- Falls back to placeholder content

## File Structure

```
src/
├── ai/                                  # Phase 4: AI Agent module
│   ├── ai-agent.ts                      # Main orchestrator
│   ├── prompt-builder.ts                # Prompt engineering
│   ├── types.ts                         # AI module types
│   ├── index.ts                         # Module exports
│   └── providers/
│       ├── base-provider.ts             # Abstract base class
│       └── openai-provider.ts           # OpenAI integration
├── cli/
│   ├── git-helper.ts                    # Git auto-commit (Phase 4)
│   ├── fix.ts                           # Enhanced with AI (Phase 4)
│   └── ...
├── core/
│   └── types.ts                         # Updated DoctypeMapEntry
├── examples/
│   └── phase4-ai-integration.ts         # Phase 4 examples
└── index.ts                             # Updated exports
```

## Integration with Previous Phases

Phase 4 builds upon and enhances all previous phases:

**Phase 1 (AST & Drift Detection):**
- Uses signatures from ASTAnalyzer
- Compares hashes from SignatureHasher
- Detects what needs documentation updates

**Phase 2 (Content & Mapping):**
- Injects AI-generated content via ContentInjector
- Updates doctype-map.json via DoctypeMapManager
- Stores signature text for future AI context

**Phase 3 (CLI / Executor):**
- Enhances `fix` command with AI
- Adds `--no-ai` and `--auto-commit` flags
- Improves user experience with intelligent output

**Complete Flow:**
```
1. Phase 3: User runs `npx doctype fix`
2. Phase 1: Detect drift via AST analysis
3. Phase 4: Generate docs with AI Agent
4. Phase 2: Inject content into Markdown
5. Phase 2: Update doctype-map.json
6. Phase 4: Auto-commit with git (if requested)
```

## Conclusion

Phase 4 is complete with:
- ✅ AI Agent orchestrator with retry logic
- ✅ OpenAI provider integration (GPT-4, GPT-3.5)
- ✅ Intelligent prompt engineering
- ✅ Git auto-commit functionality
- ✅ CLI integration with `fix` command
- ✅ Graceful degradation and error handling
- ✅ Example usage and documentation
- ✅ Data model updates for AI context

**Doctype is now a fully functional, AI-powered documentation system** that automatically generates high-quality documentation when code signatures change.

**Next Steps:**
- Add comprehensive unit tests for AI module
- Implement Gemini provider
- Add interactive mode for review before injection
- Add parallel processing for multiple symbols
- Implement cost tracking and optimization
