# Doctype API Documentation

This file demonstrates Doctype in action, documenting its own API functions with doctype anchors.

## Core Module - AST Analysis

### ASTAnalyzer.analyzeFile

<!-- doctype:start id="ast-analyze-file" code_ref="src/core/ast-analyzer.ts#analyzeFile" -->
Analyzes a TypeScript file and extracts all exported symbol signatures.

**Parameters:**
- `filePath` (string): Absolute or relative path to the TypeScript file to analyze

**Returns:**
- `CodeSignature[]`: Array of code signatures for all exported symbols in the file

**Example:**
```typescript
const analyzer = new ASTAnalyzer();
const signatures = analyzer.analyzeFile('./src/utils/helpers.ts');

console.log(signatures);
// [{
//   symbolName: 'formatDate',
//   symbolType: 'function',
//   signatureText: 'export function formatDate(date: Date): string',
//   ...
// }]
```

**Supported Symbol Types:**
- Functions
- Classes (with methods and properties)
- Interfaces
- Type aliases
- Enums
- Exported variables

**Notes:**
- Only exported symbols are included (non-exported are filtered out)
- Class signatures include all public methods and properties
- Generic types are preserved in signatures
<!-- doctype:end id="ast-analyze-file" -->

### ASTAnalyzer.analyzeCode

<!-- doctype:start id="ast-analyze-code" code_ref="src/core/ast-analyzer.ts#analyzeCode" -->
Analyzes TypeScript code from a string and extracts exported symbol signatures.

**Parameters:**
- `code` (string): TypeScript source code as a string

**Returns:**
- `CodeSignature[]`: Array of code signatures for all exported symbols

**Example:**
```typescript
const analyzer = new ASTAnalyzer();
const code = `
  export function greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
`;

const signatures = analyzer.analyzeCode(code);
// Returns signatures for the 'greet' function
```

**Use Cases:**
- Unit testing signature extraction
- Analyzing dynamically generated code
- Quick prototyping without file I/O
<!-- doctype:end id="ast-analyze-code" -->

## Core Module - Signature Hashing

### SignatureHasher.hash

<!-- doctype:start id="signature-hasher-hash" code_ref="src/core/signature-hasher.ts#hash" -->
Generates a deterministic SHA256 hash from a code signature.

**Parameters:**
- `signature` (CodeSignature): The code signature object to hash

**Returns:**
- `SignatureHash`: Object containing the hash string and original signature

**Example:**
```typescript
const hasher = new SignatureHasher();
const signature: CodeSignature = {
  symbolName: 'calculateTotal',
  symbolType: 'function',
  signatureText: 'export function calculateTotal(items: Item[]): number',
  // ... other fields
};

const result = hasher.hash(signature);
console.log(result.hash); // '5ee0cf09...' (8-char SHA256)
```

**Properties:**
- Hash is deterministic: same signature always produces same hash
- Uses SHA256 algorithm
- Returns first 8 characters of hash for readability
- Preserves original signature in result for reference

**Use Cases:**
- Drift detection (comparing old vs new signatures)
- Version tracking in doctype-map.json
- Change detection in CI/CD pipelines
<!-- doctype:end id="signature-hasher-hash" -->

### SignatureHasher.compare

<!-- doctype:start id="signature-hasher-compare" code_ref="src/core/signature-hasher.ts#compare" -->
Compares two signature hashes for equality.

**Parameters:**
- `hash1` (string): First hash to compare
- `hash2` (string): Second hash to compare

**Returns:**
- `boolean`: True if hashes are identical, false otherwise

**Example:**
```typescript
const hasher = new SignatureHasher();

const oldHash = '5ee0cf09';
const newHash = '907eb46e';

if (!hasher.compare(oldHash, newHash)) {
  console.log('⚠️  Signature has changed - documentation drift detected!');
}
```

**Notes:**
- Case-sensitive comparison
- Used internally by drift detection logic
<!-- doctype:end id="signature-hasher-compare" -->

## Content Module - Map Management

### DoctypeMapManager.addEntry

<!-- doctype:start id="map-manager-add-entry" code_ref="src/content/map-manager.ts#addEntry" -->
Adds a new entry to the doctype map.

**Parameters:**
- `entry` (DoctypeMapEntry): Complete map entry with all required fields

**Returns:**
- `void`

**Throws:**
- Error if entry with same ID already exists

