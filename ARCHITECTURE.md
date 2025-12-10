# Sintesi Architecture

This document provides a comprehensive overview of Sintesi's architecture, explaining how the Rust core and TypeScript layers work together to deliver deterministic documentation drift detection and AI-powered automatic fixes.

## Table of Contents

- [System Overview](#system-overview)
- [Core Rust Module](#core-rust-module)
- [TypeScript Layer](#typescript-layer)
- [Complete System Flows](#complete-system-flows)
- [Design Decisions](#design-decisions)

---

## System Overview

Sintesi uses a **hybrid architecture** combining Rust (for performance-critical, deterministic operations) and TypeScript (for orchestration, AI integration, and user interaction).

### Architecture Principles

1. **Deterministic vs Probabilistic Logic**
   - **Deterministic** (Rust): AST parsing, hashing, drift detection → Always produces same output
   - **Probabilistic** (TypeScript): AI-powered documentation generation → Output varies

2. **Single Source of Truth**
   - `sintesi-map.json`: Authoritative record of all documentation anchors and code signature hashes
   - Markdown files: Actual documentation content

3. **Fail-Safe Design**
   - `check` command fails CI when drift detected
   - `fix` command auto-generates corrections via AI

---

## Core Rust Module

The Rust core (`crates/core/`) provides high-performance, deterministic operations through 4 main modules:

### 1. AST Module (`ast/`)

**Purpose:** Static analysis and signature extraction

**Key Technologies:**
- **Oxc Parser**: Ultra-fast TypeScript/JavaScript parser (10-20x faster than TS Compiler API)
- **SHA256**: Cryptographic hashing for deterministic drift detection

**Main Components:**

#### AstAnalyzer
```rust
pub struct AstAnalyzerInternal;

impl AstAnalyzerInternal {
    // Analyzes a TS/JS file and extracts exported symbols
    pub fn analyze_file(&self, file_path: &str, content: &str) -> AnalysisResult;

    // Normalizes signature text (removes comments, whitespace)
    fn normalize_text(&self, text: &str) -> String;
}
```

**Output:**
```rust
CodeSignature {
    symbol_name: "login",
    symbol_type: SymbolType::Function,
    signature_text: "function login(email: string, password: string): Promise<User>",
    is_exported: true,
    hash: Some("b11c7d7e..."), // SHA256
}
```

#### SignatureHasher
```rust
pub struct SignatureHasher;

impl SignatureHasher {
    // Generate SHA256 hash from signature
    pub fn hash(&self, signature: CodeSignature) -> SignatureHash;

    // Batch operation for multiple signatures
    pub fn hash_many(&self, signatures: Vec<CodeSignature>) -> Vec<SignatureHash>;

    // Compare two hashes for drift detection
    pub fn compare(&self, hash1: &str, hash2: &str) -> bool;
}
```

**Why SHA256?**
- Deterministic: Same input always produces same hash
- Fast: Rust implementation is extremely efficient
- Collision-resistant: Changes to signature always produce different hash

---

### 2. Content Module (`content/`)

**Purpose:** File discovery and Markdown processing

**Key Technologies:**
- **ignore crate**: Respects `.gitignore` rules like git
- **pulldown-cmark**: Robust Markdown parser

**Main Components:**

#### FileCollector
```rust
pub fn discover_files(root_path: &str, config: DiscoveryConfig) -> DiscoveryResult;
```

**Features:**
- Respects `.gitignore` by default
- Filters by file extension (.ts, .tsx, .js, .jsx, .md, .mdx)
- Configurable depth and hidden file inclusion

**Output:**
```rust
DiscoveryResult {
    markdown_files: ["docs/api.md", "docs/guide.md"],
    source_files: ["src/auth.ts", "src/utils.ts"],
    total_files: 150,
    errors: 0,
}
```

#### MarkdownExtractor
```rust
pub fn extract_anchors(file_path: &str, content: &str) -> ExtractionResult;
```

**Purpose:** Extracts sintesi anchor tags from Markdown

**Anchor Format:**
```html
<!-- sintesi:start id="uuid" code_ref="src/auth.ts#login" -->
Documentation content here
<!-- sintesi:end id="uuid" -->
```

**Output:**
```rust
SintesiAnchor {
    id: "550e8400-...",
    code_ref: Some("src/auth.ts#login"),
    file_path: "docs/api.md",
    start_line: 42,
    end_line: 58,
    content: "**Purpose:** Authenticates a user...",
}
```

---

### 3. GenAI Module (`genai/`)

**Status:** Implemented but **NOT USED**

**Why TypeScript Instead?**
- TypeScript has better API client libraries (Vercel AI SDK)
- Easier prompt engineering and debugging
- More flexible for rapid iteration
- Better integration with Node.js ecosystem

The TypeScript AI module (`packages/ai/`) handles all LLM interactions.

---

### 4. NAPI Module (`napi/`)

**Purpose:** Node.js bindings layer

**Technology:** [napi-rs](https://napi.rs) - Generates type-safe bindings automatically

**Exports to TypeScript:**
```typescript
// From Rust → TypeScript via NAPI
import {
  AstAnalyzer,
  discoverFiles,
  extractAnchors,
  SymbolType,
} from '@sintesi/core';
```

**Platform Support:**
- macOS (Intel & Apple Silicon)
- Linux (x64 & ARM64)
- Windows (x64)

**Distribution:**
- Separate npm packages per platform: `@sintesi/core-darwin-arm64`, etc.
- Platform-specific binary loaded at runtime

---

## TypeScript Layer

The TypeScript layer (`packages/`) orchestrates the Rust core and provides high-level functionality:

### Package Structure

```
packages/
├── core/          # TypeScript wrapper around Rust NAPI bindings
├── cli/           # Command-line interface (init, check, fix)
├── content/       # Markdown manipulation (TS side)
└── ai/            # AI-powered documentation generation
```

---

### AI Module (`packages/ai/`)

**Architecture:** Structured JSON Output with Deterministic Markdown Building

#### Flow

```
1. AI Request
   ↓
2. Structured Prompt → LLM
   ↓
3. JSON Response {purpose, parameters, returnType, usageExample}
   ↓
4. Zod Schema Validation
   ↓
5. buildMarkdownFromStructure(json) → Consistent Markdown
```

#### Why Structured Output?

**Before (Problems):**
```
AI → Free-form Markdown → Sanitize regex → ❌ JSON artifacts like "},{"
```

**Now (Solution):**
```
AI → Structured JSON → Template → ✅ Perfect Markdown (impossible to have artifacts)
```

**Schema Example:**
```typescript
const DocumentationStructure = z.object({
  symbolName: z.string(),
  purpose: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
    optional: z.boolean().optional(),
  })).optional(),
  returnType: z.object({
    type: z.string(),
    description: z.string(),
  }).optional(),
  usageExample: z.string().optional(),
  notes: z.array(z.string()).optional(),
});
```

**Template Builder:**
```typescript
function buildMarkdownFromStructure(doc: DocumentationStructure): string {
  const parts: string[] = [];

  parts.push(`**Purpose:** ${doc.purpose}`);

  if (doc.parameters?.length) {
    parts.push('\n**Parameters:**');
    doc.parameters.forEach(p => {
      parts.push(`- lexible{p.name}lexible ( lexible{p.type}): ${p.description}`);
    });
  }

  if (doc.returnType) {
    parts.push(`\n**Returns:** lexible{doc.returnType.type}lexible - ${doc.returnType.description}`);
  }

  if (doc.usageExample) {
    parts.push(`\n**Usage Example:**\n\
```typescript
${doc.usageExample}
```\n`);
  }

  return parts.join('\n');
}
```

**Benefits:**
- ✅ Zero JSON artifacts (impossible by design)
- ✅ Consistent formatting (same input = same output)
- ✅ Easier to test (mock JSON, validate Markdown)
- ✅ Maintainable (change template in one place)

---

## Complete System Flows

### INIT Flow (`npx sintesi init`)

**Purpose:** Initialize Sintesi, scan codebase, and scaffold documentation files.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User runs: npx sintesi init                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TypeScript: InitOrchestrator                             │
│    - Interactive prompts (docs folder, map name, etc.)      │
│    - Saves sintesi.config.json                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RUST: discoverFiles(projectRoot)                         │
│    ├─ Scans repo respecting .gitignore                      │
│    ├─ Finds all .ts, .tsx, .js files                        │
│    └─ Returns: ["src/auth.ts", "src/utils.ts", ...]         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RUST: AstAnalyzer.analyzeFile() for each file            │
│    ├─ Oxc parser → AST                                      │
│    ├─ Extracts exported symbols                             │
│    ├─ Normalizes signatures (removes comments/whitespace)   │
│    ├─ Computes SHA256 hash                                  │
│    └─ Returns: CodeSignature[]                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. TypeScript: MarkdownAnchorInserter                       │
│    ├─ Creates docs/ files with strategy (mirror/module/type)│
│    ├─ Inserts anchor tags:                                  │
│    │   <!-- sintesi:start id="uuid" code_ref="..." -->      │
│    │   TODO: Add documentation for this symbol              │
│    │   <!-- sintesi:end id="uuid" -->                       │
│    └─ One anchor per exported symbol                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. TypeScript: SintesiMapManager                            │
│    ├─ Creates sintesi-map.json                              │
│    └─ For each anchor saves real hash (for drift tracking): │
│        {                                                     │
│          id: "uuid",                                         │
│          codeRef: { filePath, symbolName },                 │
│          codeSignatureHash: "b11c7d7e...",                  │
│          docRef: { filePath: "docs/api.md" },               │
│          lastUpdated: 1234567890                             │
│        }                                                     │
└─────────────────────────────────────────────────────────────┘
```

### GENERATE Flow (`npx sintesi generate`)

**Purpose:** Generate initial documentation content using AI by finding TODO placeholders.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User runs: npx sintesi generate                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TypeScript: Identify Work Items                          │
│    ├─ Detect Drift: Hash mismatch (same as check)           │
│    └─ Detect Placeholders:                                  │
│         a. RUST: extractAnchors() scans Markdown            │
│         b. TS: Checks if anchor content contains "TODO"     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TypeScript: FixOrchestrator (Progressive Processing)     │
│    ├─ Uses pMap with concurrency limit (e.g., 5)            │
│    │                                                        │
│    │  [Parallel Task - For each item]                       │
│    │  ┌───────────────────────────────────────────────┐     │
│    │  │ 1. GENERATE (Slow, Network Bound)             │     │
│    │  │    - RUST: Get current CodeSignature          │     │
│    │  │    - TS: Calls AI Agent with retries          │     │
│    │  │    - AI: Returns structured JSON              │     │
│    │  │    - TS: Transforms JSON → Markdown           │     │
│    │  └───────────────────────┬───────────────────────┘     │
│    │                          │                             │
│    │                          ▼                             │
│    │  [File Write - Serialized via Mutex]                   │
│    │  ┌───────────────────────────────────────────────┐     │
│    │  │ 2. WRITE (Fast, I/O Bound)                    │     │
│    │  │    - Acquire FileMutex(path)                  │     │
│    │  │    - Read File → Inject Content → Write File  │     │
│    │  │    - Update & Save Map Immediately            │     │
│    │  │    - Release FileMutex                        │     │
│    │  └───────────────────────────────────────────────┘     │
│    │                                                        │
│    └─ Visual Feedback: Progress bar updates in real-time    │
└─────────────────────────────────────────────────────────────┘
```

---

### CHECK Flow (`npx sintesi check`)

**Purpose:** Verify documentation is in sync with code (for CI)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User runs: npx sintesi check (typically in CI)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TypeScript: Load sintesi-map.json                        │
│    - Read all entries to verify                             │
│    - For each entry:                                        │
│      SAVED_HASH = entry.codeSignatureHash                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RUST: AstAnalyzer.analyzeFile(entry.codeRef.filePath)    │
│    ├─ Re-analyzes the TypeScript file                       │
│    ├─ Finds symbol with name = entry.symbolName             │
│    ├─ Computes CURRENT_HASH of current signature            │
│    └─ Returns: CodeSignature with new hash                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. TypeScript: DriftDetector.detectDrift()                  │
│    ├─ Compare: SAVED_HASH === CURRENT_HASH ?                │
│    │   ✅ Match  → No drift                                 │
│    │   ❌ Differ → DRIFT DETECTED!                          │
│    └─ If any drift found → exit code 1 (fails CI)           │
└─────────────────────────────────────────────────────────────┘
```

**Exit Codes:**
- `0` - All documentation in sync
- `1` - Drift detected (documentation outdated)

---


### FIX Flow (`npx sintesi fix`)

**Purpose:** Automatically fix drift and update documentation.

*Note: `fix` and `generate` share the same underlying `FixOrchestrator` logic.*

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User runs: npx sintesi fix [--auto-commit]               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TypeScript: Run drift detection (same as check)          │
│    - Identify all entries with SAVED_HASH ≠ CURRENT_HASH    │
│    - Collect drift information                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TypeScript: FixOrchestrator                              │
│    ├─ Identical parallel flow as Generate (see above)       │
│    ├─ Context: Uses OLD signature vs NEW signature          │
│    └─ Generates update-specific documentation               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. TypeScript: Git operations (if --auto-commit)            │
│    ├─ git add docs/ sintesi-map.json                        │
│    ├─ git commit -m "🤖 Sintesi: Auto-fix..."              │
│    └─ git push (if configured)                              │
└─────────────────────────────────────────────────────────────┘
```

**Flags:**
- `--dry-run` - Preview changes without writing files
- `--auto-commit` - Automatically commit changes
- `--no-ai` - Use placeholder instead of AI generation

---


## Design Decisions

### Why Rust for Core Operations?

#### Performance
- **Oxc Parser**: 10-20x faster than TypeScript Compiler API
- **Critical for large monorepos**: 1000+ files analyzed in seconds
- **Memory efficient**: Rust's ownership model prevents memory leaks

#### Determinism
- **SHA256 hashing**: Consistent across platforms and Node.js versions
- **Normalization**: Deterministic signature text processing
- **No runtime variations**: Compiled binary behavior is predictable

#### Reliability
- **Memory safety**: No null pointer errors or buffer overflows
- **Type safety**: Compile-time guarantees
- **Cross-platform consistency**: Same behavior on macOS/Linux/Windows

---


### Why TypeScript for AI and Orchestration?

#### Developer Experience
- **Rich ecosystem**: Vercel AI SDK, Zod, yargs, etc.
- **Easier debugging**: Better stack traces and error messages
- **Faster iteration**: No compile step for script changes

#### AI Integration
- **Vercel AI SDK**: Best-in-class TypeScript support
- **Structured Output**: Native Zod schema support
- **Provider flexibility**: Easy to switch between OpenAI/Gemini/Anthropic

#### User Interaction
- **CLI libraries**: yargs for commands, clack for interactive prompts
- **Color output**: chalk for beautiful terminal output
- **Git integration**: simple-git for version control operations

---


### Why Structured JSON Output?

**Problem with Free-Form Markdown:**
```
AI → "**Purpose:** Login user\n```typescript\nlogin();\n```},{"
                                                            ↑↑↑
                                                    JSON artifacts!
```

**Solution with Structured Output:**
```
AI → {purpose: "Login user", usageExample: "login();"}
  ↓
Template → "**Purpose:** Login user\n\n**Usage:**\n```typescript\nlogin();\n```"
                                                                ✅ Clean!
```

**Benefits:**
1. **Impossible to have artifacts** - Template controls all formatting
2. **Consistent output** - Same JSON always produces same Markdown
3. **Easy to validate** - Zod schema catches errors before injection
4. **Maintainable** - Change template in one place, affects all docs

---


### Why Not Use Rust GenAI Module?

**Initial Plan:** Implement AI calls in Rust

**Reality:** TypeScript is better for this use case

**Reasons:**
1. **API Libraries**: Vercel AI SDK is TypeScript-native
2. **Prompt Engineering**: Easier to iterate in TS
3. **Error Handling**: Better debugging experience
4. **Schema Validation**: Zod is excellent and TS-native
5. **No Performance Benefit**: API calls are I/O bound (network latency dominates)

**Result:** Rust handles compute-intensive tasks (parsing, hashing), TypeScript handles I/O and user interaction

---


## Data Model

### sintesi-map.json Structure

**Design Principles:**
- Minimal metadata only (no content duplication)
- Single source of truth for tracking
- ID-based lookup (no fragile line numbers)

**Schema:**
```typescript
{
  "version": "1.0.0",
  "entries": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "codeRef": {
        "filePath": "src/auth/login.ts",
        "symbolName": "login"
      },
      "codeSignatureHash": "b11c7d7e3f2a9c8d1e4f5a6b7c8d9e0f",
      "codeSignatureText": "function login(email: string, password: string): Promise<User>",
      "docRef": {
        "filePath": "docs/auth/login.md"
      },
      "lastUpdated": 1704067200000
    }
  ]
}
```

**Why this structure?**
- `id`: UUID for stable anchor references
- `codeSignatureHash`: SHA256 for drift detection (deterministic)
- `codeSignatureText`: Human-readable signature (for AI context)
- `docRef.filePath`: Points to Markdown (content lives there, not in map)
- `lastUpdated`: Timestamp for audit trail

---


## Performance Characteristics

### File Discovery
- **Small repos (<100 files)**: ~10ms
- **Large repos (1000+ files)**: ~100-200ms
- **Huge monorepos (10k+ files)**: ~1-2s

**Bottleneck:** Disk I/O, not CPU

### AST Analysis
- **Per file**: ~1-5ms (Oxc parser)
- **100 files**: ~500ms total
- **1000 files**: ~3-5s total

**Bottleneck:** Parsing complexity (large files with complex types)

### Hash Computation
- **Per signature**: ~0.1ms (SHA256)
- **1000 signatures**: ~100ms total

**Bottleneck:** Negligible (crypto is fast in Rust)

### AI Generation (Parallelized)
- **Per symbol**: ~2-5s (network + LLM)
- **Concurrency**: 5 parallel requests
- **Orchestration**: Processing is batched in parallel, but file writing is sequential per file for safety.

**Bottleneck:** API latency (network + LLM inference time)

---


## Future Enhancements

### Potential Improvements

1. **Incremental Analysis**
   - Cache AST results per file
   - Only re-analyze changed files
   - Would speed up check/fix by 10x for large repos

2. **Parallel Processing**
   - Analyze multiple files concurrently
   - Current: Sequential (to avoid OOM)
   - Future: Thread pool with memory limits

3. **Advanced AI Features**
   - Context-aware generation (analyze imports/usage)
   - Structured output for complex types (generics, mapped types)
   - Support for JSDoc preservation

4. **Additional Languages**
   - Python support (using Ruff parser)
   - Go support (using tree-sitter)
   - Rust support (using syn crate)

---


## Conclusion

Sintesi's hybrid architecture leverages the strengths of both Rust and TypeScript:

- **Rust**: Fast, deterministic, safe for core operations
- **TypeScript**: Flexible, rich ecosystem, great DX for orchestration

This design enables:
- ✅ **Performance**: Analyze 1000+ files in seconds
- ✅ **Reliability**: Deterministic drift detection
- ✅ **Maintainability**: Clean separation of concerns
- ✅ **Quality**: AI-powered documentation that's always in sync

The structured JSON output approach eliminates entire classes of bugs (formatting artifacts) by design, demonstrating how architectural choices can make bugs impossible rather than just unlikely.
