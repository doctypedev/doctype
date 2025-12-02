# Core Module - AST & Drift Detection

The **Core Module** provides deterministic code analysis and drift detection using TypeScript Abstract Syntax Tree (AST) parsing. This is the foundation of Doctype's ability to detect when code changes.

## Purpose

This module implements the **deterministic logic** layer of Doctype:

- Analyze TypeScript source files to extract function/class signatures
- Generate cryptographic hashes (SHA256) of code signatures
- Enable drift detection by comparing current hashes with saved hashes

**Key Principle**: For the same code input, this module **always** produces the same output (deterministic).

## Modules

### ASTAnalyzer (`ast-analyzer.ts`)

<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440001" code_ref="src/core/ast-analyzer.ts#ASTAnalyzer" -->
Analyzes TypeScript files using a high-performance Rust core (via N-API) to extract public API signatures.

**Performance:**
- Uses `swc` (Speedy Web Compiler) in Rust for parsing, which is significantly faster than standard TypeScript parsers.
- Executes AST traversal in native code.
- Parallelizable (future-proof).

**Capabilities:**
- Extract function declarations and signatures
- Extract class declarations with public methods and properties
- Extract interface declarations
- Extract type alias declarations
- Extract enum declarations
- Handles `export` declarations correctly

**API:**

```typescript
import { ASTAnalyzer } from 'doctype';

const analyzer = new ASTAnalyzer();

// Analyze single file (Async I/O, Native Parsing)
const signatures = await analyzer.analyzeFile('src/auth/login.ts');

// Analyze raw code string
const signatures = analyzer.analyzeCode('export function test() {}');
```
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440001" -->

**Output Example:**

```typescript
{
  symbolName: 'login',
  symbolType: 'function',
  signatureText: 'function login(email: string, password: string): Promise<string>',
  isExported: true
}
```

### SignatureHasher (`signature-hasher.ts`)

<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440002" code_ref="src/core/signature-hasher.ts#SignatureHasher" -->
Generates SHA256 cryptographic hashes of code signatures for deterministic drift detection.

**Capabilities:**
- Hash function signatures (name, parameters, return type)
- Hash class signatures (name, properties, methods)
- Hash interface signatures
- Normalize signatures before hashing (consistent formatting)
- Support for selective hashing (e.g., ignore JSDoc changes)

**API:**

```typescript
import { SignatureHasher } from 'doctype';

const hasher = new SignatureHasher();

// Hash a signature
const result = hasher.hash(signature);

console.log(result.hash);           // 'abc123...'
console.log(result.algorithm);      // 'sha256'
console.log(result.normalizedText); // 'function login(email:string,password:string):Promise<string>'
```
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440002" -->

**Hash Generation Process:**

1. **Normalize** signature (remove whitespace, consistent formatting)
2. **Include** critical elements:
   - Symbol name
   - Parameter names and types
   - Return type
   - Public properties (for classes)
   - Method signatures (for classes)
3. **Exclude** non-critical elements:
   - JSDoc comments (optional)
   - Implementation details
   - Private members
4. **Generate** SHA256 hash of normalized string

**Example:**

```typescript
// These produce the SAME hash (formatting differences ignored)
function login(email: string): Promise<string>
function login(email:string):Promise<string>
function   login  ( email : string )  :  Promise<string>

// These produce DIFFERENT hashes (signature changed)
function login(email: string): Promise<string>
function login(email: string, password: string): Promise<string>
```

### Types (`types.ts`)

Core TypeScript interfaces and types used throughout the module.

**Key Types:**

```typescript
// Represents a code symbol's signature
interface CodeSignature {
  symbolName: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum';
  signature: string;
  parameters?: Parameter[];
  returnType?: string;
  properties?: Property[];
  methods?: Method[];
  jsdoc?: string;
  filePath: string;
  startLine: number;
  endLine: number;
}

// Hash result
interface HashResult {
  hash: string;
  algorithm: 'sha256';
  normalizedText: string;
}
```

## How Drift Detection Works

Drift detection is a **two-step process**:

### Step 1: Initial Signature Capture

```typescript
// When documentation is first created
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

// Extract signature
const signature = analyzer.findSymbol('src/auth/login.ts', 'login');

// Generate hash
const { hash } = hasher.hash(signature);

// Save to doctype-map.json
mapManager.addEntry({
  id: 'uuid',
  codeRef: { filePath: 'src/auth/login.ts', symbolName: 'login' },
  codeSignatureHash: hash, // Save this hash
  // ... other fields
});
```

### Step 2: Drift Detection

