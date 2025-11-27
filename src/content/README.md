# Content & Mapping Module

> **Phase 2**: Markdown parsing, anchor extraction, and content injection

The Content & Mapping module bridges documentation and code by managing the doctype-map.json file and handling Markdown content updates through three interconnected components.

## Architecture Overview

```
┌─────────────────┐
│ Markdown Docs   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│MarkdownParser   │ ← Extract HTML anchors
│  (Parse & Val.) │   Validate format
└────────┬────────┘
         │ DoctypeAnchor[]
         ▼
┌─────────────────┐       ┌─────────────────┐
│DoctypeMapManager│ ←────→│SignatureHash    │ (Phase 1)
│  (Map CRUD)     │       │(Code Signatures)│
└────────┬────────┘       └─────────────────┘
         │ DoctypeMapEntry[]
         │
         ├─── Check Drift ───→ CI: Exit code 1 if drift
         │
         ├─── Trigger AI ────→ (Phase 4: Gen AI)
         │
         ▼
┌─────────────────┐
│ContentInjector  │ ← Inject AI content
│  (Safe Replace) │   Update markdown
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Updated Markdown │ → git commit & push
└─────────────────┘
```

## Components

### 1. MarkdownParser (`markdown-parser.ts`)

Extracts and validates doctype anchors from Markdown files using HTML comment syntax.

#### Anchor Format

```markdown
<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440000" code_ref="src/auth/login.ts#login" -->
The `login` function authenticates users using email and password.

**Parameters:**
- `email`: User's email address
- `password`: User's password

**Returns:** Authentication token
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440000" -->
```

**Anchor Components:**
- `id`: Unique UUID (generated via `uuid` package)
- `code_ref`: Reference to code symbol in format `file_path#symbol_name`
- Content: Markdown text between start/end tags (managed by Doctype)

#### DoctypeAnchor Interface

```typescript
interface DoctypeAnchor {
  id: string;              // UUID from anchor comment
  startLine: number;       // 0-indexed line where anchor starts
  endLine: number;         // 0-indexed line where anchor ends
  content: string;         // Text between anchors (whitespace preserved)
  codeRef: string;         // Full code_ref string "path/file.ts#symbolName"
}
```

#### Public API

```typescript
class MarkdownParser {
  // Parse file and extract all anchors
  parseFile(filePath: string): DoctypeAnchor[]

  // Parse markdown content string
  parseContent(content: string): DoctypeAnchor[]

  // Validate anchor format (returns error messages)
  validate(content: string): string[]

  // Parse code_ref into components
  parseCodeRef(codeRef: string): { filePath: string; symbolName: string }
}
```

#### Example: Parsing a File

```typescript
import { MarkdownParser } from './markdown-parser';

const parser = new MarkdownParser();
const anchors = parser.parseFile('docs/api.md');

console.log(anchors);
// [
//   {
//     id: "550e8400-e29b-41d4-a716-446655440000",
//     startLine: 5,
//     endLine: 12,
//     content: "The `login` function authenticates...",
//     codeRef: "src/auth/login.ts#login"
//   },
//   // ... more anchors
// ]

// Parse code reference
const { filePath, symbolName } = parser.parseCodeRef(anchors[0].codeRef);
// filePath: "src/auth/login.ts"
// symbolName: "login"
```

#### Validation Features

The parser validates:

1. **Duplicate IDs**: Each anchor ID must be unique
2. **Unclosed Anchors**: Every `doctype:start` must have a matching `doctype:end`
3. **Orphaned Ends**: No `doctype:end` without a preceding `doctype:start`
4. **Code Ref Format**: Must contain `#` separator (`file_path#symbol_name`)

```typescript
const errors = parser.validate(markdownContent);

if (errors.length > 0) {
  console.error('Validation errors:');
  errors.forEach(err => console.error(`  - ${err}`));
}

// Example errors:
// - "Duplicate anchor id=\"test\" at line 15"
// - "Unclosed anchor id=\"orphan\" started at line 10"
// - "Invalid code_ref format at line 5: expected \"file_path#symbol_name\""
```

#### Whitespace Preservation

The parser preserves original formatting (indentation, spacing):

```markdown
<!-- doctype:start id="example" code_ref="src/test.ts#test" -->
  Indented content
    More indentation
- List items
<!-- doctype:end id="example" -->
```

```typescript
const anchor = parser.parseContent(content)[0];
console.log(anchor.content);
// "  Indented content\n    More indentation\n- List items"
// ✓ Whitespace preserved exactly as written
```

### 2. DoctypeMapManager (`map-manager.ts`)

Manages the `doctype-map.json` file - the single source of truth linking code signatures to documentation anchors.