**Example:**
```typescript
const manager = new DoctypeMapManager('./doctype-map.json');

manager.addEntry({
  id: 'auth-login-func',
  codeRef: {
    filePath: 'src/auth/login.ts',
    symbolName: 'login'
  },
  codeSignatureHash: '5ee0cf09',
  docRef: {
    filePath: 'docs/auth.md',
    startLine: 10,
    endLine: 25
  },
  originalMarkdownContent: 'Authenticates a user...',
  lastUpdated: Date.now()
});

manager.save(); // Persist to disk
```

**Notes:**
- Entry IDs must be unique
- Use descriptive IDs (e.g., 'module-symbol-type')
- Call `save()` to persist changes to disk
<!-- doctype:end id="map-manager-add-entry" -->

### DoctypeMapManager.hasDrift

<!-- doctype:start id="map-manager-has-drift" code_ref="src/content/map-manager.ts#hasDrift" -->
Checks if a specific entry has drift by comparing current hash with saved hash.

**Parameters:**
- `id` (string): The entry ID to check
- `currentHash` (string): The current signature hash to compare against

**Returns:**
- `boolean`: True if drift detected (hashes don't match), false otherwise

**Example:**
```typescript
const manager = new DoctypeMapManager('./doctype-map.json');
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

// Analyze current code
const signatures = analyzer.analyzeFile('src/auth/login.ts');
const loginSig = signatures.find(s => s.symbolName === 'login');
const currentHash = hasher.hash(loginSig).hash;

// Check for drift
if (manager.hasDrift('auth-login-func', currentHash)) {
  console.log('Documentation is out of sync!');
}
```

**Use Cases:**
- CI/CD drift detection
- Pre-commit hooks
- Documentation validation
<!-- doctype:end id="map-manager-has-drift" -->

## CLI Module - Drift Detection

### detectDrift (utility)

<!-- doctype:start id="cli-detect-drift" code_ref="src/cli/drift-detector.ts#detectDrift" -->
Centralized drift detection logic used by both check and fix commands.

**Parameters:**
- `mapManager` (DoctypeMapManager): Manager instance with loaded map
- `analyzer` (ASTAnalyzer): AST analyzer instance
- `hasher` (SignatureHasher): Signature hasher instance
- `options` (DriftDetectionOptions): Optional configuration

**Options:**
- `basePath` (string): Base path for resolving relative file paths (default: `process.cwd()`)
- `logger` (Logger): Optional logger for debug output

**Returns:**
- `DriftInfo[]`: Array of drift information for entries that have drifted

**Example:**
```typescript
import { detectDrift } from './cli/drift-detector';
import { DoctypeMapManager } from './content/map-manager';
import { ASTAnalyzer } from './core/ast-analyzer';
import { SignatureHasher } from './core/signature-hasher';

const mapManager = new DoctypeMapManager('./doctype-map.json');
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

const drifts = detectDrift(mapManager, analyzer, hasher);

drifts.forEach(drift => {
  console.log(`${drift.entry.codeRef.symbolName} has drifted`);
  console.log(`  Old hash: ${drift.oldHash}`);
  console.log(`  New hash: ${drift.currentHash}`);
});
```

**Benefits:**
- DRY principle: shared logic between check and fix
- Consistent behavior across commands
- Easier testing and maintenance
<!-- doctype:end id="cli-detect-drift" -->

## Usage Patterns

### Complete Workflow Example

```typescript
import { ASTAnalyzer } from './core/ast-analyzer';
import { SignatureHasher } from './core/signature-hasher';
import { DoctypeMapManager } from './content/map-manager';
import { ContentInjector } from './content/content-injector';

// 1. Setup
const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();
const mapManager = new DoctypeMapManager('./doctype-map.json');
const injector = new ContentInjector();

// 2. Detect drift
const entry = mapManager.getEntryById('my-function-id');
const signatures = analyzer.analyzeFile(entry.codeRef.filePath);
const currentSig = signatures.find(s => s.symbolName === entry.codeRef.symbolName);
const currentHash = hasher.hash(currentSig).hash;

if (mapManager.hasDrift(entry.id, currentHash)) {
  // 3. Generate new content (Phase 4: use AI here)
  const newContent = `Updated docs for ${currentSig.signatureText}`;

  // 4. Inject into documentation
  const result = injector.injectIntoFile(
    entry.docRef.filePath,
    entry.id,
    newContent,
    true // writeToFile
  );

  // 5. Update map
  if (result.success) {
    mapManager.updateEntry(entry.id, {
      codeSignatureHash: currentHash,
      originalMarkdownContent: newContent
    });
    mapManager.save();
  }
}
```
