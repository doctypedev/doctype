# doctype fix

Update documentation to fix detected drift.

## Overview

The `fix` command detects documentation drift and prepares updates. In the current implementation (Phase 3), it performs dry-run analysis and reports what would be fixed. Phase 4 will add GenAI integration for automatic content generation.

## Usage

```bash
npx doctype fix [options]
```

## Options

### `--map, -m`
- **Type**: `string`
- **Default**: `./doctype-map.json`
- **Description**: Path to the doctype-map.json file

```bash
npx doctype fix --map ./custom-path/doctype-map.json
```

### `--verbose`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable detailed logging output

```bash
npx doctype fix --verbose
```

### `--dry-run, -d`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Preview changes without writing files

```bash
npx doctype fix --dry-run
```

### `--auto-commit, -a`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Automatically commit changes (Phase 4 - Not yet implemented)

```bash
npx doctype fix --auto-commit
```

### `--interactive, -i`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Prompt before each fix (Phase 4 - Not yet implemented)

```bash
npx doctype fix --interactive
```

## Examples

### Dry Run (Preview Changes)

```bash
npx doctype fix --dry-run
```

Output example:
```
ℹ Detecting documentation drift...
  Found 1 drift(s)

ℹ Would fix the following:

  1. src/auth.ts#validateUser
     File: docs/api/auth.md
     Lines: 45-52

     Old signature:
       function validateUser(username: string): boolean

     New signature:
       function validateUser(username: string, password: string): boolean

  [DRY RUN] No files were modified
```

### Apply Fixes

```bash
npx doctype fix
```

This will:
1. Detect drifted entries
2. Update hash in `doctype-map.json`
3. Prepare for GenAI content generation (Phase 4)

## Exit Codes

- `0` - All fixes applied successfully (or no drift detected)
- `1` - Fix failed OR configuration error

## How It Works

<!-- doctype:start id="b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e" code_ref="src/cli/fix.ts#fixCommand" -->
The fix command performs the following steps:

1. Runs drift detection using DriftDetector
2. For each drifted entry:
   - Extracts old and new code signatures
   - Prepares context for GenAI (Phase 4)
   - Updates the hash in doctype-map.json
3. In Phase 4, will also:
   - Generate new documentation content via LLM
   - Inject content using ContentInjector
   - Optionally commit changes to git
<!-- doctype:end id="b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e" -->

## Phase 4 Features (Coming Soon)

The `fix` command will be enhanced with:

### GenAI Integration
- Automatic content generation using OpenAI/Gemini
- Context-aware prompts comparing old vs new signatures
- Preservation of documentation style and tone

### Auto-Commit
```bash
npx doctype fix --auto-commit
```

Will automatically:
1. Fix all drifted documentation
2. Stage changes (`git add`)
3. Commit with message: `🤖 Doctype Bot: Auto-fix documentation for [Symbol Name]`
4. Push to current branch

### Interactive Mode
```bash
npx doctype fix --interactive
```

Will prompt for each fix:
```
Fix src/auth.ts#validateUser? (y/n/preview/skip-all)
```

## Related Commands

- [`doctype check`](./check.md) - Check for drift

## See Also

- [Core Concepts](../guide/core-concepts.md)
- [ContentInjector API](../api/content-injector.md)
