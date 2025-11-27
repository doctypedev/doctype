# MarkdownParser

Parses Markdown files and extracts Doctype anchors from HTML comments.

## Overview

<!-- doctype:start id="f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c" code_ref="src/content/markdown-parser.ts#MarkdownParser" -->
The MarkdownParser class extracts Doctype anchors from Markdown files. It scans for special HTML comment tags that mark documentation sections managed by Doctype.

Anchor format:
```markdown
<!-- doctype:start id="uuid" code_ref="file.ts#symbol" -->
Content between anchors
<!-- doctype:end id="uuid" -->
```

The parser validates anchor structure, detects errors (unclosed anchors, duplicate IDs), and preserves the original content for context.
<!-- doctype:end id="f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c" -->

## Installation

```typescript
import { MarkdownParser } from 'doctype';
```

## Methods

### `parseFile(filePath: string): DoctypeAnchor[]`

<!-- doctype:start id="a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d" code_ref="src/content/markdown-parser.ts#MarkdownParser.parseFile" -->
Parses a Markdown file and extracts all Doctype anchors.

**Parameters:**
- `filePath`: Path to the Markdown file

**Returns:**
- Array of `DoctypeAnchor` objects

**Example:**
```typescript
const parser = new MarkdownParser();
const anchors = parser.parseFile('docs/api/utils.md');

anchors.forEach(anchor => {
  console.log(`ID: ${anchor.id}`);
  console.log(`Code Ref: ${anchor.codeRef}`);
  console.log(`Lines: ${anchor.startLine}-${anchor.endLine}`);
});
```

**Throws:**
- Error if file cannot be read
- Error if anchor format is invalid
- Error if anchors are not properly closed
<!-- doctype:end id="a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d" -->

### `parseContent(content: string): DoctypeAnchor[]`

<!-- doctype:start id="b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e" code_ref="src/content/markdown-parser.ts#MarkdownParser.parseContent" -->
Parses Markdown content string and extracts all Doctype anchors.

**Parameters:**
- `content`: Markdown content as a string

**Returns:**
- Array of `DoctypeAnchor` objects

**Example:**
```typescript
const markdown = `
# API Reference

<!-- doctype:start id="test-123" code_ref="src/api.ts#myFunc" -->
This function does something cool.
<!-- doctype:end id="test-123" -->
`;

const parser = new MarkdownParser();
const anchors = parser.parseContent(markdown);
```
<!-- doctype:end id="b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e" -->

### `validateAnchors(filePath: string): ValidationResult`

<!-- doctype:start id="c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f" code_ref="src/content/markdown-parser.ts#MarkdownParser.validateAnchors" -->
Validates anchor structure in a Markdown file without extracting content.

**Parameters:**
- `filePath`: Path to the Markdown file

**Returns:**
- `ValidationResult` object with validation status and errors

**Example:**
```typescript
const parser = new MarkdownParser();
const result = parser.validateAnchors('docs/guide.md');

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(err => console.error(`  - ${err}`));
}
```
<!-- doctype:end id="c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f" -->

## Types

### DoctypeAnchor

```typescript
interface DoctypeAnchor {
  id: string;           // Unique UUID from anchor comment
  startLine: number;    // Starting line (0-indexed)
  endLine: number;      // Ending line (0-indexed)
  content: string;      // Content between anchor tags
  codeRef: string;      // Code reference (format: file_path#symbol_name)
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

## Anchor Format

### Valid Anchor

```markdown
<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440000" code_ref="src/utils.ts#calculateTotal" -->
This function calculates the total price including tax.
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440000" -->
```

### Required Attributes

- `id`: Must be a valid UUID format
- `code_ref`: Must follow `file_path#symbol_name` format

### Code Reference Format

The `code_ref` attribute uses the format:
```
path/to/file.ts#symbolName
```

Examples:
- `src/utils.ts#calculateTotal`
- `src/api/auth.ts#loginUser`
- `packages/core/index.ts#DoctypeMap`

## Error Detection

The parser detects:

1. **Unclosed anchors**
   ```markdown
   <!-- doctype:start id="123" code_ref="file.ts#func" -->
   Missing end tag!
   ```

2. **Duplicate IDs**
   ```markdown
   <!-- doctype:start id="123" code_ref="a.ts#foo" -->
   ...
   <!-- doctype:end id="123" -->

   <!-- doctype:start id="123" code_ref="b.ts#bar" -->
   Error: ID "123" used twice!
   <!-- doctype:end id="123" -->
   ```

3. **Invalid format**
   ```markdown
   <!-- doctype:start id="abc" -->
   Error: Missing code_ref attribute!
   <!-- doctype:end id="abc" -->
   ```

## Examples

### Extract All Anchors

```typescript
import { MarkdownParser } from 'doctype';

const parser = new MarkdownParser();
const anchors = parser.parseFile('README.md');

console.log(`Found ${anchors.length} anchors`);
anchors.forEach(anchor => {
  console.log(`\n${anchor.id}`);
  console.log(`  Code: ${anchor.codeRef}`);
  console.log(`  Content: ${anchor.content.substring(0, 50)}...`);
});
```

### Validate Before Processing

```typescript
const parser = new MarkdownParser();
const validation = parser.validateAnchors('docs/api.md');

if (validation.valid) {
  const anchors = parser.parseFile('docs/api.md');
  // Process anchors...
} else {
  console.error('Invalid anchors found');
  validation.errors.forEach(err => console.error(err));
}
```

### Parse Inline Content

```typescript
const parser = new MarkdownParser();
const content = readFileSync('guide.md', 'utf-8');
const anchors = parser.parseContent(content);

for (const anchor of anchors) {
  const [filePath, symbolName] = anchor.codeRef.split('#');
  console.log(`Symbol: ${symbolName} in ${filePath}`);
}
```

## See Also

- [DoctypeMapManager](./map-manager.md) - Manage the doctype-map.json file
- [ContentInjector](./content-injector.md) - Inject content into anchors
- [Core Concepts](../guide/core-concepts.md) - Understanding anchors
