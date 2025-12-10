# Core Module - AST & Drift Detection

The **Core Module** provides high-performance, deterministic code analysis and drift detection using Rust-powered AST parsing. This is the foundation of Sintesi's ability to detect when code changes.

## Purpose

This module implements the **deterministic logic** layer of Sintesi:

- Analyze TypeScript/JavaScript source files to extract function/class signatures
- Generate cryptographic hashes (SHA256) of code signatures
- Enable drift detection by comparing current hashes with saved hashes
- Fast file discovery with gitignore support

**Key Principle**: For the same code input, this module **always** produces the same output (deterministic).

## Architecture

This package is a **Rust native addon** using N-API bindings. The core logic is implemented in Rust for maximum performance, with a clean TypeScript API layer.

**Technology Stack:**
- **Rust Core** (`crates/core/`): AST analysis using Oxc parser, signature hashing with SHA256
- **N-API Bindings** (`napi-rs`): Zero-cost Node.js bindings
- **TypeScript API**: Type-safe JavaScript interface

**Benefits of Rust:**
- ⚡ **10-100x faster** than pure TypeScript solutions
- 🔒 **Memory safe** without garbage collection overhead
- 📦 **Native performance** with zero runtime cost
- 🎯 **Deterministic** hash generation with battle-tested crypto libraries

## Modules

### AstAnalyzer

Analyzes TypeScript/JavaScript files using the high-performance Oxc parser to extract public API signatures.

**Capabilities:**
- Extract function declarations and signatures
- Extract class declarations with public methods and properties
- Extract interface declarations
- Extract type alias declarations
- Extract enum declarations
- **Automatic hash computation** (SHA256) for every signature
- Parse complex generics and TypeScript features

**API:**

```typescript
import { AstAnalyzer } from '@sintesi/core';

const analyzer = new AstAnalyzer();

// Analyze single file - returns signatures with hashes
const signatures = analyzer.analyzeFile('/path/to/file.ts');

// Each signature includes a pre-computed hash
console.log(signatures[0].hash); // 'abc123...' (SHA256)
```

**Output Example:**

```typescript
{
  symbolName: 'login',
  symbolType: 'Function',
  signatureText: 'function login(email: string, password: string): Promise<string>',
  isExported: true,
  hash: 'a3f5e8d9c2b1f4e6d8a9c7b5e3f1d2c4a6b8d0e2f4c6a8b0d2e4f6a8b0d2e4f6' // SHA256 hash
}
```

### File Discovery

Fast file discovery with `.gitignore` support, powered by Rust.

**API:**

```typescript
import { discoverFiles } from '@sintesi/core';

const result = discoverFiles('/project/root', {
  respectGitignore: true,
  includeHidden: false,
  maxDepth: undefined, // Unlimited
});

console.log(result.sourceFiles);   // ['src/index.ts', 'src/utils.ts', ...]
console.log(result.markdownFiles); // ['README.md', 'docs/api.md', ...]
```

### Signature Hashing

Signature hashing is **automatic and internal** to the Rust implementation. You don't need to call a separate hasher.

**Hash Generation Process:**

1. **Normalize** signature (consistent formatting)
2. **Serialize** critical elements:
   - `name:{symbolName}`
   - `type:{symbolType}`
   - `exported:{isExported}`
   - `signature:{signatureText}`
3. **Generate** SHA256 hash of serialized string
4. **Include** in `CodeSignature.hash` field

**Deterministic Output:**

```typescript
// These produce the SAME hash (formatting normalized)
function login(email: string): Promise<string>
function login(email:string):Promise<string>
function   login  ( email : string )  :  Promise<string>

// These produce DIFFERENT hashes (signature changed)
function login(email: string): Promise<string>
function login(email: string, password: string): Promise<string>
```

### Types

Core TypeScript types provided by the Rust native module.

**Key Types:**

```typescript
// Symbol type enum
enum SymbolType {
  Function = 'Function',
  Class = 'Class',
  Interface = 'Interface',
  TypeAlias = 'TypeAlias',
  Enum = 'Enum',
  Variable = 'Variable',
  Const = 'Const',
}

// Code signature with automatic hash
interface CodeSignature {
  symbolName: string;
  symbolType: SymbolType;
  signatureText: string;
  isExported: boolean;
  hash?: string; // SHA256 hash (computed by Rust)
}

// Code reference
interface CodeRef {
  filePath: string;
  symbolName: string;
}

// File discovery result
interface FileDiscoveryResult {
  sourceFiles: string[];
  markdownFiles: string[];
  stats: {
    totalFiles: number;
    sourceFiles: number;
    markdownFiles: number;
    skippedFiles: number;
  };
}
```

## How Drift Detection Works

Drift detection is a **two-step process**:

### Step 1: Initial Signature Capture

