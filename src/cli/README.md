# CLI Module - Command Line Interface

The **CLI Module** provides the command-line interface for Doctype, enabling developers to check for documentation drift and automatically fix it.

## Purpose

This module implements the **user interface layer** of Doctype:

- Parse command-line arguments and options
- Orchestrate interactions between core, content, and AI modules
- Display formatted output with colors and progress indicators
- Manage git operations for auto-commit functionality

## Commands

### `npx doctype check`

Verifies that documentation is in sync with code by detecting signature drift.

**Usage:**

```bash
npx doctype check [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--map <path>` | Path to doctype-map.json | `./doctype-map.json` |
| `--verbose` | Enable detailed output | `false` |
| `--strict` | Exit with error code on drift | `true` |

**Examples:**

```bash
# Basic check
npx doctype check

# Check with custom map location
npx doctype check --map ./docs/doctype-map.json

# Check with verbose output
npx doctype check --verbose

# Check without failing on drift (for CI warnings)
npx doctype check --no-strict
```

**Exit Codes:**

- `0` - No drift detected, documentation is in sync
- `1` - Drift detected or configuration error

**Output:**

```
🔍 Doctype Check - Drift Detection

ℹ Checking 15 documentation entries...

────────────────────────────────────────────────────────────
✓ All documentation is in sync with code
ℹ Checked 15 entries, no drift detected
────────────────────────────────────────────────────────────
```

**With Drift:**

```
🔍 Doctype Check - Drift Detection

ℹ Checking 15 documentation entries...

────────────────────────────────────────────────────────────
⚠ Documentation drift detected in 2 entries:

  login - src/auth/login.ts
    Documentation: docs/auth.md:10
    Cause: Function signature changed

  processData - src/utils/process.ts
    Documentation: docs/utils.md:25
    Cause: Parameter types changed

────────────────────────────────────────────────────────────
✗ Found 2 entries with drift
ℹ Run 'npx doctype fix' to update documentation
────────────────────────────────────────────────────────────
```

### `npx doctype fix`

Updates documentation when drift is detected, using AI or placeholder content.

**Usage:**

```bash
npx doctype fix [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--map <path>` | Path to doctype-map.json | `./doctype-map.json` |
| `--dry-run` | Preview changes without writing | `false` |
| `--auto-commit` | Auto-commit changes to git | `false` |
| `--no-ai` | Use placeholder instead of AI | `false` |
| `--verbose` | Enable detailed output | `false` |

**Examples:**

```bash
# Fix with AI-generated content (requires OPENAI_API_KEY)
npx doctype fix

# Preview changes without writing files
npx doctype fix --dry-run

# Fix and automatically commit changes
npx doctype fix --auto-commit

# Fix without AI (use placeholder content)
npx doctype fix --no-ai

# Fix with verbose output
npx doctype fix --verbose
```

**Output:**

```
🔧 Doctype Fix - Update Documentation

ℹ Analyzing 15 documentation entries...

ℹ Found 2 entries with drift

────────────────────────────────────────────────────────────

login - src/auth/login.ts
  Documentation: docs/auth.md:10
  Using AI generation (GPT-4)
✓ Updated documentation (5 lines changed)

processData - src/utils/process.ts
  Documentation: docs/utils.md:25
  Using AI generation (GPT-4)
✓ Updated documentation (8 lines changed)

────────────────────────────────────────────────────────────
✓ Successfully updated 2 entries
ℹ Updated files:
  - docs/auth.md
  - docs/utils.md
  - doctype-map.json
────────────────────────────────────────────────────────────
```

**With Auto-Commit:**

```
🔧 Doctype Fix - Update Documentation

[... fix output ...]

────────────────────────────────────────────────────────────
🔄 Auto-committing changes...
✓ Staged 3 files
✓ Created commit: 🤖 Doctype Bot: Auto-fix documentation for login, processData
────────────────────────────────────────────────────────────
```

### `npx doctype init`

Initializes Doctype by scanning the codebase and creating documentation anchors based on the selected strategy (Mirror, Module, or Type).

**Usage:**

```bash
npx doctype init [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--docs <path>` | Documentation directory to scan | `./docs` |
| `--map <path>` | Output path for doctype-map.json | `./doctype-map.json` |
| `--verbose` | Enable detailed output | `false` |

