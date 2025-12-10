# Sintesi Source Code

This directory contains the core implementation of Sintesi, organized into four independent modules that work together to provide automatic documentation synchronization.

## Architecture Overview

Sintesi is built with a layered architecture combining **deterministic** and **probabilistic** logic:

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Module                           │
│              Entry point & Commands                     │
│         (npx sintesi check | fix | init)                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────────┐
│ Core Module  │          │  Content Module  │
│              │          │                  │
│ AST Analysis │◄────────►│ Markdown Parsing │
│ Drift        │          │ Map Management   │
│ Detection    │          │ Content Injection│
└──────┬───────┘          └────────┬─────────┘
       │                           │
       └────────────┬──────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   AI Module     │
           │                 │
           │ OpenAI Provider │
           │ Prompt Builder  │
           └─────────────────┘
```

## Modules

### 📁 [core/](./core) - AST & Drift Detection

**Deterministic logic layer** for code analysis and signature tracking.

- **ASTAnalyzer**: Extracts TypeScript function/class signatures using ts-morph
- **SignatureHasher**: Generates SHA256 hashes for deterministic drift detection
- **Types & Models**: Core data structures for signature representation

**Key Responsibilities:**
- Parse TypeScript files into Abstract Syntax Trees
- Extract public API signatures (functions, classes, interfaces)
- Generate deterministic hashes for change detection

### 📁 [content/](./content) - Content & Mapping

**Data management layer** for documentation tracking and content manipulation.

- **MarkdownParser**: Extracts documentation anchors from Markdown files
- **SintesiMapManager**: Manages `sintesi-map.json` (single source of truth)
- **ContentInjector**: Updates Markdown files with new documentation

**Key Responsibilities:**
- Parse and validate HTML comment anchors in Markdown
- Track relationships between code signatures and documentation
- Inject updated content while preserving formatting

### 📁 [cli/](./cli) - CLI / Executor

**User interface layer** providing command-line access to all functionality.

- **check**: Verify documentation is in sync (`exit code 0 = synced, 1 = drift`)
- **fix**: Update documentation when drift is detected
- **init**: Initialize sintesi-map.json for a project
- **Logger**: Professional CLI output with colors and formatting
- **GitHelper**: Auto-commit functionality with standardized messages

**Key Responsibilities:**
- Parse command-line arguments
- Orchestrate module interactions
- Display results and manage git operations

### 📁 [ai/](./ai) - Gen AI Agent

**Probabilistic logic layer** for intelligent documentation generation.

- **AIAgent**: Main orchestrator for AI-powered content generation
- **PromptBuilder**: Context-aware prompt engineering for better results
- **OpenAIProvider**: Integration with OpenAI GPT-4/GPT-3.5-turbo
- **Base abstractions**: Provider interface for multi-vendor support

**Key Responsibilities:**
- Generate intelligent, context-aware documentation
- Handle API communication with retry logic
- Gracefully degrade to placeholder content when unavailable

## Data Flow

### Check Command Flow

```
User runs: npx sintesi check

1. CLI loads sintesi-map.json (Content Module)
2. For each entry:
   a. AST Analyzer extracts current signature (Core Module)
   b. Signature Hasher generates current hash (Core Module)
   c. Compare current hash vs saved hash (Content Module)
3. Report drift status (CLI Module)
4. Exit with code 0 (no drift) or 1 (drift detected)
```

### Fix Command Flow

```
User runs: npx sintesi fix

1. Detect drift (same as check command)
2. For each drifted entry:
   a. Extract old and new signatures (Core Module)
   b. Generate documentation via AI (AI Module)
      OR use placeholder if --no-ai flag
   c. Inject content into Markdown (Content Module)
   d. Update hash in sintesi-map.json (Content Module)
3. Save updated map (Content Module)
4. Auto-commit if --auto-commit flag (CLI Module)
5. Report results (CLI Module)
```

## Key Design Principles

### 1. **Separation of Concerns**

Each module has a single, well-defined responsibility:
- **Core**: Code analysis (deterministic)
- **Content**: Data management and manipulation
- **CLI**: User interaction and orchestration
- **AI**: Smart content generation (probabilistic)

### 2. **Deterministic + Probabilistic**

The architecture combines two layers:
- **Deterministic**: AST analysis and hash comparison never change for the same input
- **Probabilistic**: AI generation can vary, but is isolated to the AI module

This ensures drift detection is always reliable, while documentation quality improves with AI.

### 3. **Single Source of Truth**

The `sintesi-map.json` file is the authoritative record for:
- All documentation anchors in the repository
- Current code signature hashes
- Relationships between code and documentation

### 4. **Graceful Degradation**

The system works in multiple modes:
- **Full AI**: Best quality documentation (requires API key)
- **Placeholder**: Automatic fallback when AI unavailable
- **Dry-run**: Preview changes without writing files

## Testing

Each module has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests for specific module
npm test src/core
npm test src/content
npm test src/cli
npm test src/ai
```

## Development

### Building

```bash
npm run build
```

Outputs to `dist/`:
- `dist/cli/` - Compiled CLI entry point
- `dist/core/` - Compiled core module
- `dist/content/` - Compiled content module
- `dist/ai/` - Compiled AI module

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Type Checking

```bash
npm run typecheck
```

## Module Dependencies

```
cli ──┬──> core
      ├──> content
      └──> ai

ai ───> core

content ──> core

core ──> (no dependencies)
```

The dependency graph is **acyclic** - core module has no dependencies, ensuring clean separation of concerns.

## Further Reading

- **[Core Module Documentation](./core/README.md)**
- **[Content Module Documentation](./content/README.md)**
- **[CLI Module Documentation](./cli/README.md)**
- **[AI Module Documentation](./ai/README.md)**
