# @doctypedev/doctype-darwin-arm64

Native binary for Doctype core on macOS ARM64 (Apple Silicon).

This package contains the Rust-compiled native binary for the Doctype AST analyzer and signature hasher, optimized for Apple Silicon Macs.

## Platform Support

- **OS**: macOS (darwin)
- **Architecture**: ARM64 (Apple Silicon: M1, M2, M3, etc.)

## Installation

This package is automatically installed as an optional dependency when you install `@doctypedev/doctype` on a compatible system.

```bash
npm install @doctypedev/doctype-darwin-arm64
```

## Usage

You typically don't need to use this package directly. It's consumed by the main `@doctypedev/doctype` package.

If you need to use it directly:

```javascript
const doctypeCore = require('@doctypedev/doctype-darwin-arm64');
```

## Version

This package version matches the main `@doctypedev/doctype` package version.

## License

MIT