**Examples:**

```bash
# Initialize with default settings
npx doctype init

# Initialize with custom docs directory
npx doctype init --docs ./documentation

# Initialize with custom map location
npx doctype init --map ./custom-map.json
```

**Output:**

```
🚀 DOCTYPE INITIALIZATION

[...]

Scanning codebase and creating documentation anchors...
✅ Created 15 documentation anchors in documentation files

📋 Configuration Summary
Project Name: My Project
Project Root: .
Docs Folder:  ./docs
Map File:     doctype-map.json

🎯 Status
✓ Configuration saved
✓ Documentation anchors created
✓ Map file initialized

Next steps:
• Review and edit generated documentation files
• Run "doctype check" to verify documentation is in sync
```

## Modules

### Logger (`logger.ts`)

<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440006" code_ref="src/cli/logger.ts#Logger" -->
Professional CLI output with colored formatting and log levels.

**Features:**
- Multiple log levels (error, warn, info, success, debug)
- ANSI color codes for terminal output
- Conditional verbose logging
- Formatted helpers (path, symbol, hash)
- Section headers and dividers

**API:**

```typescript
import { Logger } from 'doctype/cli';

const logger = new Logger(verbose);

logger.error('Error message');       // ✗ Red
logger.warn('Warning message');       // ⚠ Yellow
logger.info('Info message');          // ℹ Blue
logger.success('Success message');    // ✓ Green
logger.debug('Debug message');        // [DEBUG] Gray (verbose only)

logger.header('Section Title');       // Bold cyan
logger.divider();                     // ──────────

// Formatted helpers
logger.formatPath('src/auth/login.ts');    // Cyan
logger.formatSymbol('login');               // Yellow
logger.formatHash('abc123...');             // Gray
```
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440006" -->

### GitHelper (`git-helper.ts`)

<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440007" code_ref="src/cli/git-helper.ts#GitHelper" -->
Git operations for auto-commit functionality.

**Features:**
- Repository validation (check if current directory is a git repo)
- File staging (`git add`)
- Commit creation with standardized messages
- Optional push to remote

**API:**

```typescript
import { GitHelper } from 'doctype/cli';

const git = new GitHelper(logger);

// Check if current directory is a git repository
const isRepo = git.isGitRepository();

// Auto-commit documentation changes
const result = git.autoCommit(
  ['docs/api.md', 'docs/auth.md', 'doctype-map.json'], // Files to commit
  ['login', 'logout'],                                 // Symbol names
  false                                                 // Don't push to remote
);

if (result.success) {
  console.log(`Created commit: ${result.commitMessage}`);
}
```
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440007" -->

**Commit Message Format:**

```bash
# Single symbol
🤖 Doctype Bot: Auto-fix documentation for login

# Multiple symbols (≤3)
🤖 Doctype Bot: Auto-fix documentation for login, logout

# Many symbols (>3)
🤖 Doctype Bot: Auto-fix documentation for 5 symbols
```

### Check Command (`check.ts`)

Drift detection implementation.

**Process:**

1. Load `doctype-map.json`
2. For each entry:
   - Analyze current code file (AST)
   - Find matching symbol
   - Generate current hash
   - Compare with saved hash in map
3. Collect all drifts
4. Display results
5. Exit with code `0` (no drift) or `1` (drift detected)

**API:**

```typescript
import { runCheckCommand } from 'doctype/cli';

const result = await runCheckCommand({
  mapPath: './doctype-map.json',
  verbose: true,
  strict: true
});

console.log(result.drifts.length); // Number of drifted entries
process.exit(result.exitCode);     // 0 or 1
```

### Fix Command (`fix.ts`)

Documentation updating implementation.

**Process:**

1. Load `doctype-map.json`
2. Detect all drifted entries (same as check command)
3. For each drift:
   - Generate new content:
     - **With AI** (default): Use OpenAI GPT-4 to generate intelligent docs
     - **Without AI** (`--no-ai`): Use placeholder with signature info
   - Inject into documentation file
   - Update map entry with new hash
4. Save updated map
5. Optionally auto-commit changes (`--auto-commit`)
6. Display results

**API:**

