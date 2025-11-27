# ASTAnalyzer

Analyzes TypeScript source files to extract code signatures using the TypeScript Compiler API.

## Overview

<!-- doctype:start id="c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f" code_ref="src/core/ast-analyzer.ts#ASTAnalyzer" -->
The ASTAnalyzer class is the core component for deterministic code analysis. It uses ts-morph (a wrapper around the TypeScript Compiler API) to parse TypeScript files and extract public API signatures from exported symbols.

Supported symbol types:
- Functions and arrow functions
- Classes (with properties and methods)
- Interfaces
- Type aliases
- Enums
- Exported variables and constants
<!-- doctype:end id="c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f" -->

## Installation

```typescript
import { ASTAnalyzer } from 'doctype';
```

## Constructor

### `new ASTAnalyzer(tsConfigFilePath?: string)`

<!-- doctype:start id="d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a" code_ref="src/core/ast-analyzer.ts#ASTAnalyzer.constructor" -->
Creates a new ASTAnalyzer instance with an optional TypeScript configuration.

**Parameters:**
- `tsConfigFilePath` (optional): Path to tsconfig.json for project-aware analysis

**Example:**
```typescript
// Without tsconfig
const analyzer = new ASTAnalyzer();

// With tsconfig
const analyzer = new ASTAnalyzer('./tsconfig.json');
```
<!-- doctype:end id="d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a" -->

## Methods

### `analyzeFile(filePath: string): CodeSignature[]`

<!-- doctype:start id="e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b" code_ref="src/core/ast-analyzer.ts#ASTAnalyzer.analyzeFile" -->
Analyzes a TypeScript file and extracts all public symbol signatures.

**Parameters:**
- `filePath`: Path to the TypeScript file to analyze

**Returns:**
- Array of `CodeSignature` objects representing all exported symbols

**Example:**
```typescript
const analyzer = new ASTAnalyzer();
const signatures = analyzer.analyzeFile('src/utils.ts');

signatures.forEach(sig => {
  console.log(`${sig.symbolType}: ${sig.symbolName}`);
  console.log(`Signature: ${sig.signatureText}`);
});
```

**Throws:**
- Error if file cannot be read or parsed
<!-- doctype:end id="e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b" -->

### `analyzeCode(code: string, fileName?: string): CodeSignature[]`

<!-- doctype:start id="f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c" code_ref="src/core/ast-analyzer.ts#ASTAnalyzer.analyzeCode" -->
Analyzes TypeScript source code directly without reading from a file.

**Parameters:**
- `code`: TypeScript source code as a string
- `fileName` (optional): Virtual file name for better error messages

**Returns:**
- Array of `CodeSignature` objects

**Example:**
```typescript
const code = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;

const analyzer = new ASTAnalyzer();
const signatures = analyzer.analyzeCode(code);
```
<!-- doctype:end id="f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c" -->

### `findSymbol(filePath: string, symbolName: string): CodeSignature | null`

<!-- doctype:start id="a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d" code_ref="src/core/ast-analyzer.ts#ASTAnalyzer.findSymbol" -->
Finds a specific symbol by name in a TypeScript file.

**Parameters:**
- `filePath`: Path to the TypeScript file
- `symbolName`: Name of the symbol to find

**Returns:**
- `CodeSignature` object if found, `null` otherwise

**Example:**
```typescript
const analyzer = new ASTAnalyzer();
const signature = analyzer.findSymbol('src/auth.ts', 'validateUser');

if (signature) {
  console.log(`Found: ${signature.signatureText}`);
} else {
  console.log('Symbol not found');
}
```
<!-- doctype:end id="a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d" -->

## Types

### CodeSignature

```typescript
interface CodeSignature {
  symbolName: string;        // Name of the symbol
  symbolType: SymbolType;    // Type (function, class, etc.)
  signatureText: string;     // Full signature as text
  filePath: string;          // Source file path
  startLine: number;         // Starting line number
  endLine: number;           // Ending line number
  isExported: boolean;       // Whether symbol is exported
}
```

### SymbolType

```typescript
enum SymbolType {
  Function = 'function',
  Class = 'class',
  Interface = 'interface',
  TypeAlias = 'type',
  Enum = 'enum',
  Variable = 'variable',
}
```

## Examples

### Basic Analysis

```typescript
import { ASTAnalyzer } from 'doctype';

const analyzer = new ASTAnalyzer();
const signatures = analyzer.analyzeFile('src/utils.ts');

console.log(`Found ${signatures.length} symbols`);
```

### Find Specific Symbol

```typescript
const analyzer = new ASTAnalyzer('./tsconfig.json');
const sig = analyzer.findSymbol('src/api/auth.ts', 'loginUser');

if (sig) {
  console.log(sig.signatureText);
}
```

### Analyze Code Snippet

```typescript
const code = `
export interface User {
  id: number;
  name: string;
  email: string;
}
`;

const analyzer = new ASTAnalyzer();
const [signature] = analyzer.analyzeCode(code);
console.log(signature.signatureText);
```

## See Also

- [SignatureHasher](./signature-hasher.md) - Generate hashes from signatures
- [Core Concepts](../guide/core-concepts.md) - Understanding code signatures
