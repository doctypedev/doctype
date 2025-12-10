# @sintesi/sintesi-darwin-arm64

Native binary for Sintesi core on macOS ARM64 (Apple Silicon).

This package contains the Rust-compiled native binary for the Sintesi AST analyzer and signature hasher, optimized for Apple Silicon Macs.

## Platform Support

- **OS**: macOS (darwin)
- **Architecture**: ARM64 (Apple Silicon: M1, M2, M3, etc.)

## Installation

This package is automatically installed as an optional dependency when you install `@sintesi/sintesi` on a compatible system.

```bash
npm install @sintesi/sintesi-darwin-arm64
```

## Usage

You typically don't need to use this package directly. It's consumed by the main `@sintesi/sintesi` package.

If you need to use it directly:

```javascript
const sintesiCore = require('@sintesi/sintesi-darwin-arm64');
```

## Version

This package version matches the main `@sintesi/sintesi` package version.

## License

MIT
