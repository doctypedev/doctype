# @sintesi/sintesi

## 0.7.0

### Minor Changes

- 5c2f805: - Introduce new `sintesi readme` command to generate a README.md based on project context
  - Add project context analysis capabilities to improve documentation generation
  - Enhance AI generation logic for README content based on recent code changes

### Patch Changes

- Updated dependencies [5c2f805]
  - @sintesi/core@0.7.0

## 0.6.0

### Minor Changes

- 3a53ff8: - **New**: `sintesi check` now detects "untracked" symbols (exported code not yet in the map).
  - **New**: Added `--prune` flag to `sintesi fix` to remove dead documentation entries.
  - **Fix**: Huge performance improvement in drift detection via AST caching.
  - **Fix**: Filtered out local variables from being documented as public APIs.
- 8f1f8bf: - Introduce interactive main menu for improved user experience
  - Add new commands for initializing configuration and checking documentation drift
  - Enhance CLI functionality with additional options for user actions

### Patch Changes

- Updated dependencies [8f1f8bf]
  - @sintesi/core@0.6.0

## 0.5.1

### Patch Changes

- 5f99b28: - Update dependencies to include 'glob' package
  - @sintesi/core@0.5.1

## 0.5.0

### Minor Changes

- ec3282d: Prevent duplicate code reference processing within a single run
- c1eebb3: - Enhance scanAndCreateAnchors function to handle existing markdown anchors more effectively
  - Improve error handling and reporting for anchor creation
- c4cbf88: - Add support for Linux and Windows native binaries
- c17c494: Enhance scanAndCreateAnchors function to handle existing markdown anchors more effectively
- 944c25f: Add retry mechanism for AI generation and improve errors logging
- 22c019d: Introduced sintesi generate command, implemented concurrent AI processing for faster performance, and simplified the initialization workflow.
- a1499d2: Implement progressive saving with thread-safe file writing
- 6ca2448: Implement changeset command for generating changesets from code changes using AI.

### Patch Changes

- Updated dependencies [c4cbf88]
  - @sintesi/core@0.5.0

## 0.4.5

### Patch Changes

- f203ff1: Implement structured JSON output with deterministic Markdown builder
  - @sintesi/core@0.4.5

## 0.4.4

### Patch Changes

- 0f57003: Implemented strict AI content sanitization to protect anchors and added resilient batch processing with partial success and smart retries.
- 246079e: Remove redundant fields from sintesi-map.json to make it more robust and maintainable

  - Remove `originalMarkdownContent` - Content is now read from markdown files at runtime
  - Remove `startLine` and `endLine` from DocRef - Use ID-based anchor lookup instead
  - Update all TypeScript and Rust type definitions
  - Update CLI commands (check, fix, init) to use simplified schema
  - Update ContentInjector and MarkdownAnchorInserter
  - Update all tests to reflect new schema
  - Update CLAUDE.md documentation

  Benefits:

  - Single source of truth: Markdown files contain the actual content
  - No content duplication in map file
  - More resilient to manual markdown edits (no fragile line numbers)
  - Smaller map file size
  - Simpler architecture

- Updated dependencies [ff5a3db]
- Updated dependencies [246079e]
  - @sintesi/core@0.4.4

## 0.4.3

### Patch Changes

- 098c13b: Integrate multi-provider AI to generate documentation
  Integrate Vercel AI SDK to create/update documentation on init and fix.
  - @sintesi/core@0.4.3

## 0.4.2

### Patch Changes

- f314c60: Fix deprecated optional dependency
- Updated dependencies [f314c60]
  - @sintesi/core@0.4.2

## 0.4.1

### Patch Changes

- 61fa11b: Update optionalDependencies to force download 0.4.x native core
- Updated dependencies [61fa11b]
  - @sintesi/core@0.4.1

## 0.4.0

### Minor Changes

- 3794e03: Rewrited sintesi core using Rust to improve performance
- b596675: Implement signature-hasher in Rust code instead of Typescript to improve performances

### Patch Changes

- Updated dependencies [3794e03]
- Updated dependencies [b596675]
  - @sintesi/core@0.4.0

## 0.3.33

### Patch Changes

- c1b56c9: Multi-Provider AI Support in CLI
- Updated dependencies [c1b56c9]
  - @sintesi/core@0.3.33

## 0.3.32

### Patch Changes

- 9adca9f: Improve pipeline by avoiding release of native packages when not really needed
- Updated dependencies [9adca9f]
  - @sintesi/core@0.3.32

## 0.3.31

### Patch Changes

- Updated dependencies [5f4970b]
  - @sintesi/core@0.3.31

## 0.3.30

### Patch Changes

- Updated dependencies [5106561]
  - @sintesi/core@0.3.29

## 0.3.29

### Patch Changes

- 5043fe7: Replace TypeScript markdown parser with Rust NAPI implementation using pulldown-cmark

  - Migrate markdown extraction logic from TypeScript to Rust for improved performance
  - Use pulldown-cmark for proper Markdown AST parsing (best practice, avoids regex fragility)
  - Automatically ignores HTML comments in code blocks (impossible with regex)
  - Add `extractAnchors`, `validateMarkdownAnchors`, and `parseCodeRef` functions via NAPI bindings
  - Remove `@sintesi/core-native` workspace dependency (not needed)
  - Add type definitions for markdown extraction to native-types.d.ts
  - Remove old packages/content/markdown-parser.ts file
  - Maintain 0-indexed line numbers for TypeScript compatibility

- Updated dependencies [5043fe7]
  - @sintesi/core@0.3.28

## 0.3.28

### Patch Changes

- 2d148d4: Migrate to pnpm workspaces, refactor core package, and automate releases.
- Updated dependencies [2d148d4]
  - @sintesi/core@0.3.27
