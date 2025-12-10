# @doctypedev/core

## 0.7.0

### Minor Changes

- 5c2f805: - Introduce new `doctype readme` command to generate a README.md based on project context
  - Add project context analysis capabilities to improve documentation generation
  - Enhance AI generation logic for README content based on recent code changes

## 0.6.0

### Minor Changes

- 8f1f8bf: - Introduce interactive main menu for improved user experience
  - Add new commands for initializing configuration and checking documentation drift
  - Enhance CLI functionality with additional options for user actions

## 0.5.1

## 0.5.0

### Minor Changes

- c4cbf88: - Add support for Linux and Windows native binaries

## 0.4.5

## 0.4.4

### Patch Changes

- ff5a3db: Update optional dependencies for new native core release
- 246079e: Remove redundant fields from doctype-map.json to make it more robust and maintainable

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

## 0.4.3

## 0.4.2

### Patch Changes

- f314c60: Fix deprecated optional dependency

## 0.4.1

### Patch Changes

- 61fa11b: Update optionalDependencies to force download 0.4.x native core

## 0.4.0

### Minor Changes

- 3794e03: Rewrited doctype core using Rust to improve performance
- b596675: Implement signature-hasher in Rust code instead of Typescript to improve performances

## 0.3.33

### Patch Changes

- c1b56c9: Multi-Provider AI Support in CLI

## 0.3.32

### Patch Changes

- 9adca9f: Improve pipeline by avoiding release of native packages when not really needed

## 0.3.31

### Patch Changes

- 5f4970b: Align versions

## 0.3.29

### Patch Changes

- 5106561: Align versions

## 0.3.28

### Patch Changes

- 5043fe7: Replace TypeScript markdown parser with Rust NAPI implementation using pulldown-cmark

  - Migrate markdown extraction logic from TypeScript to Rust for improved performance
  - Use pulldown-cmark for proper Markdown AST parsing (best practice, avoids regex fragility)
  - Automatically ignores HTML comments in code blocks (impossible with regex)
  - Add `extractAnchors`, `validateMarkdownAnchors`, and `parseCodeRef` functions via NAPI bindings
  - Remove `@doctypedev/core-native` workspace dependency (not needed)
  - Add type definitions for markdown extraction to native-types.d.ts
  - Remove old packages/content/markdown-parser.ts file
  - Maintain 0-indexed line numbers for TypeScript compatibility

## 0.3.27

### Patch Changes

- 2d148d4: Migrate to pnpm workspaces, refactor core package, and automate releases.
