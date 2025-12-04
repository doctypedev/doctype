# @doctypedev/core

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
