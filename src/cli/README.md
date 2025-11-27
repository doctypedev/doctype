# CLI Module

> **Phase 3**: Command-line interface for drift detection and documentation fixing

The CLI module provides an easy-to-use command-line interface for Doctype, enabling developers to check for documentation drift in CI/CD and fix it locally.

## Commands

### `npx doctype check`

Verifies that documentation is in sync with code by detecting drift.

**Usage:**
```bash
npx doctype check [options]
```

**Options:**
- `--map, -m <path>` - Path to doctype-map.json (default: `./doctype-map.json`)
- `--verbose` - Enable verbose logging
- `--strict` - Exit with error code if drift detected (default: true)
- `--help, -h` - Show help
- `--version, -v` - Show version

**Exit Codes:**
- `0` - No drift detected (or drift detected but `--strict=false`)
- `1` - Drift detected and `--strict=true`

**Examples:**
```bash
# Check for drift using default map file
npx doctype check

# Check with verbose output
npx doctype check --verbose

# Check with custom map location
npx doctype check --map ./docs/doctype-map.json

# Check without failing on drift (for reporting only)
npx doctype check --no-strict
```

**Sample Output:**
```
🔍 Doctype Check - Drift Detection

ℹ Checking 15 documentation entries...

────────────────────────────────────────────────────────────
✓ All documentation is in sync with code
ℹ Checked 15 entries, no drift detected
────────────────────────────────────────────────────────────
```

**With Drift Detected:**
```
🔍 Doctype Check - Drift Detection

ℹ Checking 15 documentation entries...

────────────────────────────────────────────────────────────
✗ Documentation drift detected in 2 entries

  login in src/auth/login.ts
    Doc: docs/auth.md:10
    Old hash: 5ee0cf09
    New hash: 907eb46e

  processData in src/utils/process.ts
    Doc: docs/utils.md:25
    Old hash: a3f5c8e9
    New hash: b2c4d6e8

ℹ Run `npx doctype fix` to update the documentation
────────────────────────────────────────────────────────────
```

### `npx doctype fix`

Updates documentation to fix detected drift.

**Usage:**
```bash
npx doctype fix [options]
```

**Options:**
- `--map, -m <path>` - Path to doctype-map.json (default: `./doctype-map.json`)
- `--verbose` - Enable verbose logging
- `--dry-run, -d` - Preview changes without writing files
- `--auto-commit, -a` - Automatically commit changes *(Phase 4 feature)*
- `--interactive, -i` - Prompt before each fix *(Phase 4 feature)*
- `--help, -h` - Show help
- `--version, -v` - Show version

**Exit Codes:**
- `0` - All fixes successful
- `1` - Some fixes failed

**Examples:**
```bash
# Fix all detected drift
npx doctype fix

# Preview fixes without writing files
npx doctype fix --dry-run

# Fix with verbose output
npx doctype fix --verbose

# Fix and auto-commit (Phase 4)
npx doctype fix --auto-commit
```

**Sample Output:**
```
🔧 Doctype Fix - Update Documentation

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
────────────────────────────────────────────────────────────
```

**Dry Run Output:**
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

## CI/CD Integration

### GitHub Actions

Add Doctype check to your CI workflow:

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

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Check documentation drift
        run: npx doctype check --verbose
```

### GitLab CI

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

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npx doctype check || {
  echo "Documentation drift detected!"
  echo "Run 'npx doctype fix' to update documentation"
  exit 1
}
```

## Current Limitations (Phase 3)

### Phase 3 Features (Current)
- ✅ Drift detection
- ✅ Documentation fixing with placeholder content
- ✅ Dry-run mode
- ✅ Verbose logging
- ✅ CI/CD integration

### Phase 4 Features (Future)
- ⏳ AI-generated documentation content (OpenAI/Gemini)
- ⏳ `--auto-commit` flag for automatic git commits
- ⏳ `--interactive` mode for manual review
- ⏳ Smart content generation based on code changes

**Current Fix Behavior:**
Phase 3 generates placeholder content with the current signature:

```markdown
**functionName** - Documentation needs update

Current signature:
\`\`\`typescript
export function functionName(param: string): string
\`\`\`

*This content was automatically generated by Doctype. The code signature has changed and this documentation needs to be updated manually.*

*Phase 4 (AI Integration) will automatically generate proper documentation based on code changes.*
```

