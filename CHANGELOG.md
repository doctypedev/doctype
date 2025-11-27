# Changelog

All notable changes to Doctype will be documented in this file.

## [Unreleased]

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
  - Phase 3: CLI / Executor (planned)
  - Phase 4: Gen AI Agent (planned)
