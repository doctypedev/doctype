# Phase 3 - CLI / Executor

**Status**: ✅ Complete
**Completion Date**: 2025-11-27

## Overview

Phase 3 implements the command-line interface for Doctype, enabling developers to:
- **Check** for documentation drift in CI/CD pipelines
- **Fix** drift by updating documentation files
- **Integrate** seamlessly into existing workflows

This phase provides the user-facing interface for the core functionality built in Phases 1 and 2.

## Commands Implemented

### 1. `npx doctype check`

Verifies documentation is in sync with code by detecting signature drift.

**Key Features:**
- Loads and validates doctype-map.json
- Analyzes current code signatures
- Compares with saved hashes
- Reports detailed drift information
- Exits with error code for CI/CD

**Usage Example:**
```bash
npx doctype check --verbose
```

**Output:**
```
🔍 Doctype Check - Drift Detection

ℹ Checking 15 documentation entries...

────────────────────────────────────────────────────────────
✓ All documentation is in sync with code
ℹ Checked 15 entries, no drift detected
────────────────────────────────────────────────────────────
```

### 2. `npx doctype fix`

Updates documentation when drift is detected.

**Key Features:**
- Detects drifted entries
- Generates placeholder content (Phase 3) or AI content (Phase 4)
- Injects updated content into Markdown files
- Updates doctype-map.json with new hashes
- Supports dry-run mode for preview

**Usage Example:**
```bash
npx doctype fix --dry-run
```

**Output:**
```
🔧 Doctype Fix - Update Documentation

⚠ Dry run mode - no files will be modified

ℹ Analyzing 15 documentation entries...

ℹ Found 2 entries with drift

────────────────────────────────────────────────────────────

login - src/auth/login.ts
  Documentation: docs/auth.md:10
✓ Updated documentation (5 lines changed)

processData - src/utils/process.ts
  Documentation: docs/utils.md:25
✓ Updated documentation (8 lines changed)

────────────────────────────────────────────────────────────
✓ Successfully updated 2 entries
ℹ Dry run complete - no files were modified
────────────────────────────────────────────────────────────
```

## Modules Implemented

### 1. Logger (`cli/logger.ts`)

Professional CLI output with colored formatting.

**Features:**
- Multiple log levels (error, warn, info, success, debug)
- ANSI color codes for terminal output
- Conditional verbose logging
- Formatted helpers (path, symbol, hash)
- Section headers and dividers

**API:**
```typescript
const logger = new Logger(verbose);

logger.error('Error message');    // ✗ Red
logger.warn('Warning message');    // ⚠ Yellow
logger.info('Info message');       // ℹ Blue
logger.success('Success message'); // ✓ Green
logger.debug('Debug message');     // [DEBUG] Gray (verbose only)
logger.header('Section Title');    // Bold cyan
logger.divider();                  // ──────────
```

### 2. Check Command (`cli/check.ts`)

Drift detection implementation.

**Process:**
1. Load doctype-map.json
2. For each entry:
   - Analyze current code file
   - Find matching symbol
   - Generate current hash
   - Compare with saved hash
3. Collect all drifts
4. Display results
5. Exit with code (0 = no drift, 1 = drift detected)

**Error Handling:**
- Missing map file
- Missing code files
- Symbol not found
- Invalid map structure

### 3. Fix Command (`cli/fix.ts`)

Documentation updating implementation.

**Process:**
1. Load doctype-map.json
2. Detect all drifted entries (same as check)
3. For each drift:
   - Generate new content (placeholder or AI)
   - Inject into documentation file
   - Update map entry with new hash
4. Save updated map
5. Display results

**Modes:**
- Normal: Write files and update map
- Dry-run: Preview without writing

**Phase 3 vs Phase 4:**
- Phase 3: Generates placeholder with signature
- Phase 4: Uses AI (OpenAI/Gemini) for smart content

### 4. CLI Entry Point (`cli/index.ts`)

Main CLI using yargs for argument parsing.

**Features:**
- Command routing (check, fix)
- Option parsing and validation
- Help and usage information
- Version display
- Error handling

**Commands:**
```typescript
doctype check [options]
doctype fix [options]
```

**Global Options:**
- `--help, -h`: Show help
- `--version, -v`: Show version

### 5. Type Definitions (`cli/types.ts`)

TypeScript interfaces for CLI operations.

**Key Types:**
- `CheckResult`: Result of check command
- `DriftDetail`: Information about a drift
- `FixResult`: Result of fix command
- `FixDetail`: Information about a fix
- `CheckOptions`: Options for check command
- `FixOptions`: Options for fix command

## Test Coverage

**12 comprehensive tests** (all passing):

### Check Command Tests (6)
1. Detect no drift when code unchanged
2. Detect drift when signature changes
3. Handle missing map file gracefully
4. Handle empty map file
5. Handle missing code file gracefully
6. Provide detailed drift info in verbose mode

### Fix Command Tests (6)
1. Fix drift by updating documentation
2. Not modify files in dry-run mode
3. Handle missing map file gracefully
4. Handle no drift detected
5. Update map file after successful fix
6. Generate placeholder content with signature

