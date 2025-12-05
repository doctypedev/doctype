# Doctype Core (Rust)

High-performance Rust implementation of Doctype's core functionality using **napi-rs**.

## Overview

This crate provides native Node.js bindings for CPU-intensive operations:

- **AST Analysis**: Parse and analyze TypeScript/JavaScript code *(placeholder)*
- **Signature Hashing**: Generate deterministic SHA256 hashes *(future)*
- **Drift Detection**: Compare code signatures *(future)*

## Quick Start

### Build

```bash
# Install dependencies
npm install

# Build for your platform
npm run build

# Build debug version
npm run build:debug
```

### Test Locally

```bash
# Run the example
node example.js
```

**Expected output:**
```
🦀 Doctype Rust Core - Example

1. Hello World:
   Hello from Doctype Rust Core! 🦀

2. Version:
   0.1.0

3. AST Analyzer:
   analyzeFile: Hello from Rust! Analyzing file: src/index.ts
   getSymbols: [ 'function1', 'function2', 'MyClass' ]

✅ All tests passed!
```

## API

### Functions

```javascript
const { helloWorld, getVersion, AstAnalyzer } = require('@doctypedev/doctype-darwin-arm64');

// Simple hello world
helloWorld() // => "Hello from Doctype Rust Core! 🦀"

// Get version
getVersion() // => "0.1.0"
```

### AstAnalyzer Class

```javascript
const analyzer = new AstAnalyzer();

// Analyze a file (placeholder)
analyzer.analyzeFile('src/index.ts')
// => "Hello from Rust! Analyzing file: src/index.ts"

// Get symbols (placeholder)
analyzer.getSymbols('src/index.ts')
// => ['function1', 'function2', 'MyClass']
```

## Architecture

Built with [napi-rs](https://napi.rs/), providing:
- ✅ **Type-safe** Node.js bindings
- ✅ **Zero-copy** data transfer where possible
- ✅ **Async support** for long-running operations
- ✅ **Cross-platform** compilation

## Project Structure

```
crates/core/
├── Cargo.toml              # Rust package config
├── build.rs                # napi build script
├── package.json            # npm package for @napi-rs/cli
├── src/
│   └── lib.rs             # napi-rs bindings
├── npm/
│   └── darwin-arm64/      # Platform-specific npm package
    ├── scripts/
    │   └── README.md          # Scripts documentation
    ├── src/
```

## Adding Functionality

To add new functions or classes:

1. **Add Rust code** in `src/lib.rs`:
```rust
#[napi]
pub fn my_function(input: String) -> String {
    format!("Processed: {}", input)
}
```

2. **Rebuild**:
```bash
npm run build
```

3. **Use in JavaScript**:
```javascript
const { myFunction } = require('@doctypedev/doctype-darwin-arm64');
myFunction('hello') // => "Processed: hello"
```

## Publishing

Packages are published automatically via GitHub Actions when the main package is released.

## Development Status

- ✅ napi-rs setup complete
- ✅ Hello world functions working
- ✅ AST Analyzer class (placeholder)
- 🚧 Real AST parsing (TODO)
- 🚧 Signature hashing (TODO)
- 🚧 Drift detection (TODO)

## License

MIT - See LICENSE file in the repository root
