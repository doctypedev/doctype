# Doctype

> The Self-Maintaining Documentation System

Doctype is the ultimate guardrail for conceptual documentation. By leveraging Abstract Syntax Tree (AST) analysis and Generative AI (GenAI), it guarantees the veracity of your Markdown guides in real-time. If the code changes, the documentation updates automatically.

## 🚀 Project Status: Phase 2 Complete

**✅ Core AST & Drift Detection Module (Phase 1)**
- TypeScript code analysis using ts-morph
- Deterministic signature hashing (SHA256)
- Comprehensive test coverage

**✅ Content & Mapping Module (Phase 2)**
- Markdown parsing and anchor extraction
- doctype-map.json management
- Content injection into documentation
- 102/102 tests passing

## Features

### Phase 1: AST & Drift Detection

**AST Analyzer**
- Extracts signatures from TypeScript code
- Supports: functions, classes, interfaces, types, enums, variables
- Normalizes signatures for consistent comparison
- Filters exported vs. private symbols

**Signature Hasher**
- Generates SHA256 hashes from code signatures
- Deterministic: same signature always produces same hash
- Batch processing support
- Hash comparison utilities

### Phase 2: Content & Mapping

**Markdown Parser**
- Extracts doctype anchors from Markdown files
- Validates anchor format and structure
- Preserves whitespace and formatting
- Parses code references (`file_path#symbol_name`)

**Doctype Map Manager**
- Manages `doctype-map.json` (single source of truth)
- CRUD operations for map entries
- Drift detection capabilities
- Query by ID, code reference, or documentation file

**Content Injector**
- Safely injects AI-generated content into Markdown
- Preview mode (no file writes)
- Batch injection support
- Anchor validation and location detection

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

**Total: 102 tests passing**

- Phase 1 (Core/AST): 44 tests
- Phase 2 (Content/Mapping): 58 tests

| Module | Tests | Status |
|--------|-------|--------|
| AST Analyzer | 19 | ✅ |
| Signature Hasher | 25 | ✅ |
| Markdown Parser | 18 | ✅ |
| Map Manager | 22 | ✅ |
| Content Injector | 18 | ✅ |

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
  - [x] Comprehensive tests (44 tests passing)

- [x] **Phase 2**: Content & Mapping
  - [x] `doctype-map.json` management
  - [x] Markdown anchor parsing
  - [x] Content injection into documentation
  - [x] Comprehensive tests (58 tests passing)

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
TypeScript Code → AST Analyzer → Signature Hasher → SHA256 Hash
```

📖 **[Detailed Core/AST Documentation](./src/core/README.md)**

### Phase 2: Content & Mapping Module ✅

Markdown parsing, mapping management, and content injection:

- **Markdown Parser**: Extracts and validates doctype anchors from Markdown files
- **Map Manager**: Manages `doctype-map.json` (CRUD, drift detection, querying)
- **Content Injector**: Safely injects AI-generated content into documentation

**Data Flow:**
```
Markdown Docs → Parser → Anchors → Map Manager ← Signature Hashes
                                         ↓
                                   Drift Detection
                                         ↓
                                   Content Injector → Updated Docs
```

📖 **[Detailed Content/Mapping Documentation](./src/content/README.md)**

### Future Phases

- **Phase 3**: CLI Commands (`npx doctype check`, `npx doctype fix`)
- **Phase 4**: Gen AI Integration (OpenAI/Gemini, auto-commit)

For complete project architecture and roadmap, see [CLAUDE.md](./CLAUDE.md).

## License

MIT
