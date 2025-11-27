# Phase 2 - Content & Mapping

**Status**: ✅ Complete
**Completion Date**: 2025-11-27

## Overview

Phase 2 implements the Content & Mapping module for Doctype, handling:
- **Markdown parsing** - Extracting documentation anchors from Markdown files
- **Anchor extraction** - Parsing HTML comment-based anchor tags
- **doctype-map.json management** - Single source of truth for all documentation mappings
- **Content injection** - Updating Markdown files with AI-generated content

## Modules Implemented

### 1. MarkdownParser (`src/content/markdown-parser.ts`)

Parses Markdown files to extract doctype anchors defined using HTML comments.

**Anchor Format**:
```markdown
<!-- doctype:start id="uuid" code_ref="src/file.ts#symbolName" -->
Documentation content managed by Doctype
<!-- doctype:end id="uuid" -->
```

**Key Features**:
- Extracts all anchors from Markdown files
- Validates anchor format and structure
- Detects duplicate IDs, unclosed anchors, invalid code references
- Preserves original content formatting (whitespace, indentation)
- Parses code_ref into filePath and symbolName components

**API**:
```typescript
const parser = new MarkdownParser();

// Parse file and extract anchors
const anchors = parser.parseFile('docs/api.md');

// Parse content string
const anchors = parser.parseContent(markdownContent);

// Validate anchor format
const errors = parser.validate(markdownContent);

// Parse code_ref
const { filePath, symbolName } = parser.parseCodeRef('src/utils.ts#helper');
```

### 2. DoctypeMapManager (`src/content/map-manager.ts`)

Manages the `doctype-map.json` file - the single source of truth for documentation mappings.

**Data Model**:
```typescript
{
  "version": "1.0.0",
  "entries": [
    {
      "id": "uuid",
      "codeRef": {
        "filePath": "src/auth/login.ts",
        "symbolName": "login"
      },
      "codeSignatureHash": "sha256-hash",
      "docRef": {
        "filePath": "docs/auth.md",
        "startLine": 10,
        "endLine": 20
      },
      "originalMarkdownContent": "The login function...",
      "lastUpdated": 1701234567890
    }
  ]
}
```

**Key Features**:
- Load/save map to disk with pretty formatting
- Add, update, remove, and query entries
- Drift detection (compare current hash vs saved hash)
- Query entries by ID, code reference, or documentation file
- Thread-safe operations with validation

**API**:
```typescript
const manager = new DoctypeMapManager('./doctype-map.json');

// Add entry
manager.addEntry(entry);

// Check for drift
const hasDrift = manager.hasDrift(entryId, currentHash);

// Get drifted entries
const drifted = manager.getDriftedEntries(currentHashes);

// Save to disk
manager.save();
```

### 3. ContentInjector (`src/content/content-injector.ts`)

Injects AI-generated content into Markdown files within anchor boundaries.

**Key Features**:
- Safe content replacement between anchor tags
- Preserves anchor comments and surrounding content
- Preview mode (no file writes)
- Batch injection support (multiple anchors in one file)
- Line change tracking
- Anchor validation and location detection

**API**:
```typescript
const injector = new ContentInjector();

// Inject content and write to file
const result = injector.injectIntoFile(
  'docs/api.md',
  'anchor-uuid',
  'New content here',
  true
);

// Preview without writing
const preview = injector.preview('docs/api.md', 'anchor-uuid', 'New content');

// Validate anchor
const errors = injector.validateAnchor(content, 'anchor-uuid');
```

## Test Coverage

Comprehensive test suites for all modules:

- **markdown-parser.test.ts**: 18 tests
  - Single/multiple anchor parsing
  - Multi-line content handling
  - Error detection (unclosed anchors, orphaned ends)
  - Whitespace preservation
  - Code ref parsing
  - Validation

- **map-manager.test.ts**: 22 tests
  - Initialization and loading
  - CRUD operations
  - Drift detection
  - Querying by various criteria
  - Persistence to disk
  - Error handling

- **content-injector.test.ts**: 18 tests
  - Single/multiple injections
  - Preview mode
  - Anchor validation
  - Location detection
  - Error handling

**Total Tests**: 58 tests in Phase 2
**Combined with Phase 1**: 102 tests total

## Dependencies Added

