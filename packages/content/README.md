# Content Module - Content & Mapping

The **Content Module** handles Markdown parsing, documentation anchor tracking, and content injection. It manages the `sintesi-map.json` file, which is the single source of truth for all documentation mappings.

## Purpose

This module implements the **data management layer** of Sintesi:

- Parse Markdown files to extract documentation anchors
- Manage relationships between code signatures and documentation
- Track drift status using the `sintesi-map.json` file
- Inject updated documentation into Markdown files safely

## Modules

### MarkdownParser (`markdown-parser.ts`)

<!-- sintesi:start id="550e8400-e29b-41d4-a716-446655440003" code_ref="src/content/markdown-parser.ts#MarkdownParser" -->
Parses Markdown files to extract sintesi anchors defined using HTML comments.

**Anchor Format:**

```markdown
<!-- sintesi:start id="uuid" code_ref="src/file.ts#symbolName" -->
Documentation content managed by Sintesi.
This will be automatically updated when code changes.
<!-- sintesi:end id="uuid" -->
```

**API:**

```typescript
import { MarkdownParser } from 'sintesi';

const parser = new MarkdownParser();

// Parse file and extract all anchors
const anchors = parser.parseFile('docs/api.md');

// Parse content string
const anchors = parser.parseContent(markdownContent);

// Validate anchor format
const errors = parser.validate(markdownContent);

// Parse code_ref into components
const { filePath, symbolName } = parser.parseCodeRef('src/utils.ts#helper');
```
<!-- sintesi:end id="550e8400-e29b-41d4-a716-446655440003" -->

**Extracted Anchor Format:**

```typescript
{
  id: 'uuid',
  codeRef: 'src/auth/login.ts#login',
  content: 'Documentation content...',
  startLine: 10,
  endLine: 20
}
```

**Validation:**

The parser detects:
- Duplicate anchor IDs
- Unclosed anchors (missing `sintesi:end`)
- Orphaned end tags (missing `sintesi:start`)
- Invalid code references (missing `#symbol`)
- Malformed anchor syntax

### SintesiMapManager (`map-manager.ts`)

<!-- sintesi:start id="550e8400-e29b-41d4-a716-446655440004" code_ref="src/content/map-manager.ts#SintesiMapManager" -->
Manages the `sintesi-map.json` file - the single source of truth for documentation mappings.
<!-- sintesi:end id="550e8400-e29b-41d4-a716-446655440004" -->

**Data Model:**

```json
{
  "version": "1.0.0",
  "entries": [
    {
      "id": "uuid",
      "codeRef": {
        "filePath": "src/auth/login.ts",
        "symbolName": "login"
      },
      "codeSignatureHash": "sha256-hash-here",
      "docRef": {
        "filePath": "docs/auth.md",
        "startLine": 10,
        "endLine": 20
      },
      "originalMarkdownContent": "Authenticates a user...",
      "lastUpdated": 1701234567890
    }
  ]
}
```

**API:**

```typescript
import { SintesiMapManager } from 'sintesi';

const manager = new SintesiMapManager('./sintesi-map.json');

// Add entry
manager.addEntry({
  id: 'uuid',
  codeRef: { filePath: 'src/auth.ts', symbolName: 'login' },
  codeSignatureHash: 'abc123',
  docRef: { filePath: 'docs/auth.md', startLine: 10, endLine: 20 },
  originalMarkdownContent: 'Old content',
  lastUpdated: Date.now()
});

// Check for drift
const hasDrift = manager.hasDrift('uuid', currentHash);

// Get drifted entries
const currentHashes = new Map([['uuid', 'new-hash']]);
const drifted = manager.getDriftedEntries(currentHashes);

// Update entry
manager.updateEntry('uuid', {
  codeSignatureHash: 'new-hash',
  originalMarkdownContent: 'Updated content',
  lastUpdated: Date.now()
});

// Query entries
const entry = manager.getEntryById('uuid');
const entries = manager.getEntriesByCodeRef('src/auth.ts', 'login');
const entries = manager.getEntriesByDocFile('docs/auth.md');

// Save to disk
manager.save();
```