```typescript
import { AstAnalyzer } from '@sintesi/core';
import { SintesiMapManager } from '@sintesi/cli';

const analyzer = new AstAnalyzer();

// Extract signature with automatic hash
const signatures = analyzer.analyzeFile('src/auth/login.ts');
const signature = signatures.find(s => s.symbolName === 'login');

// Hash is already computed by Rust
const hash = signature.hash!;

// Save to sintesi-map.json
mapManager.addEntry({
  id: 'uuid',
  codeRef: { filePath: 'src/auth/login.ts', symbolName: 'login' },
  codeSignatureHash: hash, // Use pre-computed hash
  codeSignatureText: signature.signatureText,
  // ... other fields
});
```

### Step 2: Drift Detection

```typescript
// Later, when checking for drift
const signatures = analyzer.analyzeFile('src/auth/login.ts');
const currentSignature = signatures.find(s => s.symbolName === 'login');
const currentHash = currentSignature.hash!;

// Compare hashes
const savedHash = mapManager.getEntry('uuid').codeSignatureHash;

if (currentHash !== savedHash) {
  console.log('⚠ Drift detected! Code signature changed.');
}
```

**Why this works:**
- SHA256 is cryptographic (collision-resistant)
- Normalization ensures formatting changes don't cause false positives
- Deterministic: same code = same hash, every time
- Computed in Rust for consistent results across platforms

## Integration Example

```typescript
import { AstAnalyzer } from '@sintesi/core';
import { SintesiMapManager } from '@sintesi/cli';

const analyzer = new AstAnalyzer();
const mapManager = new SintesiMapManager('sintesi-map.json');

// Analyze code
const signatures = analyzer.analyzeFile('src/utils.ts');
const helper = signatures.find(s => s.symbolName === 'helper');

// Check for drift using pre-computed hash
const hasDrift = mapManager.hasDrift('entry-uuid', helper.hash!);

if (hasDrift) {
  console.log('Documentation needs update!');
}
```

## Performance Characteristics

### Speed

The Rust implementation provides exceptional performance:

- **10-100x faster** than TypeScript AST parsers
- Handles large codebases (10,000+ files) in seconds
- Parallel file processing using Rust's async runtime
- Zero-copy string handling with Rust

### Memory

- **Minimal memory footprint** compared to TypeScript solutions
- No garbage collection pauses
- Efficient memory allocation with Rust's ownership model

### Caching

File discovery respects `.gitignore` and caches results:

```typescript
const result = discoverFiles('/project/root', {
  respectGitignore: true, // Uses gitignore crate
  includeHidden: false,
  maxDepth: 10,
});
```

## Platform Support

This package includes pre-built native binaries for:

- **macOS**: x64, ARM64 (Apple Silicon)
- **Linux**: x64, ARM64
- **Windows**: x64

Native binaries are automatically selected based on your platform. No compilation required during installation.

## Error Handling

The module handles errors gracefully:

```typescript
import { AstAnalyzer } from '@sintesi/core';

const analyzer = new AstAnalyzer();

try {
  const signatures = analyzer.analyzeFile('src/file.ts');
} catch (error) {
  // File not found or parsing error
  console.error(error.message);
}
```

Common errors:
- File not found
- Invalid TypeScript/JavaScript syntax
- Permission errors

## Dependencies

### Runtime
- **Node.js** >= 18.0.0 (N-API v8)
- No external dependencies (all logic in native binary)

### Build (for development)
- **Rust** >= 1.70
- **napi-rs** (for building native bindings)
- **cargo** (Rust package manager)

## Building from Source

```bash
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build native module
npm run build

# Run Rust tests
cargo test

# Run with specific target
npm run build -- --target x86_64-apple-darwin
```

## Testing

```bash
# Run Rust unit tests (40+ tests)
cargo test

# Run integration tests
npm test
```

**Test Coverage:**
- Function signature extraction
- Class/Interface/Type/Enum extraction
- Hash generation and consistency
- Drift detection logic
- File discovery
- Error handling

## Rust Module Structure

The Rust core is organized into:

```
crates/core/src/
├── ast/           # AST analysis using Oxc
│   ├── analyzer.rs   # Symbol extraction
│   ├── hasher.rs     # SHA256 signature hashing
│   └── drift.rs      # Drift detection logic
├── content/       # File discovery and markdown
│   └── discovery.rs  # Fast file finding
├── napi/          # N-API bindings for Node.js
│   ├── ast.rs        # AstAnalyzer bindings
│   └── content.rs    # Discovery bindings
└── types.rs       # Shared type definitions
```

## Further Reading

- [Oxc Parser](https://oxc-project.github.io/) - High-performance JavaScript/TypeScript parser
- [napi-rs](https://napi.rs/) - Rust N-API bindings
- [SHA256 Hashing](https://en.wikipedia.org/wiki/SHA-2)
- [Rust Book](https://doc.rust-lang.org/book/) - Learn Rust programming
