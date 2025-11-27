# DoctypeMapManager

Manages the doctype-map.json file - the single source of truth for Doctype anchors.

## Overview

<!-- doctype:start id="d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a" code_ref="src/content/map-manager.ts#DoctypeMapManager" -->
The DoctypeMapManager class provides CRUD operations for the doctype-map.json file. This file tracks all documentation anchors, their associated code references, signature hashes, and original content.

Key responsibilities:
- Load and save doctype-map.json
- Add, update, query, and remove entries
- Detect drift by comparing current vs saved hashes
- Maintain data integrity and handle errors
<!-- doctype:end id="d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a" -->

## Installation

```typescript
import { DoctypeMapManager } from 'doctype';
```

## Constructor

### `new DoctypeMapManager(mapFilePath?: string)`

<!-- doctype:start id="e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b" code_ref="src/content/map-manager.ts#DoctypeMapManager.constructor" -->
Creates a new manager instance for a doctype-map.json file.

**Parameters:**
- `mapFilePath` (optional): Path to the map file. Defaults to `./doctype-map.json`

**Example:**
```typescript
// Use default path
const manager = new DoctypeMapManager();

// Use custom path
const manager = new DoctypeMapManager('./docs/doctype-map.json');
```
<!-- doctype:end id="e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b" -->

## Methods

### `load(): DoctypeMap`

<!-- doctype:start id="f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c" code_ref="src/content/map-manager.ts#DoctypeMapManager.load" -->
Loads the doctype-map.json file.

**Returns:**
- `DoctypeMap` object containing all entries

**Example:**
```typescript
const manager = new DoctypeMapManager();
const map = manager.load();
console.log(`Loaded ${map.entries.length} entries`);
```

**Throws:**
- Error if file doesn't exist or is invalid JSON
<!-- doctype:end id="f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c" -->

### `save(map: DoctypeMap): void`

<!-- doctype:start id="a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d" code_ref="src/content/map-manager.ts#DoctypeMapManager.save" -->
Saves the doctype map to the JSON file.

**Parameters:**
- `map`: DoctypeMap object to save

**Example:**
```typescript
const manager = new DoctypeMapManager();
const map = manager.load();

// Modify map...
map.entries.push(newEntry);

// Save changes
manager.save(map);
```

**Throws:**
- Error if file cannot be written
<!-- doctype:end id="a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d" -->

### `addEntry(entry: DoctypeMapEntry): void`

<!-- doctype:start id="b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e" code_ref="src/content/map-manager.ts#DoctypeMapManager.addEntry" -->
Adds a new entry to the map.

**Parameters:**
- `entry`: DoctypeMapEntry to add

**Example:**
```typescript
const manager = new DoctypeMapManager();
manager.addEntry({
  id: '550e8400-e29b-41d4-a716-446655440000',
  code_ref: {
    file_path: 'src/utils.ts',
    symbol_name: 'calculateTotal'
  },
  code_signature_hash: 'abc123...',
  doc_ref: {
    file_path: 'docs/api/utils.md',
    start_line: 10,
    end_line: 15
  },
  original_markdown_content: 'Calculates total price...'
});
```

**Throws:**
- Error if entry with same ID already exists
<!-- doctype:end id="b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e" -->

### `updateEntry(id: string, updates: Partial<DoctypeMapEntry>): void`

<!-- doctype:start id="c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f" code_ref="src/content/map-manager.ts#DoctypeMapManager.updateEntry" -->
Updates an existing entry in the map.

**Parameters:**
- `id`: UUID of the entry to update
- `updates`: Partial entry object with fields to update

**Example:**
```typescript
const manager = new DoctypeMapManager();

// Update just the hash
manager.updateEntry('550e8400-e29b-41d4-a716-446655440000', {
  code_signature_hash: 'newHash123...'
});
```

**Throws:**
- Error if entry not found
<!-- doctype:end id="c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f" -->

### `removeEntry(id: string): void`

<!-- doctype:start id="d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a" code_ref="src/content/map-manager.ts#DoctypeMapManager.removeEntry" -->
Removes an entry from the map.

**Parameters:**
- `id`: UUID of the entry to remove

**Example:**
```typescript
const manager = new DoctypeMapManager();
manager.removeEntry('550e8400-e29b-41d4-a716-446655440000');
```