**Key Features:**
- Thread-safe CRUD operations
- Automatic validation on add/update
- Efficient querying by ID, code reference, or doc file
- Pretty-printed JSON output for version control
- Drift detection with hash comparison

### ContentInjector (`content-injector.ts`)

<!-- sintesi:start id="550e8400-e29b-41d4-a716-446655440005" code_ref="src/content/content-injector.ts#ContentInjector" -->
Injects AI-generated or placeholder content into Markdown files within anchor boundaries.

**API:**

```typescript
import { ContentInjector } from 'sintesi';

const injector = new ContentInjector();

// Inject content and write to file
const result = injector.injectIntoFile(
  'docs/api.md',
  'anchor-uuid',
  'New documentation content here.\n\nSupports **Markdown** formatting!',
  true // write to file
);

console.log(result.success);      // true
console.log(result.linesChanged); // 5

// Preview without writing (dry-run)
const preview = injector.preview(
  'docs/api.md',
  'anchor-uuid',
  'New content'
);

console.log(preview.before);      // Original content
console.log(preview.after);       // Preview of new content
console.log(preview.linesChanged); // Number of lines that will change

// Validate anchor exists and is well-formed
const errors = injector.validateAnchor(content, 'anchor-uuid');
```
<!-- sintesi:end id="550e8400-e29b-41d4-a716-446655440005" -->

**Key Features:**
- Safe content replacement (preserves anchor comments)
- Preserves surrounding Markdown content
- Batch injection support (multiple anchors in one file)
- Preview mode for dry-run operations
- Line change tracking
- Anchor validation before injection

**Injection Process:**