```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

**Note on Markdown Parsing**: Initially, we considered using the `unified`, `remark-parse`, `remark-stringify`, and `remark-html` ecosystem. However, these were removed in favor of custom regex-based parsing for the following reasons:

- **Simplicity**: Doctype only needs to extract HTML comment anchors, not full Markdown AST
- **Performance**: Regex parsing is faster for our specific use case
- **Bundle Size**: Removes 64 unnecessary packages (~2MB)
- **Security**: Smaller dependency tree reduces attack surface
- **Maintainability**: Self-contained parsing logic, no external API changes

The custom parser uses simple regex patterns to match `<!-- doctype:start -->` and `<!-- doctype:end -->` comments, which is sufficient and more appropriate for our anchor-extraction needs.

## Example Usage

See `src/examples/phase2-integration.ts` for a complete integration example:

```typescript
import { MarkdownParser, DoctypeMapManager, ContentInjector } from 'doctype';
import { ASTAnalyzer, SignatureHasher } from 'doctype';

// 1. Parse markdown files
const parser = new MarkdownParser();
const anchors = parser.parseFile('docs/api.md');

// 2. Initialize map manager
const mapManager = new DoctypeMapManager();

// 3. Analyze code and create entries
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

for (const anchor of anchors) {
  const { filePath, symbolName } = parser.parseCodeRef(anchor.codeRef);
  const signatures = analyzer.analyzeFile(filePath);
  const signature = signatures.find(s => s.symbolName === symbolName);

  if (signature) {
    const hash = hasher.hash(signature);
    mapManager.addEntry({
      id: anchor.id,
      codeRef: { filePath, symbolName },
      codeSignatureHash: hash.hash,
      docRef: {
        filePath: 'docs/api.md',
        startLine: anchor.startLine,
        endLine: anchor.endLine
      },
      originalMarkdownContent: anchor.content,
      lastUpdated: Date.now()
    });
  }
}

// 4. Save map
mapManager.save();

// 5. Detect drift
const entries = mapManager.getEntries();
for (const entry of entries) {
  const currentSig = analyzer.analyzeFile(entry.codeRef.filePath)
    .find(s => s.symbolName === entry.codeRef.symbolName);

  if (currentSig) {
    const currentHash = hasher.hash(currentSig).hash;
    if (mapManager.hasDrift(entry.id, currentHash)) {
      console.log(`Drift detected: ${entry.codeRef.symbolName}`);
    }
  }
}

// 6. Inject new content
const injector = new ContentInjector();
injector.injectIntoFile('docs/api.md', entry.id, 'Updated content');
```

## File Structure

```
src/
├── content/
│   ├── markdown-parser.ts       # Markdown parsing & anchor extraction
│   ├── map-manager.ts            # doctype-map.json management
│   ├── content-injector.ts       # Content injection into markdown
│   ├── index.ts                  # Module exports
│   └── __tests__/
│       ├── markdown-parser.test.ts
│       ├── map-manager.test.ts
│       ├── content-injector.test.ts
│       └── fixtures/
│           ├── example-docs.md   # Valid anchor examples
│           └── invalid-docs.md   # Invalid cases for testing
├── examples/
│   ├── example-code.ts           # Code with tracked symbols
│   └── phase2-integration.ts     # Integration example
└── index.ts                      # Main library entry point
```

## Integration with Phase 1

Phase 2 modules integrate seamlessly with Phase 1 (AST & Drift Detection):

1. **ASTAnalyzer** extracts code signatures from TypeScript files
2. **SignatureHasher** generates SHA256 hashes of signatures
3. **MarkdownParser** extracts documentation anchors
4. **DoctypeMapManager** links code signatures to documentation anchors
5. **ContentInjector** updates documentation when drift is detected

## Next Steps (Phase 3 & 4)

### Phase 3: CLI / Executor
- `npx doctype check` command
- `npx doctype fix` command
- `--auto-commit` flag support
- CI integration

### Phase 4: Gen AI Agent
- OpenAI/Gemini integration
- Prompt engineering for documentation updates
- AI-powered content generation based on signature changes
- Automatic PR creation

## Performance Considerations

- **Lazy Loading**: Map is loaded once and kept in memory
- **Batch Operations**: Support for processing multiple anchors/entries
- **File I/O Optimization**: Single read/write operations where possible
- **Validation**: Front-loaded validation to fail fast

## Error Handling

All modules implement comprehensive error handling:
- Clear error messages with context (line numbers, IDs, file paths)
- Validation before mutations
- Safe file operations with atomic writes
- Graceful degradation for missing files

## Conclusion

Phase 2 is complete with:
- ✅ 3 core modules implemented
- ✅ 58 comprehensive tests (all passing)
- ✅ Full TypeScript type safety
- ✅ Integration examples
- ✅ Documentation

The Content & Mapping layer provides a solid foundation for the CLI (Phase 3) and AI Agent (Phase 4) modules.
