# Build Scripts

Script for managing the Doctype native core packages.

## `sync-version.js`

Synchronizes the version from the main `package.json` to all platform-specific npm packages.

```bash
node crates/core/scripts/sync-version.js
```

**What it does:**
1. Reads the version from the root `package.json` (e.g., `0.3.10`)
2. Updates all platform-specific packages in `crates/core/npm/` to match

**Used by:**
- GitHub Actions workflow during publish (`.github/workflows/publish.yml`)

**When to use manually:**
- When you need to sync versions before testing locally
- After manually bumping the version

## Local Development

For local building and testing:

```bash
# Build the library
cd crates/core
npm install
npm run build

# Test
node example.js

# Test the package
cd npm/darwin-arm64
npm pack
```
