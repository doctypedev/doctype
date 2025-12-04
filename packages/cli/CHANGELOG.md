# @doctypedev/doctype

## 0.4.0

### Minor Changes

- 3794e03: Rewrited doctype core using Rust to improve performance
- b596675: Implement signature-hasher in Rust code instead of Typescript to improve performances

### Patch Changes

- Updated dependencies [3794e03]
- Updated dependencies [b596675]
  - @doctypedev/core@0.4.0

## 0.3.33

### Patch Changes

- c1b56c9: Multi-Provider AI Support in CLI
- Updated dependencies [c1b56c9]
  - @doctypedev/core@0.3.33

## 0.3.32

### Patch Changes

- 9adca9f: Improve pipeline by avoiding release of native packages when not really needed
- Updated dependencies [9adca9f]
  - @doctypedev/core@0.3.32

## 0.3.31

### Patch Changes

- Updated dependencies [5f4970b]
  - @doctypedev/core@0.3.31

## 0.3.30

### Patch Changes

- Updated dependencies [5106561]
  - @doctypedev/core@0.3.29

## 0.3.29

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

- Updated dependencies [5043fe7]
  - @doctypedev/core@0.3.28

## 0.3.28

### Patch Changes

- 2d148d4: Migrate to pnpm workspaces, refactor core package, and automate releases.
- Updated dependencies [2d148d4]
  - @doctypedev/core@0.3.27
