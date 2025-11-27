# SignatureHasher

Generates deterministic SHA256 hashes from code signatures for drift detection.

## Overview

<!-- doctype:start id="b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e" code_ref="src/core/signature-hasher.ts#SignatureHasher" -->
# SignatureHasher Class

The `SignatureHasher` class is designed to hash code signatures and compare them. It provides four methods: `hash`, `hashMany`, `compare`, and `hashText`.

## Methods

### hash

The `hash` method takes a `CodeSignature` as a parameter and returns a `SignatureHash`.

```typescript
hash(signature: CodeSignature): SignatureHash
```

**Parameters:**

- `signature` (`CodeSignature`): The code signature to be hashed.

**Returns:**

- `SignatureHash`: The hashed version of the provided code signature.

### hashMany

The `hashMany` method takes an array of `CodeSignature` and returns an array of `SignatureHash`.

```typescript
hashMany(signatures: CodeSignature[]): SignatureHash[]
```

**Parameters:**

- `signatures` (`CodeSignature[]`): An array of code signatures to be hashed.

**Returns:**

- `SignatureHash[]`: An array of hashed versions of the provided code signatures.

### compare

The `compare` method takes two strings as parameters and returns a boolean indicating whether the two strings are identical.

```typescript
compare(hash1: string, hash2: string): boolean
```

**Parameters:**

- `hash1` (`string`): The first string to be compared.
- `hash2` (`string`): The second string to be compared.

**Returns:**

- `boolean`: `true` if the two strings are identical, `false` otherwise.

### hashText

The `hashText` method takes a string as a parameter and returns a hashed version of the string.

```typescript
hashText(signatureText: string): string
```

**Parameters:**

- `signatureText` (`string`): The text to be hashed.

**Returns:**

- `string`: The hashed version of the provided text.

## Usage Example

```typescript
let hasher = new SignatureHasher();
let signature = new CodeSignature('functionName', ['param1', 'param2']);
let hash = hasher.hash(signature);
let hashText = hasher.hashText('functionName(param1, param2)');
let comparison = hasher.compare(hash, hashText);
console.log(comparison); // Outputs: true
```

In this example, we create a new instance of `SignatureHasher`, hash a `CodeSignature` object, hash a string of text, and then compare the two hashes. The `compare` method returns `true` because the hashes are identical.
<!-- doctype:end id="b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e" -->

## Installation

```typescript
import { SignatureHasher } from 'doctype';
```

## Methods

### `hash(signature: CodeSignature): string`

<!-- doctype:start id="c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f" code_ref="src/core/signature-hasher.ts#SignatureHasher.hash" -->
Generates a SHA256 hash from a code signature.

**Parameters:**
- `signature`: CodeSignature object from ASTAnalyzer

**Returns:**
- Hexadecimal SHA256 hash string (64 characters)

**Example:**
```typescript
import { ASTAnalyzer, SignatureHasher } from 'doctype';

const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

const signature = analyzer.findSymbol('src/utils.ts', 'calculateTotal');
if (signature) {
  const hash = hasher.hash(signature);
  console.log(`Hash: ${hash}`);
}
```
<!-- doctype:end id="c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f" -->

### `hashSignatureText(signatureText: string): string`

<!-- doctype:start id="d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a" code_ref="src/core/signature-hasher.ts#SignatureHasher.hashSignatureText" -->
Generates a SHA256 hash from raw signature text.

**Parameters:**
- `signatureText`: Raw signature string

**Returns:**
- Hexadecimal SHA256 hash string

**Example:**
```typescript
const hasher = new SignatureHasher();
const hash = hasher.hashSignatureText('function add(a: number, b: number): number');
console.log(hash);
```
<!-- doctype:end id="d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a" -->

### `compareHashes(hash1: string, hash2: string): boolean`

<!-- doctype:start id="e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b" code_ref="src/core/signature-hasher.ts#SignatureHasher.compareHashes" -->
Compares two hashes for equality.

**Parameters:**
- `hash1`: First hash to compare
- `hash2`: Second hash to compare

**Returns:**
- `true` if hashes match, `false` otherwise

**Example:**
```typescript
const hasher = new SignatureHasher();
const oldHash = 'abc123...';
const newHash = hasher.hash(currentSignature);

if (!hasher.compareHashes(oldHash, newHash)) {
  console.log('Drift detected!');
}
```
<!-- doctype:end id="e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b" -->

## How Hashing Works

The hasher performs the following normalization steps:

1. **Extract signature text** from CodeSignature
2. **Normalize whitespace** - collapse multiple spaces, remove leading/trailing
3. **Remove comments** - strip single-line and multi-line comments
4. **Compute SHA256** - generate hash from normalized text
5. **Return hex string** - 64-character hexadecimal hash

## Hash Properties

- **Deterministic**: Same signature always produces same hash
- **Collision-resistant**: Different signatures produce different hashes
- **Fixed-length**: Always 64 hexadecimal characters (256 bits)
- **One-way**: Cannot reverse hash to get original signature

## Examples

### Basic Hashing

```typescript
import { ASTAnalyzer, SignatureHasher } from 'doctype';

const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

const signatures = analyzer.analyzeFile('src/api.ts');
signatures.forEach(sig => {
  const hash = hasher.hash(sig);
  console.log(`${sig.symbolName}: ${hash}`);
});
```

### Drift Detection

```typescript
const hasher = new SignatureHasher();
const savedHash = 'abc123...'; // from doctype-map.json

// Analyze current code
const analyzer = new ASTAnalyzer();
const currentSig = analyzer.findSymbol('src/auth.ts', 'login');
const currentHash = hasher.hash(currentSig!);

// Compare
if (!hasher.compareHashes(savedHash, currentHash)) {
  console.error('Documentation drift detected!');
  console.log(`Expected: ${savedHash}`);
  console.log(`Got:      ${currentHash}`);
}
```

### Hash from Text

```typescript
const hasher = new SignatureHasher();

const sig1 = 'function test(x: number): void';
const sig2 = 'function test(x: string): void';

const hash1 = hasher.hashSignatureText(sig1);
const hash2 = hasher.hashSignatureText(sig2);

console.log(hash1 === hash2); // false - different signatures
```

## See Also

- [ASTAnalyzer](./ast-analyzer.md) - Generate code signatures
- [Core Concepts](../guide/core-concepts.md) - Understanding drift detection
