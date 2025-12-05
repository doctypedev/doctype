---
"@doctypedev/core": patch
"@doctypedev/doctype": patch
---

Remove redundant fields from doctype-map.json to make it more robust and maintainable

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
