# Changelog

All notable changes to Doctype will be documented in this file.

## [Unreleased]

### Phase 4 - Gen AI Agent (2025-11-27)

#### Added
- **AI Agent Module** (`src/ai/`) for AI-powered documentation generation
  - Main orchestrator (AIAgent class)
  - Prompt engineering (PromptBuilder)
  - OpenAI provider integration (GPT-4, GPT-3.5-turbo)
  - Base provider abstraction for future providers
  - Retry logic with exponential backoff
  - Connection validation

- **OpenAI Integration** (`src/ai/providers/openai-provider.ts`)
  - Chat Completions API support
  - Configurable models, tokens, temperature
  - Usage statistics tracking
  - Detailed error messages
  - Timeout handling

- **Prompt Engineering** (`src/ai/prompt-builder.ts`)
  - System prompt with technical writer persona
  - Context-aware user prompts
  - Signature comparison and change detection
  - Customizable generation styles (concise, detailed, tutorial)

- **Git Auto-Commit** (`src/cli/git-helper.ts`)
  - Repository validation
  - File staging and commit creation
  - Standard commit message format
  - Optional push to remote
  - Integration with fix command

- **Enhanced Fix Command**
  - AI-powered documentation generation
  - Automatic fallback to placeholder content
  - `--no-ai` flag to disable AI
  - `--auto-commit` flag for git operations
  - Provider connection validation
  - Enhanced error handling

- **Data Model Updates**
  - Added `codeSignatureText` to `DoctypeMapEntry`
  - Stores signature for AI context in future runs

- **Example Usage** (`src/examples/phase4-ai-integration.ts`)
  - Complete AI integration examples
  - Error handling demonstrations
  - Workflow examples with AST analysis

#### Environment Variables
- `OPENAI_API_KEY`: Required for OpenAI-powered documentation
- `GEMINI_API_KEY`: Reserved for future Gemini support

#### Documentation
- Created `PHASE4.md` with comprehensive Phase 4 documentation
- AI Agent architecture and design
- Integration examples
- Performance and cost considerations
- Security best practices

#### Dependencies
- No new dependencies required (uses native fetch API)

---

### Phase 3 - CLI / Executor (2025-11-27)

#### Added
- **CLI Module** for command-line interface
  - `npx doctype check` command for drift detection
  - `npx doctype fix` command for documentation updates
  - Colored console output with Logger module
  - Verbose logging support
  - Dry-run mode for preview

- **Check Command** (`cli/check.ts`)
  - Verifies documentation is in sync with code
  - Compares current code signatures with saved hashes
  - Reports detailed drift information
  - Exits with error code for CI/CD integration

- **Fix Command** (`cli/fix.ts`)
  - Updates documentation when drift detected
  - Generates placeholder content (Phase 3) or AI content (Phase 4)
  - Supports dry-run mode for preview
  - Updates doctype-map.json with new hashes
  - Auto-commit flag (placeholder for Phase 4)

- **Logger** (`cli/logger.ts`)
  - Colored terminal output (ANSI codes)
  - Multiple log levels: error, warn, info, success, debug
  - Formatted helpers for paths, symbols, hashes
  - Section headers and dividers

- **CLI Types** (`cli/types.ts`)
  - CheckResult, DriftDetail interfaces
  - FixResult, FixDetail interfaces
  - CLIConfig, CheckOptions, FixOptions

#### Testing
- Added 12 comprehensive CLI tests (all passing)
- Check command: 6 tests
- Fix command: 6 tests
- Total project tests: 114 (102 from Phases 1 & 2 + 12 from Phase 3)

#### Documentation
- Created `src/cli/README.md` with detailed CLI usage
- Created `docs/PHASE3.md` with phase documentation
- CI/CD integration examples (GitHub Actions, GitLab CI)
- Pre-commit hook example

#### Build & Infrastructure
- Configured bin entry point in package.json
- CLI entry point with yargs argument parsing
- Error handling and user-friendly messages

---

### Phase 2 - Content & Mapping (2025-11-27)

#### Added
- **MarkdownParser** module for parsing Markdown files and extracting doctype anchors
  - Support for HTML comment-based anchor syntax
  - Validation of anchor format and structure
  - Whitespace and indentation preservation
  - Code reference parsing (`file_path#symbol_name`)

- **DoctypeMapManager** module for managing `doctype-map.json`
  - CRUD operations for map entries
  - Drift detection capabilities
  - Query by ID, code reference, or documentation file
  - Automatic persistence to disk

- **ContentInjector** module for injecting content into Markdown files
  - Safe replacement between anchor tags
  - Preview mode (no file writes)
  - Batch injection support
  - Anchor validation and location detection

- **Dependencies**:
  - `uuid` for anchor ID generation
  - `@types/uuid` for TypeScript support

#### Testing
- Added 58 comprehensive unit tests for Phase 2 modules
- Total project tests: 102 (all passing)
- Test coverage for:
  - Markdown parsing and validation
  - Map management operations
  - Content injection scenarios
  - Error handling and edge cases

#### Documentation
- Created `docs/PHASE2.md` with detailed module documentation
- Added integration example in `src/examples/phase2-integration.ts`
- Added test fixtures in `src/content/__tests__/fixtures/`

#### Build & Infrastructure
- Updated main export file (`src/index.ts`) with Phase 2 modules
- Created content module index (`src/content/index.ts`)
- TypeScript compilation successful with strict mode

---

### Phase 1 - Core AST & Drift Detection (2025-11-26)

#### Added
- **ASTAnalyzer** module for TypeScript AST analysis
  - Extract function, class, interface, type, enum, and variable signatures
  - Filter for exported symbols only
  - Normalize signatures for deterministic hashing

- **SignatureHasher** module for SHA256 hash generation
  - Deterministic hash generation from code signatures
  - Batch hashing support
  - Hash comparison utilities

- **Type System** (`src/core/types.ts`)
  - Core interfaces: `CodeRef`, `CodeSignature`, `SignatureHash`
  - Documentation interfaces: `DocRef`, `DoctypeMapEntry`, `DoctypeMap`
  - Symbol type enumeration

#### Testing
- Added 44 comprehensive unit tests for Phase 1 modules
- Test coverage for:
  - AST analysis of various TypeScript constructs
  - Signature hashing and comparison
  - Edge cases and error handling

#### Dependencies
- `ts-morph` for TypeScript AST manipulation
- `yargs` for CLI argument parsing
- `vitest` for testing framework
- `typescript` compiler

#### Build & Infrastructure
- Initial project setup with TypeScript
- Vitest configuration for unit testing
- TSConfig with strict type checking
- NPM scripts for build, test, and development

---

## Version History

- **v0.1.0** - Initial development
  - Phase 1: Core AST & Drift Detection ✅
  - Phase 2: Content & Mapping ✅
  - Phase 3: CLI / Executor ✅
  - Phase 4: Gen AI Agent ✅
