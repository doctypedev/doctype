# doctype check

Verify that documentation is in sync with code.

## Overview

The `check` command analyzes your codebase and compares current code signatures with those saved in `doctype-map.json`. If any drift is detected, it reports the mismatches and optionally exits with an error code.

## Usage

```bash
npx doctype check [options]
```

## Options

### `--map, -m`
- **Type**: `string`
- **Default**: `./doctype-map.json`
- **Description**: Path to the doctype-map.json file

```bash
npx doctype check --map ./custom-path/doctype-map.json
```

### `--verbose`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable detailed logging output

```bash
npx doctype check --verbose
```

### `--strict`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Exit with error code if drift is detected

```bash
npx doctype check --strict=false
```

## Examples

### Basic Check

```bash
npx doctype check
```

### Verbose Output

```bash
npx doctype check --verbose
```

Output example:
```
✓ Checking documentation drift...
  Analyzing 15 entries from doctype-map.json

  ✓ src/utils.ts#calculateTotal - OK
  ✗ src/auth.ts#validateUser - DRIFT DETECTED
    Expected: abc123...
    Got:      def456...

  Result: 1 drift(s) detected
```

### CI Integration

In your CI pipeline (e.g., GitHub Actions):

```yaml
- name: Check documentation drift
  run: npx doctype check
```

If drift is detected, the CI will fail, preventing merges with outdated docs.

## Exit Codes

- `0` - No drift detected (all signatures match)
- `1` - Drift detected OR configuration error

## How It Works

<!-- doctype:start id="a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" code_ref="src/cli/check.ts#checkCommand" -->
The check command performs the following steps:

1. Loads the doctype-map.json file using DoctypeMapManager
2. For each entry in the map:
   - Reads the source file specified in code_ref
   - Analyzes the symbol using ASTAnalyzer
   - Calculates the current signature hash using SignatureHasher
   - Compares with the saved hash
3. Reports all detected drifts
4. Exits with appropriate status code
<!-- doctype:end id="a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" -->

## Related Commands

- [`doctype fix`](./fix.md) - Fix detected drift

## See Also

- [Core Concepts](../guide/core-concepts.md)
- [ASTAnalyzer API](../api/ast-analyzer.md)
- [SignatureHasher API](../api/signature-hasher.md)