```typescript
// Later, when checking for drift
const currentSignature = analyzer.findSymbol('src/auth/login.ts', 'login');
const currentHash = hasher.hash(currentSignature).hash;

// Compare hashes
const savedHash = mapManager.getEntry('uuid').codeSignatureHash;

if (currentHash !== savedHash) {
  console.log('⚠ Drift detected! Code signature changed.');
}
```

**Why this works:**
- SHA256 is a cryptographic hash (collision-resistant)
- Normalization ensures formatting changes don't cause false positives
- Deterministic: same code = same hash, every time

## Integration with Other Modules

### With Content Module

```typescript
import { ASTAnalyzer, SignatureHasher } from 'doctype/core';
import { DoctypeMapManager } from 'doctype/content';

const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();
const mapManager = new DoctypeMapManager();

// Analyze code
const signature = analyzer.findSymbol('src/utils.ts', 'helper');

// Generate hash
const { hash } = hasher.hash(signature);

// Check for drift
const hasDrift = mapManager.hasDrift('entry-uuid', hash);
```

### With CLI Module

```typescript
import { ASTAnalyzer, SignatureHasher } from 'doctype/core';

// CLI check command uses core module
export async function checkCommand(options: CheckOptions) {
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();

  for (const entry of entries) {
    const signature = analyzer.findSymbol(entry.codeRef.filePath, entry.codeRef.symbolName);
    const currentHash = hasher.hash(signature).hash;

    if (currentHash !== entry.codeSignatureHash) {
      // Drift detected
    }
  }
}
```

## Performance Considerations

### Caching

The `ASTAnalyzer` caches parsed files to avoid re-parsing:

```typescript
const analyzer = new ASTAnalyzer();

// First call: parses file
analyzer.analyzeFile('src/auth/login.ts');

// Second call: uses cache
analyzer.analyzeFile('src/auth/login.ts'); // Much faster
```

### Incremental Analysis

For large projects, analyze only changed files:

```typescript
// Get list of changed files from git
const changedFiles = getGitChangedFiles();

// Analyze only those files
for (const file of changedFiles) {
  const signatures = analyzer.analyzeFile(file);
  // Process signatures...
}
```

### Batch Operations

Process multiple symbols in one file efficiently:

```typescript
// Instead of:
const sig1 = analyzer.findSymbol('src/utils.ts', 'helper1');
const sig2 = analyzer.findSymbol('src/utils.ts', 'helper2');
const sig3 = analyzer.findSymbol('src/utils.ts', 'helper3');

// Do:
const allSigs = analyzer.analyzeFile('src/utils.ts');
const sig1 = allSigs.find(s => s.symbolName === 'helper1');
const sig2 = allSigs.find(s => s.symbolName === 'helper2');
const sig3 = allSigs.find(s => s.symbolName === 'helper3');
```

## Testing

The core module has comprehensive test coverage:

```bash
npm test src/core
```

**Test Coverage:**
- Function signature extraction (44 tests)
- Class signature extraction
- Interface/Type/Enum extraction
- Hash generation and consistency
- Normalization edge cases
- Error handling (missing files, invalid syntax)

## Error Handling

The module handles common errors gracefully:

```typescript
try {
  const signature = analyzer.findSymbol('src/missing.ts', 'symbol');
} catch (error) {
  // File not found
}

try {
  const signature = analyzer.findSymbol('src/file.ts', 'nonexistent');
} catch (error) {
  // Symbol not found in file
}

try {
  const signatures = analyzer.analyzeFile('src/invalid-syntax.ts');
} catch (error) {
  // TypeScript parsing error
}
```

## Advanced Usage

### Custom Normalization

```typescript
const hasher = new SignatureHasher({
  includeJSDoc: true,        // Include JSDoc in hash
  includePrivateMembers: true // Include private class members
});
```

### Signature Comparison

```typescript
import { compareSignatures } from 'doctype/core';

const diff = compareSignatures(oldSignature, newSignature);

console.log(diff.changed);        // true/false
console.log(diff.addedParams);    // ['password']
console.log(diff.removedParams);  // []
console.log(diff.returnTypeChanged); // false
```

## Dependencies

- **@doctypedev/core**: Native Rust module for AST analysis
- **typescript**: TypeScript compiler API (for type checking)
- **crypto** (built-in): SHA256 hashing

No heavy JavaScript AST parsers are used at runtime.

## Further Reading

- [NAPI-RS Documentation](https://napi.rs/)
- [SWC (Speedy Web Compiler)](https://swc.rs/)
- [SHA256 Hashing](https://en.wikipedia.org/wiki/SHA-2)