1. Read Markdown file
2. Locate anchor by ID
3. Validate anchor structure
4. Replace content between `sintesi:start` and `sintesi:end`
5. Preserve anchor comments (don't modify them)
6. Write updated content back to file

**Example:**

**Before:**
```markdown
# API Documentation

<!-- sintesi:start id="uuid" code_ref="src/auth.ts#login" -->
Old documentation here.
<!-- sintesi:end id="uuid" -->
```

**After injection with new content:**
```markdown
# API Documentation

<!-- sintesi:start id="uuid" code_ref="src/auth.ts#login" -->
Authenticates a user with email and password.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:**
- `Promise<string>`: JWT authentication token
<!-- sintesi:end id="uuid" -->
```

## The sintesi-map.json File

The `sintesi-map.json` file is the **single source of truth** for Sintesi. It tracks:

### What It Contains

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique identifier for the anchor | `"550e8400-e29b-41d4-a716-446655440000"` |
| `codeRef.filePath` | Source code file path | `"src/auth/login.ts"` |
| `codeRef.symbolName` | Function/class/type name | `"login"` |
| `codeSignatureHash` | SHA256 hash of current signature | `"abc123..."` |
| `docRef.filePath` | Documentation Markdown file | `"docs/auth.md"` |
| `docRef.startLine` | Start line of anchor content | `10` |
| `docRef.endLine` | End line of anchor content | `20` |
| `originalMarkdownContent` | Current documentation text | `"Authenticates a user..."` |
| `lastUpdated` | Unix timestamp of last update | `1701234567890` |

### Why It's Important

1. **Drift Detection**: The `codeSignatureHash` is compared against the current code signature hash to detect changes.

2. **Documentation Location**: The `docRef` fields tell Sintesi exactly where to inject updated content.

3. **Context for AI**: The `originalMarkdownContent` provides context to the AI for generating better updates.

4. **Audit Trail**: The `lastUpdated` timestamp tracks when documentation was last synchronized.

### When It's Updated

The map file is updated in these scenarios:

- **Initial scan**: When `npx sintesi init` discovers new anchors
- **After fix**: When `npx sintesi fix` updates documentation
- **Manual edits**: When you manually add/edit anchor tags (detected on next check)

### Version Control

**✅ DO commit `sintesi-map.json` to version control**

This file should be committed because:
- It's the source of truth for all teams
- Changes to it should be reviewed in PRs
- It enables drift detection in CI/CD
- It tracks the relationship between code and docs

## Integration Example

Here's how the content module integrates with other modules:

```typescript
import { MarkdownParser, SintesiMapManager, ContentInjector } from 'sintesi/content';
import { ASTAnalyzer, SignatureHasher } from 'sintesi/core';
import { AIAgent } from 'sintesi/ai';

// 1. Parse markdown files to find anchors
const parser = new MarkdownParser();
const anchors = parser.parseFile('docs/api.md');

// 2. Initialize map manager
const mapManager = new SintesiMapManager();

// 3. Analyze code and create entries
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

for (const anchor of anchors) {
  const { filePath, symbolName } = parser.parseCodeRef(anchor.codeRef);
  const signature = analyzer.findSymbol(filePath, symbolName);
  const hash = hasher.hash(signature).hash;

  mapManager.addEntry({
    id: anchor.id,
    codeRef: { filePath, symbolName },
    codeSignatureHash: hash,
    docRef: {
      filePath: 'docs/api.md',
      startLine: anchor.startLine,
      endLine: anchor.endLine
    },
    originalMarkdownContent: anchor.content,
    lastUpdated: Date.now()
  });
}

// 4. Save map
mapManager.save();

// 5. Later: Detect drift
const entries = mapManager.getEntries();
for (const entry of entries) {
  const currentSig = analyzer.findSymbol(
    entry.codeRef.filePath,
    entry.codeRef.symbolName
  );
  const currentHash = hasher.hash(currentSig).hash;

  if (mapManager.hasDrift(entry.id, currentHash)) {
    // 6. Generate new docs with AI
    const agent = createAgentFromEnv();
    const newDocs = await agent.generateFromDrift(
      entry.codeRef.symbolName,
      entry.codeSignatureHash, // old signature hash
      currentHash,             // new signature hash
      entry.originalMarkdownContent,
      entry.codeRef.filePath
    );

    // 7. Inject new content
    const injector = new ContentInjector();
    injector.injectIntoFile(
      entry.docRef.filePath,
      entry.id,
      newDocs,
      true
    );

    // 8. Update map
    mapManager.updateEntry(entry.id, {
      codeSignatureHash: currentHash,
      originalMarkdownContent: newDocs,
      lastUpdated: Date.now()
    });
  }
}

// 9. Save updated map
mapManager.save();
```

## Testing

The content module has comprehensive test coverage:

```bash
npm test src/content
```

**Test Coverage:**
- Markdown parsing (18 tests)
  - Single/multiple anchor extraction
  - Multi-line content handling
  - Error detection (unclosed anchors, duplicate IDs)
  - Whitespace preservation
  - Code ref parsing
- Map management (22 tests)
  - Initialization and loading
  - CRUD operations
  - Drift detection
  - Querying by various criteria
  - Persistence to disk
- Content injection (18 tests)
  - Single/multiple injections
  - Preview mode
  - Anchor validation
  - Location detection

**Total: 58 tests**

## Performance

### Lazy Loading

The map file is loaded once and kept in memory:

```typescript
const manager = new SintesiMapManager(); // Loads from disk once
manager.getEntryById('id1');             // Memory lookup
manager.getEntryById('id2');             // Memory lookup
manager.save();                          // Write to disk once
```

### Batch Operations

Process multiple anchors efficiently:

```typescript
// Extract all anchors at once
const anchors = parser.parseFile('docs/api.md');

// Process in batch
for (const anchor of anchors) {
  // Process each anchor
}

// Single save at the end
mapManager.save();
```

## Error Handling

All modules implement comprehensive error handling:

```typescript
try {
  const anchors = parser.parseFile('docs/missing.md');
} catch (error) {
  // File not found
}

try {
  const errors = parser.validate(content);
  if (errors.length > 0) {
    // Invalid anchor format
  }
} catch (error) {
  // Parsing error
}

try {
  injector.injectIntoFile('docs/api.md', 'invalid-id', 'content', true);
} catch (error) {
  // Anchor not found
}
```

## Dependencies

- **uuid**: Generate unique IDs for anchors
- Node.js `fs` (built-in): File I/O operations

## Further Reading

- [Markdown Specification](https://spec.commonmark.org/)
- [HTML Comments in Markdown](https://daringfireball.net/projects/markdown/syntax#html)
