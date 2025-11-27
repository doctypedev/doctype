# Core Concepts

Understanding the key concepts behind Doctype will help you use it effectively.

## The Problem: Documentation Drift

Documentation drift occurs when code changes but documentation doesn't. This leads to:
- Incorrect examples
- Outdated API references
- Confused developers
- Wasted time debugging

## The Solution: Deterministic Verification

Doctype uses **deterministic hash-based verification** to detect drift:

1. Extract code signature from TypeScript AST
2. Calculate SHA256 hash of the signature
3. Compare with saved hash in `doctype-map.json`
4. If hashes don't match → drift detected

## Key Components

### 1. Doctype Anchors

Special HTML comments in Markdown that mark documentation sections:

```markdown
<!-- doctype:start id="uuid" code_ref="file.ts#symbol" -->
Content managed by Doctype
<!-- doctype:end id="uuid" -->
```

**Anchor Properties:**
- `id`: Unique UUID for tracking
- `code_ref`: Reference to source code (`file_path#symbol_name`)

### 2. Code Signatures

A code signature represents the **public API** of a symbol:

- Function name, parameters, return type
- Class name, properties, methods
- Interface/type structure
- Enum values

**Example signature:**
```typescript
function calculateTotal(items: Product[], tax: number): number
```

### 3. The doctype-map.json

The single source of truth that tracks all anchors and their code signatures:

```json
{
  "entries": [
    {
      "id": "uuid",
      "code_ref": {
        "file_path": "src/utils.ts",
        "symbol_name": "calculateTotal"
      },
      "code_signature_hash": "abc123...",
      "doc_ref": {
        "file_path": "docs/api/utils.md",
        "start_line": 10,
        "end_line": 15
      },
      "original_markdown_content": "Calculates the total..."
    }
  ]
}
```

## The Workflow

### Check Mode (CI Integration)

```bash
npx doctype check
```

1. Read `doctype-map.json`
2. For each entry:
   - Analyze current code signature
   - Calculate hash
   - Compare with saved hash
3. If any mismatch → fail CI with error

### Fix Mode (Auto-Update)

```bash
npx doctype fix
```

1. Detect drifted entries
2. Generate prompt for GenAI (Phase 4)
3. Inject updated content in Markdown
4. Update hash in `doctype-map.json`
5. Optional: auto-commit changes

## Architecture Layers

### Phase 1: AST & Drift Detection
- **ASTAnalyzer**: Parse TypeScript using ts-morph
- **SignatureHasher**: Generate deterministic hashes

### Phase 2: Content & Mapping
- **MarkdownParser**: Extract doctype anchors
- **DoctypeMapManager**: CRUD operations on the map file
- **ContentInjector**: Safe content injection

### Phase 3: CLI / Executor
- **Commands**: check, fix
- **DriftDetector**: Orchestrate drift detection
- **Logger**: Beautiful terminal output

### Phase 4: GenAI Agent (Coming Soon)
- **Prompt Engineering**: Compare old vs new signatures
- **LLM Integration**: OpenAI/Gemini
- **Auto-Commit**: Git integration

## Best Practices

1. **One anchor per symbol** - Keep documentation focused
2. **Use UUIDs for IDs** - Avoid conflicts
3. **Commit doctype-map.json** - It's your source of truth
4. **Run check in CI** - Prevent drift before merge
5. **Review AI fixes** - Always review before auto-commit

## Next Steps

- Learn how to use the [Check Command](../cli/check.md)
- Learn how to use the [Fix Command](../cli/fix.md)
- Explore the [API Reference](../api/ast-analyzer.md)