**Throws:**
- Error if entry not found
<!-- doctype:end id="d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a" -->

### `queryById(id: string): DoctypeMapEntry | null`

<!-- doctype:start id="e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b" code_ref="src/content/map-manager.ts#DoctypeMapManager.queryById" -->
Finds an entry by its UUID.

**Parameters:**
- `id`: UUID to search for

**Returns:**
- `DoctypeMapEntry` if found, `null` otherwise

**Example:**
```typescript
const manager = new DoctypeMapManager();
const entry = manager.queryById('550e8400-e29b-41d4-a716-446655440000');

if (entry) {
  console.log(`Found: ${entry.code_ref.symbol_name}`);
}
```
<!-- doctype:end id="e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b" -->

### `queryByCodeRef(filePath: string, symbolName: string): DoctypeMapEntry | null`

<!-- doctype:start id="f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c" code_ref="src/content/map-manager.ts#DoctypeMapManager.queryByCodeRef" -->
Finds an entry by its code reference.

**Parameters:**
- `filePath`: Path to the source file
- `symbolName`: Name of the symbol

**Returns:**
- `DoctypeMapEntry` if found, `null` otherwise

**Example:**
```typescript
const manager = new DoctypeMapManager();
const entry = manager.queryByCodeRef('src/auth.ts', 'loginUser');

if (entry) {
  console.log(`Doc location: ${entry.doc_ref.file_path}`);
}
```
<!-- doctype:end id="f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c" -->

### `detectDrift(): DriftReport[]`

<!-- doctype:start id="a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d" code_ref="src/content/map-manager.ts#DoctypeMapManager.detectDrift" -->
Compares current code signatures with saved hashes to detect drift.

**Returns:**
- Array of `DriftReport` objects for entries with mismatched hashes

**Example:**
```typescript
const manager = new DoctypeMapManager();
const drifts = manager.detectDrift();

if (drifts.length > 0) {
  console.log(`Found ${drifts.length} drifts`);
  drifts.forEach(drift => {
    console.log(`  ${drift.symbolName} (${drift.filePath})`);
    console.log(`    Expected: ${drift.expectedHash}`);
    console.log(`    Got:      ${drift.actualHash}`);
  });
}
```
<!-- doctype:end id="a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d" -->

## Types

### DoctypeMapEntry

```typescript
interface DoctypeMapEntry {
  id: string;
  code_ref: CodeRef;
  code_signature_hash: string;
  doc_ref: DocRef;
  original_markdown_content: string;
}
```

### CodeRef

```typescript
interface CodeRef {
  file_path: string;
  symbol_name: string;
}
```

### DocRef

```typescript
interface DocRef {
  file_path: string;
  start_line: number;
  end_line: number;
}
```

### DoctypeMap

```typescript
interface DoctypeMap {
  version: string;
  entries: DoctypeMapEntry[];
}
```

## Examples

### Initialize New Map

```typescript
import { DoctypeMapManager } from 'doctype';

const manager = new DoctypeMapManager();

// Create empty map
manager.save({
  version: '1.0',
  entries: []
});
```

### Add Multiple Entries

```typescript
const manager = new DoctypeMapManager();

const entries = [
  { /* entry 1 */ },
  { /* entry 2 */ },
  { /* entry 3 */ }
];

entries.forEach(entry => manager.addEntry(entry));
```

### Update Hash After Fix

```typescript
const manager = new DoctypeMapManager();
const entry = manager.queryByCodeRef('src/api.ts', 'getUser');

if (entry) {
  manager.updateEntry(entry.id, {
    code_signature_hash: newHash,
    original_markdown_content: updatedContent
  });
}
```

### Detect and Report Drift

```typescript
const manager = new DoctypeMapManager();
const drifts = manager.detectDrift();

if (drifts.length === 0) {
  console.log('✓ All documentation is in sync');
} else {
  console.error(`✗ ${drifts.length} drift(s) detected`);
  process.exit(1);
}
```

## See Also

- [MarkdownParser](./markdown-parser.md) - Extract anchors from Markdown
- [ContentInjector](./content-injector.md) - Inject updated content
- [Core Concepts](../guide/core-concepts.md) - Understanding doctype-map.json