**Phase 4 Fix Behavior:**
Will use AI to generate proper documentation:

```markdown
Authenticates a user with email and password.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password (minimum 8 characters)
- `mfaToken` (string, optional): Multi-factor authentication token

**Returns:**
- `Promise<string>`: JWT authentication token with 24h expiry

**Example:**
\`\`\`typescript
const token = await login('user@example.com', 'password123');
\`\`\`

**Throws:**
- `AuthError`: If credentials are invalid
- `MFARequired`: If MFA is enabled but token not provided
```

## Architecture

```
┌─────────────────┐
│   CLI Entry     │ (index.ts)
│  (yargs parser) │
└────────┬────────┘
         │
         ├───→ check.ts  ──→ CheckResult
         │       │
         │       ├──→ DoctypeMapManager (load map)
         │       ├──→ ASTAnalyzer (analyze code)
         │       ├──→ SignatureHasher (generate hashes)
         │       └──→ Logger (output)
         │
         └───→ fix.ts  ──→ FixResult
                 │
                 ├──→ DoctypeMapManager (load/update map)
                 ├──→ ASTAnalyzer (analyze code)
                 ├──→ SignatureHasher (generate hashes)
                 ├──→ ContentInjector (update docs)
                 └──→ Logger (output)
```

## Modules

### `types.ts`
Core type definitions for CLI operations:
- `CheckResult` - Result of drift check
- `DriftDetail` - Details about a specific drift
- `FixResult` - Result of fix operation
- `FixDetail` - Details about a specific fix
- `CLIConfig` - CLI configuration
- `CheckOptions` - Options for check command
- `FixOptions` - Options for fix command

### `logger.ts`
Colored console output with multiple log levels:
- `error()` - Red ✗ prefix
- `warn()` - Yellow ⚠ prefix
- `info()` - Blue ℹ prefix
- `success()` - Green ✓ prefix
- `debug()` - Gray [DEBUG] prefix (verbose mode only)
- `header()` - Bold cyan section headers
- `divider()` - Horizontal separator line

### `check.ts`
Drift detection command implementation:
1. Load doctype-map.json
2. Analyze current code signatures
3. Compare hashes
4. Report drifts with details
5. Exit with appropriate code

### `fix.ts`
Documentation fixing command implementation:
1. Load doctype-map.json
2. Detect drifts (same as check)
3. Generate new content (placeholder in Phase 3, AI in Phase 4)
4. Inject content into documentation
5. Update map with new hashes
6. Report results

### `index.ts`
CLI entry point using yargs:
- Command parsing
- Option validation
- Help generation
- Error handling

## Testing

**12 comprehensive tests** covering:
- Check command: 6 tests
- Fix command: 6 tests

Run tests:
```bash
npm test src/cli/__tests__
```

Test coverage:
- Drift detection (no drift, single drift, multiple drifts)
- Error handling (missing files, invalid maps)
- Dry-run mode
- Verbose output
- Map updates
- Content generation

## Error Handling

All commands include comprehensive error handling:

**Missing Map File:**
```
✗ Map file not found: ./doctype-map.json
ℹ Run this command from your project root, or specify --map path
```

**Missing Code File:**
```
⚠ Code file not found: src/utils/helper.ts (helperFunc)
```

**Symbol Not Found:**
```
⚠ Symbol formatDate not found in src/utils/helper.ts
```

**Injection Failed:**
```
✗ Failed to update: Anchor with id="uuid" not found
```

## Development

### Adding a New Command

1. Create command file in `src/cli/`:
```typescript
// src/cli/my-command.ts
import { Logger } from './logger';

export async function myCommand(options: MyOptions): Promise<MyResult> {
  const logger = new Logger(options.verbose);

  logger.header('🎯 My Command');

  // Command logic here

  return result;
}
```

2. Add command to `index.ts`:
```typescript
.command(
  'my-command',
  'Description of my command',
  (yargs) => {
    return yargs.option('option-name', { /*...*/ });
  },
  async (argv) => {
    const result = await myCommand(argv);
    if (!result.success) process.exit(1);
  }
)
```

3. Add tests in `src/cli/__tests__/my-command.test.ts`

---

**Status**: ✅ Phase 3 Complete (12/12 tests passing)
