# ContentInjector

Safely injects AI-generated content into Markdown files within Doctype anchor boundaries.

## Overview

<!-- doctype:start id="b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e" code_ref="src/content/content-injector.ts#ContentInjector" -->
The ContentInjector class provides safe content injection into Markdown files. It replaces content between Doctype anchor tags while preserving the anchor comments themselves.

Key features:
- Preserves anchor structure and IDs
- Preview mode (dry-run without file writes)
- Batch injection support
- Anchor validation before injection
- Detailed injection reports
<!-- doctype:end id="b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e" -->

## Installation

```typescript
import { ContentInjector } from 'doctype';
```

## Methods

### `inject(filePath: string, anchorId: string, newContent: string): InjectionResult`

<!-- doctype:start id="c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1f" code_ref="src/content/content-injector.ts#ContentInjector.inject" -->
Injects content into a specific anchor in a Markdown file.

**Parameters:**
- `filePath`: Path to the Markdown file
- `anchorId`: UUID of the anchor to update
- `newContent`: New content to inject (without anchor tags)

**Returns:**
- `InjectionResult` object with operation details

**Example:**
```typescript
const injector = new ContentInjector();
const result = injector.inject(
  'docs/api/utils.md',
  '550e8400-e29b-41d4-a716-446655440000',
  'Updated documentation content here.'
);

if (result.success) {
  console.log('Content injected successfully');
} else {
  console.error(`Injection failed: ${result.error}`);
}
```

**Throws:**
- Error if file cannot be read or written
- Error if anchor not found
<!-- doctype:end id="c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1f" -->

### `injectPreview(filePath: string, anchorId: string, newContent: string): InjectionResult`

<!-- doctype:start id="d8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2a" code_ref="src/content/content-injector.ts#ContentInjector.injectPreview" -->
Previews content injection without modifying the file.

**Parameters:**
- `filePath`: Path to the Markdown file
- `anchorId`: UUID of the anchor
- `newContent`: New content to preview

**Returns:**
- `InjectionResult` with preview of changes

**Example:**
```typescript
const injector = new ContentInjector();
const preview = injector.injectPreview(
  'docs/guide.md',
  'anchor-id',
  'New content'
);

console.log('Old content:', preview.oldContent);
console.log('New content:', preview.newContent);
console.log('Would write:', preview.dryRun);
```
<!-- doctype:end id="d8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2a" -->

### `batchInject(injections: InjectionRequest[]): BatchInjectionResult`

<!-- doctype:start id="e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3b" code_ref="src/content/content-injector.ts#ContentInjector.batchInject" -->
Performs multiple content injections in a single operation.

**Parameters:**
- `injections`: Array of injection requests

**Returns:**
- `BatchInjectionResult` with results for each injection

**Example:**
```typescript
const injector = new ContentInjector();
const results = injector.batchInject([
  {
    filePath: 'docs/api/auth.md',
    anchorId: 'id-1',
    content: 'Updated auth docs'
  },
  {
    filePath: 'docs/api/users.md',
    anchorId: 'id-2',
    content: 'Updated user docs'
  }
]);

console.log(`Success: ${results.successCount}/${results.total}`);
console.log(`Failed: ${results.failureCount}`);
```
<!-- doctype:end id="e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3b" -->

### `validateAnchor(filePath: string, anchorId: string): boolean`

<!-- doctype:start id="f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c" code_ref="src/content/content-injector.ts#ContentInjector.validateAnchor" -->
Validates that an anchor exists and is properly formatted.

**Parameters:**
- `filePath`: Path to the Markdown file
- `anchorId`: UUID of the anchor to validate

**Returns:**
- `true` if anchor is valid, `false` otherwise

**Example:**
```typescript
const injector = new ContentInjector();
const isValid = injector.validateAnchor('docs/api.md', 'anchor-id');

if (isValid) {
  // Safe to inject
  injector.inject('docs/api.md', 'anchor-id', 'New content');
} else {
  console.error('Invalid anchor');
}
```
<!-- doctype:end id="f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c" -->

## Types

### InjectionResult

```typescript
interface InjectionResult {
  success: boolean;
  filePath: string;
  anchorId: string;
  oldContent?: string;
  newContent?: string;
  dryRun: boolean;
  error?: string;
}
```

### InjectionRequest

```typescript
interface InjectionRequest {
  filePath: string;
  anchorId: string;
  content: string;
}
```

### BatchInjectionResult

```typescript
interface BatchInjectionResult {
  total: number;
  successCount: number;
  failureCount: number;
  results: InjectionResult[];
}
```

## How Injection Works

The injector performs these steps:

1. **Read file** - Load Markdown file content
2. **Parse anchors** - Extract all Doctype anchors
3. **Find target** - Locate anchor by ID
4. **Replace content** - Swap old content with new content
5. **Preserve anchors** - Keep anchor comments unchanged
6. **Write file** - Save updated content (unless preview mode)

## Safety Features

### Anchor Preservation

The injector **never modifies** anchor comments:

```markdown
<!-- doctype:start id="abc" code_ref="file.ts#func" -->
This content is replaced
<!-- doctype:end id="abc" -->
```

Only the content between the tags is updated.

### Validation

Before injection, the injector validates:
- File exists and is readable
- Anchor ID exists in the file
- Anchor start and end tags match
- Content is well-formed

### Preview Mode

Always preview changes before applying:

```typescript
const preview = injector.injectPreview('file.md', 'id', 'new content');
if (preview.success) {
  injector.inject('file.md', 'id', 'new content');
}
```

## Examples

### Basic Injection

```typescript
import { ContentInjector } from 'doctype';

const injector = new ContentInjector();
const result = injector.inject(
  'docs/api/auth.md',
  '550e8400-e29b-41d4-a716-446655440000',
  'The loginUser function now requires email and password.'
);

console.log(result.success ? '✓ Injected' : '✗ Failed');
```

### Preview Before Injecting

```typescript
const injector = new ContentInjector();
const preview = injector.injectPreview(
  'docs/guide.md',
  'anchor-123',
  'New documentation content'
);

console.log('Current:', preview.oldContent);
console.log('New:', preview.newContent);

// Apply if satisfied
if (confirm('Apply changes?')) {
  injector.inject('docs/guide.md', 'anchor-123', 'New documentation content');
}
```

### Batch Update

```typescript
const injector = new ContentInjector();

const updates = [
  { filePath: 'docs/api/utils.md', anchorId: 'id-1', content: 'Updated utils' },
  { filePath: 'docs/api/auth.md', anchorId: 'id-2', content: 'Updated auth' },
  { filePath: 'docs/guide.md', anchorId: 'id-3', content: 'Updated guide' }
];

const results = injector.batchInject(updates);

console.log(`✓ ${results.successCount} succeeded`);
console.log(`✗ ${results.failureCount} failed`);

results.results.forEach(r => {
  if (!r.success) {
    console.error(`Failed: ${r.filePath} - ${r.error}`);
  }
});
```

### Validate Before Inject

```typescript
const injector = new ContentInjector();
const file = 'docs/api/example.md';
const anchor = 'my-anchor-id';

if (injector.validateAnchor(file, anchor)) {
  injector.inject(file, anchor, 'Safe to inject!');
} else {
  console.error('Anchor validation failed');
}
```

## See Also

- [MarkdownParser](./markdown-parser.md) - Extract anchors from Markdown
- [DoctypeMapManager](./map-manager.md) - Manage the map file
- [Fix Command](../cli/fix.md) - CLI usage of ContentInjector