```typescript
import { runFixCommand } from 'doctype/cli';

const result = await runFixCommand({
  mapPath: './doctype-map.json',
  dryRun: false,
  autoCommit: true,
  useAI: true,
  verbose: true
});

console.log(result.fixedCount);    // Number of entries fixed
console.log(result.filesModified); // List of modified files
```

## CLI Entry Point (`index.ts`)

Main CLI using `yargs` for argument parsing and command routing.

**Structure:**

```typescript
#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command('check', 'Verify documentation is in sync', checkOptions, checkHandler)
  .command('fix', 'Update documentation when drift detected', fixOptions, fixHandler)
  .command('init', 'Initialize doctype-map.json', initOptions, initHandler)
  .demandCommand(1, 'You must provide a command')
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .parse();
```

## Integration with Other Modules

### With Core Module (AST & Drift Detection)

```typescript
import { ASTAnalyzer, SignatureHasher } from 'doctype/core';
import { Logger } from 'doctype/cli';

const logger = new Logger(verbose);
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

for (const entry of entries) {
  logger.debug(`Analyzing ${entry.codeRef.symbolName}...`);

  const signature = analyzer.findSymbol(
    entry.codeRef.filePath,
    entry.codeRef.symbolName
  );
  const currentHash = hasher.hash(signature).hash;

  if (currentHash !== entry.codeSignatureHash) {
    logger.warn(`Drift detected: ${entry.codeRef.symbolName}`);
  }
}
```

### With Content Module

```typescript
import { DoctypeMapManager, ContentInjector } from 'doctype/content';
import { Logger } from 'doctype/cli';

const logger = new Logger(verbose);
const mapManager = new DoctypeMapManager(mapPath);
const injector = new ContentInjector();

// Inject new content
const result = injector.injectIntoFile(
  entry.docRef.filePath,
  entry.id,
  newContent,
  !dryRun
);

if (result.success) {
  logger.success(`Updated ${entry.codeRef.symbolName}`);
}
```

### With AI Module

```typescript
import { createAgentFromEnv } from 'doctype/ai';
import { Logger } from 'doctype/cli';

const logger = new Logger(verbose);

if (useAI) {
  const agent = createAgentFromEnv();

  logger.debug('Generating documentation with AI...');

  const newDocs = await agent.generateFromDrift(
    symbolName,
    oldSignature,
    newSignature,
    oldDocumentation,
    filePath
  );

  logger.success('AI generation complete');
}
```

## Environment Variables

The CLI module respects these environment variables:

```bash
# For AI-powered documentation generation
export OPENAI_API_KEY=sk-your-api-key-here

# Alternative (future support)
export GEMINI_API_KEY=your-gemini-key
```

## Testing

The CLI module has comprehensive test coverage:

```bash
npm test src/cli
```

**Test Coverage:**
- Check command (6 tests)
  - No drift detection
  - Drift detection
  - Missing map file
  - Missing code files
  - Symbol not found
  - Exit codes
- Fix command (6 tests)
  - Fix with AI
  - Fix with placeholder
  - Dry-run mode
  - Auto-commit
  - Multiple entries
  - File modification tracking

**Total: 12 tests**

## Error Handling

The CLI provides clear error messages for common scenarios:

```bash
# Missing map file
✗ Error: Map file not found at ./doctype-map.json
ℹ Run 'npx doctype init' to create it

# Missing code file
✗ Error: Code file not found: src/missing.ts
ℹ Check the code_ref in your anchor tags

# Symbol not found
✗ Error: Symbol 'nonexistent' not found in src/auth.ts
ℹ Verify the symbol name in your code_ref

# No API key (when using AI)
⚠ Warning: No API key found for AI generation
ℹ Set OPENAI_API_KEY environment variable
ℹ Falling back to placeholder content

# Git not initialized (when using --auto-commit)
✗ Error: Not a git repository
ℹ Initialize git with 'git init' or remove --auto-commit flag
```

## Dependencies

- **yargs**: Command-line argument parsing
- **chalk**: Terminal color output
- Node.js `child_process` (built-in): Git operations

## Further Reading

- [yargs Documentation](https://yargs.js.org/)
- [ANSI Escape Codes](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [Git Commit Best Practices](https://cbea.ms/git-commit/)
