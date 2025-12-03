# Doctype Core (Rust)

High-performance Rust implementation of Doctype's core functionality.

## Overview

This crate provides native implementations of CPU-intensive operations for the Doctype documentation system:

- **AST Analysis**: Parse and analyze source code to extract public symbols and signatures
- **Signature Hashing**: Generate deterministic SHA256 hashes from code signatures
- **Drift Detection**: Compare code signature hashes to detect documentation drift

## Architecture

The Rust core is designed to be called from the TypeScript layer via FFI (Foreign Function Interface), providing:

- **Native Performance**: CPU-intensive operations run at native speeds
- **Seamless Integration**: Exposed to TypeScript through Node.js bindings
- **Existing Workflow**: Maintains the current CLI and user experience

## Module Structure

```
crates/core/
├── Cargo.toml           # Package configuration
├── src/
│   ├── lib.rs          # Main library entry point
│   ├── ast.rs          # AST analysis module
│   ├── signature.rs    # Signature hashing module
│   └── drift.rs        # Drift detection module
└── README.md           # This file
```

## Development Status

🚧 **Currently in early development** - The structure is in place, but core functionality is not yet implemented.

## Future Implementation

- [ ] TypeScript AST parsing using tree-sitter
- [ ] SHA256 signature hashing
- [ ] FFI bindings for Node.js (using napi-rs or similar)
- [ ] Performance benchmarks vs TypeScript implementation
- [ ] Comprehensive test suite

## Building

```bash
# Build the library
cargo build

# Run tests
cargo test

# Build for release (optimized)
cargo build --release
```

## License

MIT - See LICENSE file in the repository root
