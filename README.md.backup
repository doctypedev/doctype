# Doctype

> The Self-Maintaining Documentation System

Doctype is the ultimate guardrail for conceptual documentation. By leveraging Abstract Syntax Tree (AST) analysis and Generative AI (GenAI), it guarantees the veracity of your Markdown guides in real-time. If the code changes, the documentation updates automatically.

## 🚀 Project Status: Phase 1 Complete

**✅ Core AST & Drift Detection Module**
- TypeScript code analysis using ts-morph
- Deterministic signature hashing (SHA256)
- Comprehensive test coverage (98.37%)
- 44/44 tests passing

## Features (Current Phase)

### AST Analyzer
- Extracts signatures from TypeScript code
- Supports: functions, classes, interfaces, types, enums, variables
- Normalizes signatures for consistent comparison
- Filters exported vs. private symbols

### Signature Hasher
- Generates SHA256 hashes from code signatures
- Deterministic: same signature always produces same hash
- Batch processing support
- Hash comparison utilities

## Installation

```bash
npm install
npm run build
```

## Usage

### Analyzing TypeScript Code

```typescript
import { ASTAnalyzer } from './core/ast-analyzer';

const analyzer = new ASTAnalyzer();

const code = `
  export function greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
`;

const signatures = analyzer.analyzeCode(code);
console.log(signatures);
// [{ symbolName: 'greet', symbolType: 'function', ... }]
```

### Detecting Code Changes

```typescript
import { ASTAnalyzer } from './core/ast-analyzer';
import { SignatureHasher } from './core/signature-hasher';

const analyzer = new ASTAnalyzer();
const hasher = new SignatureHasher();

// Analyze code
const signatures = analyzer.analyzeCode(code);
const hashes = hasher.hashMany(signatures);

// Later, compare with new version
const newSignatures = analyzer.analyzeCode(updatedCode);
const newHashes = hasher.hashMany(newSignatures);

// Detect drift
if (!hasher.compare(hashes[0].hash, newHashes[0].hash)) {
  console.log('⚠️  Documentation drift detected!');
}
```

## Development

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:ui         # Visual UI
```

### Test Coverage

Current coverage: **98.37%**

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| ast-analyzer.ts | 96.98% | 89.18% | 100% | 96.98% |
| signature-hasher.ts | 100% | 100% | 100% | 100% |
| types.ts | 100% | 100% | 100% | 100% |

### Building

```bash
npm run build    # Compile TypeScript
npm run dev      # Watch mode
npm run clean    # Clean dist/
```

## Roadmap

- [x] **Phase 1**: Core AST & Drift Detection
  - [x] AST Analyzer with ts-morph
  - [x] Signature Hasher (SHA256)
  - [x] Comprehensive tests (>80% coverage)

- [ ] **Phase 2**: Data Model & Mapping
  - [ ] `doctype-map.json` management
  - [ ] Markdown anchor parsing
  - [ ] File system operations

- [ ] **Phase 3**: CLI Commands
  - [ ] `npx doctype check` - Verify documentation sync
  - [ ] `npx doctype fix` - Interactive fixes

- [ ] **Phase 4**: Gen AI Integration
  - [ ] OpenAI/Gemini integration
  - [ ] Prompt engineering for documentation updates
  - [ ] `--auto-commit` workflow

## Architecture

Doctype uses a layered architecture with independent modules:

### Phase 1: Core/AST Module ✅

Deterministic foundation for drift detection:

- **AST Analyzer**: Extracts TypeScript signatures using ts-morph
- **Signature Hasher**: Generates SHA256 hashes for drift detection
- **Type System**: Core data structures (`CodeSignature`, `SignatureHash`, etc.)

**Data Flow:**
```
TypeScript Code → AST Analyzer → Signature Hasher → doctype-map.json
```

📖 **[Detailed Core/AST Documentation](./src/core/README.md)**

### Future Phases

- **Phase 2**: Data Model & Mapping (doctype-map.json, Markdown anchors)
- **Phase 3**: CLI Commands (`check`, `fix`)
- **Phase 4**: Gen AI Integration (OpenAI/Gemini, auto-commit)

For complete project architecture and roadmap, see [CLAUDE.md](./CLAUDE.md).

## License

MIT