#### Map File Structure

```json
{
  "version": "1.0.0",
  "entries": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "codeRef": {
        "filePath": "src/auth/login.ts",
        "symbolName": "login"
      },
      "codeSignatureHash": "a3f5c8e9d1b2c4f7e8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
      "docRef": {
        "filePath": "docs/auth.md",
        "startLine": 5,
        "endLine": 12
      },
      "originalMarkdownContent": "The `login` function authenticates users...",
      "lastUpdated": 1732659600000
    }
  ]
}
```

#### Key Fields

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Unique UUID matching the markdown anchor |
| `codeRef` | CodeRef | Source file path and symbol name |
| `codeSignatureHash` | string | SHA256 hash from Phase 1 (drift detection) |
| `docRef` | DocRef | Markdown file location (path + line numbers) |
| `originalMarkdownContent` | string | Current/outdated documentation text |
| `lastUpdated` | number | Unix timestamp of last modification |

#### Public API

```typescript
class DoctypeMapManager {
  constructor(mapFilePath?: string)  // Default: './doctype-map.json'

  // CRUD Operations
  addEntry(entry: DoctypeMapEntry): void
  updateEntry(id: string, updates: Partial<DoctypeMapEntry>): void
  removeEntry(id: string): boolean
  getEntryById(id: string): DoctypeMapEntry | undefined

  // Querying
  getEntries(): DoctypeMapEntry[]
  getEntriesByCodeRef(filePath: string, symbolName: string): DoctypeMapEntry[]
  getEntriesByDocFile(filePath: string): DoctypeMapEntry[]

  // Drift Detection
  hasDrift(id: string, currentHash: string): boolean
  getDriftedEntries(currentHashes: Map<string, string>): DoctypeMapEntry[]

  // Persistence
  save(): void
  export(): DoctypeMap

  // Utilities
  getEntryCount(): number
  getVersion(): string
  clear(): void
}
```

#### Example: Creating and Managing Entries

```typescript
import { DoctypeMapManager } from './map-manager';
import { v4 as uuidv4 } from 'uuid';

const manager = new DoctypeMapManager('./doctype-map.json');

// Add a new entry
const entry = {
  id: uuidv4(),
  codeRef: {
    filePath: 'src/utils/helper.ts',
    symbolName: 'formatDate'
  },
  codeSignatureHash: 'abc123...',
  docRef: {
    filePath: 'docs/utils.md',
    startLine: 20,
    endLine: 30
  },
  originalMarkdownContent: 'Formats dates using ISO 8601...',
  lastUpdated: Date.now()
};

manager.addEntry(entry);
manager.save();

console.log(`Map contains ${manager.getEntryCount()} entries`);
```

#### Example: Drift Detection

```typescript
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';

const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();
const manager = new DoctypeMapManager();

// Get all entries
const entries = manager.getEntries();

for (const entry of entries) {
  // Re-analyze current code
  const signatures = analyzer.analyzeFile(entry.codeRef.filePath);
  const currentSig = signatures.find(sig => sig.symbolName === entry.codeRef.symbolName);

  if (currentSig) {
    const currentHash = hasher.hash(currentSig).hash;

    // Check for drift
    if (manager.hasDrift(entry.id, currentHash)) {
      console.log(`⚠️  DRIFT DETECTED: ${entry.codeRef.symbolName}`);
      console.log(`   File: ${entry.codeRef.filePath}`);
      console.log(`   Doc:  ${entry.docRef.filePath}:${entry.docRef.startLine}`);

      // Phase 4: Trigger AI fix
      // ...
    }
  }
}
```

#### Example: Batch Drift Detection

```typescript
// Build map of current hashes
const currentHashes = new Map<string, string>();

for (const entry of manager.getEntries()) {
  const signatures = analyzer.analyzeFile(entry.codeRef.filePath);
  const sig = signatures.find(s => s.symbolName === entry.codeRef.symbolName);

  if (sig) {
    currentHashes.set(entry.id, hasher.hash(sig).hash);
  }
}

// Get all drifted entries at once
const drifted = manager.getDriftedEntries(currentHashes);

if (drifted.length > 0) {
  console.log(`Found ${drifted.length} drifted entries`);
  process.exit(1);  // Fail CI
} else {
  console.log('✓ All documentation is in sync');
}
```

### 3. ContentInjector (`content-injector.ts`)

Safely injects AI-generated content into Markdown files within anchor boundaries.

#### InjectionResult Interface

```typescript
interface InjectionResult {
  success: boolean;        // Whether injection succeeded
  content: string;         // Updated markdown content
  linesChanged: number;    // Number of lines added/removed
  error?: string;          // Error message if failed
}
```