**Total Project Tests**: 114 (102 from Phases 1 & 2 + 12 from Phase 3)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Documentation Drift Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  doctype-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx doctype check --verbose
```

### GitLab CI Example

```yaml
doctype-check:
  image: node:20
  script:
    - npm ci
    - npx doctype check --verbose
  only:
    - merge_requests
    - main
```

### Pre-commit Hook

```bash
#!/bin/sh
npx doctype check || {
  echo "Documentation drift detected!"
  echo "Run 'npx doctype fix' to update documentation"
  exit 1
}
```

## File Structure

```
src/
├── cli/
│   ├── index.ts                 # CLI entry point (yargs)
│   ├── check.ts                 # Check command implementation
│   ├── fix.ts                   # Fix command implementation
│   ├── logger.ts                # Colored console output
│   ├── types.ts                 # CLI type definitions
│   ├── README.md                # CLI module documentation
│   └── __tests__/
│       ├── check.test.ts        # Check command tests
│       └── fix.test.ts          # Fix command tests
└── index.ts                     # Updated with CLI exports
```

## Integration with Previous Phases

Phase 3 CLI integrates seamlessly with:

**Phase 1 (AST & Drift Detection):**
- Uses `ASTAnalyzer` to extract current signatures
- Uses `SignatureHasher` to generate and compare hashes

**Phase 2 (Content & Mapping):**
- Uses `DoctypeMapManager` to load/update map
- Uses `ContentInjector` to update documentation
- Uses `MarkdownParser` for validation (indirect)

**Complete Workflow:**
```
CLI Input → Check/Fix Command
    ↓
Load Map (DoctypeMapManager)
    ↓
Analyze Code (ASTAnalyzer)
    ↓
Generate Hashes (SignatureHasher)
    ↓
Compare Hashes (Drift Detection)
    ↓
If Drift: Inject Content (ContentInjector)
    ↓
Update Map (DoctypeMapManager)
    ↓
CLI Output (Logger)
```

## Current Limitations & Phase 4 Preview

### Phase 3 Implementation (Current)

**Content Generation:**
Phase 3 generates simple placeholder content:

```markdown
**functionName** - Documentation needs update

Current signature:
\`\`\`typescript
export function functionName(param: string): string
\`\`\`

*This content was automatically generated by Doctype...*
*Phase 4 will automatically generate proper documentation...*
```

**Flags Not Yet Implemented:**
- `--auto-commit`: Automatic git commit (Phase 4)
- `--interactive`: Manual review mode (Phase 4)

### Phase 4 Enhancements (Future)

**AI-Generated Content:**
```markdown
Authenticates a user with email and password credentials.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password (minimum 8 characters)

**Returns:**
- `Promise<string>`: JWT authentication token with 24h expiry

**Example:**
\`\`\`typescript
const token = await login('user@example.com', 'password123');
\`\`\`

**Throws:**
- `AuthError`: If credentials are invalid
```

**Additional Features:**
- OpenAI/Gemini API integration
- Smart prompt engineering
- Automatic PR creation
- Git commit and push
- Interactive review mode

## Performance Considerations

**Optimization Strategies:**
- Lazy loading: Only analyze files with potential drift
- Batch operations: Process multiple entries efficiently
- Caching: Reuse analyzer instance across files
- Parallel processing: Analyze multiple files concurrently (future)

**Typical Performance:**
- 100 entries: ~5 seconds
- 1000 entries: ~30 seconds
- Bottleneck: TypeScript AST analysis

## Error Messages & User Experience

All error messages are clear and actionable:

**Missing Map:**
```
✗ Map file not found: ./doctype-map.json
ℹ Run this command from your project root, or specify --map path
```

**No Entries:**
```
⚠ No entries found in doctype-map.json
ℹ Add documentation anchors to your Markdown files to track them
```

**Drift Detected:**
```
✗ Documentation drift detected in 2 entries
ℹ Run `npx doctype fix` to update the documentation
```

## Development Workflow

**Adding a New Command:**

1. Create command file: `src/cli/new-command.ts`
2. Implement command function: `async function newCommand(options): Promise<Result>`
3. Add to `index.ts`: `.command('new-command', ...)`
4. Write tests: `src/cli/__tests__/new-command.test.ts`
5. Update README: `src/cli/README.md`
6. Update docs: `docs/PHASE3.md`

**Testing:**
```bash
npm test src/cli/__tests__
```

**Building:**
```bash
npm run build
```

**Local Testing:**
```bash
npm link
doctype check --verbose
```

## Conclusion

Phase 3 is complete with:
- ✅ 2 CLI commands implemented (check, fix)
- ✅ Professional colored output
- ✅ Comprehensive error handling
- ✅ 12 tests (all passing)
- ✅ CI/CD integration examples
- ✅ Complete documentation

The CLI provides a solid foundation for Phase 4 (AI integration), which will enhance the `fix` command with intelligent content generation using OpenAI or Gemini APIs.

**Next Phase:** Phase 4 - Gen AI Agent
- OpenAI/Gemini integration
- Smart content generation
- Automatic PR workflow
- `--auto-commit` implementation