#### Public API

```typescript
class ContentInjector {
  // Inject into file (optionally write to disk)
  injectIntoFile(
    filePath: string,
    anchorId: string,
    newContent: string,
    writeToFile?: boolean  // Default: true
  ): InjectionResult

  // Inject into content string
  injectIntoContent(
    content: string,
    anchorId: string,
    newContent: string
  ): InjectionResult

  // Batch injection (multiple anchors in one file)
  injectMultiple(
    filePath: string,
    injections: Map<string, string>,
    writeToFile?: boolean
  ): InjectionResult[]

  // Preview without writing
  preview(
    filePath: string,
    anchorId: string,
    newContent: string
  ): InjectionResult

  // Utilities
  getAnchorLocation(filePath: string, anchorId: string): { startLine: number; endLine: number } | null
  validateAnchor(content: string, anchorId: string): string[]
}
```

#### Example: Basic Injection

```typescript
import { ContentInjector } from './content-injector';

const injector = new ContentInjector();

const newContent = `The \`login\` function authenticates users with updated security.

**Updated Parameters:**
- \`email\`: User's email address (validated)
- \`password\`: User's password (minimum 8 characters)
- \`mfaToken\`: Optional MFA token

**Returns:** JWT authentication token with 24h expiry`;

// Inject and write to file
const result = injector.injectIntoFile(
  'docs/auth.md',
  '550e8400-e29b-41d4-a716-446655440000',
  newContent,
  true  // Write to disk
);

if (result.success) {
  console.log('✓ Content injected successfully');
  console.log(`  Lines changed: ${result.linesChanged}`);
} else {
  console.error(`✗ Injection failed: ${result.error}`);
}
```

#### Example: Preview Mode

```typescript
// Preview changes without modifying the file
const preview = injector.preview(
  'docs/auth.md',
  'anchor-id',
  'New content here'
);

if (preview.success) {
  console.log('Preview of updated content:');
  console.log('---');
  console.log(preview.content);
  console.log('---');

  // User confirmation
  const confirmed = await askUser('Apply these changes? (y/n)');

  if (confirmed) {
    injector.injectIntoFile('docs/auth.md', 'anchor-id', 'New content here', true);
  }
}
```

#### Example: Batch Injection

```typescript
// Update multiple anchors in one file
const injections = new Map([
  ['anchor-1', 'Updated content for section 1'],
  ['anchor-2', 'Updated content for section 2'],
  ['anchor-3', 'Updated content for section 3']
]);

const results = injector.injectMultiple('docs/api.md', injections, true);

const successful = results.filter(r => r.success).length;
console.log(`✓ ${successful}/${results.length} injections successful`);

// Log failures
results
  .filter(r => !r.success)
  .forEach(r => console.error(`  ✗ ${r.error}`));
```

#### Safety Features

1. **Anchor Preservation**: Start/end comments are never modified
2. **Atomic Operations**: File writes are all-or-nothing
3. **Content Validation**: Anchors are validated before injection
4. **Surrounding Content**: Text outside anchors is preserved exactly
5. **Error Recovery**: Failed injections don't corrupt files

## Integration Example

Complete workflow using all three modules:

```typescript
import { MarkdownParser, DoctypeMapManager, ContentInjector } from 'doctype/content';
import { ASTAnalyzer, SignatureHasher } from 'doctype/core';
import { v4 as uuidv4 } from 'uuid';

// === Step 1: Parse markdown files ===
const parser = new MarkdownParser();
const anchors = parser.parseFile('docs/api.md');

console.log(`Found ${anchors.length} anchors`);

// === Step 2: Initialize map manager ===
const mapManager = new DoctypeMapManager();

// === Step 3: Analyze code and create entries ===
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

for (const anchor of anchors) {
  const { filePath, symbolName } = parser.parseCodeRef(anchor.codeRef);

  // Analyze code
  const signatures = analyzer.analyzeFile(filePath);
  const signature = signatures.find(sig => sig.symbolName === symbolName);

  if (!signature) {
    console.warn(`Symbol ${symbolName} not found in ${filePath}`);
    continue;
  }

  // Generate hash
  const signatureHash = hasher.hash(signature);

  // Create map entry
  mapManager.addEntry({
    id: anchor.id,
    codeRef: { filePath, symbolName },
    codeSignatureHash: signatureHash.hash,
    docRef: {
      filePath: 'docs/api.md',
      startLine: anchor.startLine,
      endLine: anchor.endLine
    },
    originalMarkdownContent: anchor.content,
    lastUpdated: Date.now()
  });
}

// === Step 4: Save map ===
mapManager.save();
console.log(`✓ Saved ${mapManager.getEntryCount()} entries to doctype-map.json`);

// === Step 5: Detect drift (CI workflow) ===
const entries = mapManager.getEntries();
let driftCount = 0;

for (const entry of entries) {
  const signatures = analyzer.analyzeFile(entry.codeRef.filePath);
  const currentSig = signatures.find(s => s.symbolName === entry.codeRef.symbolName);

  if (currentSig) {
    const currentHash = hasher.hash(currentSig).hash;

    if (mapManager.hasDrift(entry.id, currentHash)) {
      console.log(`⚠️  Drift: ${entry.codeRef.symbolName}`);
      driftCount++;
    }
  }
}

if (driftCount > 0) {
  console.error(`\n✗ ${driftCount} documentation drift(s) detected`);
  process.exit(1);  // Fail CI
}

// === Step 6: Fix drift (manual or AI workflow) ===
const injector = new ContentInjector();

const driftedEntry = entries[0];  // Example: first drifted entry
const aiGeneratedContent = `Updated documentation generated by AI...`;

const result = injector.injectIntoFile(
  driftedEntry.docRef.filePath,
  driftedEntry.id,
  aiGeneratedContent,
  true
);

if (result.success) {
  console.log('✓ Documentation updated');

  // Update hash in map
  const newHash = '...';  // New hash after fix
  mapManager.updateEntry(driftedEntry.id, {
    codeSignatureHash: newHash,
    originalMarkdownContent: aiGeneratedContent
  });
  mapManager.save();
}
```

## Design Principles

### 1. Safety First

**Goal**: Never corrupt documentation files.

- Validate before mutate (anchors, file paths, IDs)
- Atomic file writes (all-or-nothing)
- Preview mode for testing changes
- Preserve content outside anchor boundaries

**Why**: Documentation is critical; corruption could mislead users.

### 2. Single Source of Truth

**Goal**: `doctype-map.json` is the authoritative record.

- All code-to-doc mappings stored in one place
- Versioned schema for future compatibility
- Human-readable JSON with pretty formatting
- Git-trackable (shows what changed over time)

**Why**: Centralized state simplifies drift detection and debugging.

### 3. Format Preservation

**Goal**: Don't alter user formatting choices.

- Whitespace preserved (indentation, spacing)
- Markdown structure unchanged (lists, tables, code blocks)
- Only content between anchors is managed

**Why**: Respects documentation style and readability.

### 4. Fail-Fast Validation

**Goal**: Detect errors before making changes.

- Parse and validate before injection
- Check for missing anchors, duplicate IDs
- Validate code_ref format (`file_path#symbol_name`)
- Clear error messages with line numbers

**Why**: Early detection prevents cascading failures.

### 5. Modularity

Each component is usable independently:

```typescript
// Use only the parser
const parser = new MarkdownParser();
const anchors = parser.parseFile('docs/api.md');

// Use only the map manager
const manager = new DoctypeMapManager();
manager.addEntry(entry);

// Use only the injector
const injector = new ContentInjector();
injector.injectIntoFile('docs/api.md', 'id', 'content');
```

**Why**: Flexibility for different workflows, easier testing.

## Testing

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:ui         # Visual UI (Vitest)
```

### Test Suites

Phase 2 test coverage:

| Test Suite | Tests | Description |
|------------|-------|-------------|
| `markdown-parser.test.ts` | 18 | Parsing, validation, error handling |
| `map-manager.test.ts` | 22 | CRUD, drift detection, persistence |
| `content-injector.test.ts` | 18 | Injection, preview, validation |
| **Total** | **58** | **Phase 2 tests** |

Combined with Phase 1: **102 tests** (all passing)

### Test Fixtures

Located in `__tests__/fixtures/`:

- **`example-docs.md`**: Valid markdown with multiple anchors
- **`invalid-docs.md`**: Invalid cases (duplicate IDs, unclosed anchors, etc.)

## Usage Examples

See [`examples/phase2-integration.ts`](../examples/phase2-integration.ts) for complete working example demonstrating:

1. Parsing markdown files
2. Creating map entries
3. Detecting drift
4. Injecting content

Run the example:
```bash
npm run build
node dist/examples/phase2-integration.js
```

## Future Phases

### Phase 3: CLI / Executor
- `npx doctype check` - CI drift verification
- `npx doctype fix` - Interactive drift fixing
- `--auto-commit` - Automated PR creation

### Phase 4: Gen AI Agent
- OpenAI/Gemini integration for content generation
- Prompt engineering (old signature → new signature → updated docs)
- Automatic documentation updates via AI

---

**Status**: ✅ Phase 2 Complete (58/58 tests passing)
