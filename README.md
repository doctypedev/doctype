# Doctype

> The Self-Maintaining Documentation System

Doctype is the ultimate guardrail for conceptual documentation. By leveraging Abstract Syntax Tree (AST) analysis and Generative AI (GenAI), it guarantees the veracity of your Markdown guides in real-time. If the code changes, the documentation updates automatically.

## 🚀 Project Status: Phase 3 Complete

**✅ Core AST & Drift Detection Module (Phase 1)**
- TypeScript code analysis using ts-morph
- Deterministic signature hashing (SHA256)
- Comprehensive test coverage

**✅ Content & Mapping Module (Phase 2)**
- Markdown parsing and anchor extraction
- doctype-map.json management
- Content injection into documentation

**✅ CLI / Executor Module (Phase 3)**
- `npx doctype check` - Drift detection for CI/CD
- `npx doctype fix` - Documentation updates
- Professional colored terminal output
- 114/114 tests passing

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

### Phase 3: CLI / Executor

**Check Command** (`npx doctype check`)
- Verifies documentation is in sync with code
- Detects signature drift automatically
- Exits with error code for CI/CD integration
- Colored console output with detailed reporting

**Fix Command** (`npx doctype fix`)
- Updates documentation when drift detected
- Dry-run mode for preview
- Generates placeholder content (Phase 3)
- AI-generated content coming in Phase 4

**Logger**
- Professional colored terminal output
- Multiple log levels (error, warn, info, success, debug)
- Verbose mode for debugging

## Installation

```bash
npm install
npm run build
```

## Usage

### CLI Commands (Phase 3)

#### Check for Documentation Drift

```bash
# Basic check
npx doctype check

# With verbose output
npx doctype check --verbose

# Custom map location
npx doctype check --map ./docs/doctype-map.json

# Disable strict mode (won't fail on drift, for reporting only)
npx doctype check --no-strict
```

**Sample Output:**
```
🔍 Doctype Check - Drift Detection

ℹ Checking 15 documentation entries...

────────────────────────────────────────────────────────────
✗ Documentation drift detected in 2 entries

  login in src/auth/login.ts
    Doc: docs/auth.md:10
    Old hash: 5ee0cf09
    New hash: 907eb46e

  processData in src/utils/process.ts
    Doc: docs/utils.md:25
    Old hash: a3f5c8e9
    New hash: b2c4d6e8

ℹ Run `npx doctype fix` to update the documentation
────────────────────────────────────────────────────────────
```

#### Fix Documentation

```bash
# Fix all drifted entries
npx doctype fix

# Preview changes without writing files
npx doctype fix --dry-run

# With verbose output
npx doctype fix --verbose
```

**Sample Output:**
```
🔧 Doctype Fix - Update Documentation

ℹ Analyzing 15 documentation entries...
ℹ Found 2 entries with drift

────────────────────────────────────────────────────────────

ℹ login - src/auth/login.ts
ℹ   Documentation: docs/auth.md:10
✓ Updated documentation (5 lines changed)

ℹ processData - src/utils/process.ts
ℹ   Documentation: docs/utils.md:25
✓ Updated documentation (8 lines changed)

────────────────────────────────────────────────────────────
✓ Successfully updated 2 entries
────────────────────────────────────────────────────────────
```

### Programmatic API

#### Analyzing TypeScript Code

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

**Total: 114 tests passing**

- Phase 1 (Core/AST): 44 tests
- Phase 2 (Content/Mapping): 58 tests
- Phase 3 (CLI): 12 tests

| Module | Tests | Status |
|--------|-------|--------|
| AST Analyzer | 19 | ✅ |
| Signature Hasher | 25 | ✅ |
| Markdown Parser | 18 | ✅ |
| Map Manager | 22 | ✅ |
| Content Injector | 18 | ✅ |
| CLI Check | 6 | ✅ |
| CLI Fix | 6 | ✅ |

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

- [x] **Phase 3**: CLI / Executor
  - [x] `npx doctype check` - Verify documentation sync
  - [x] `npx doctype fix` - Update documentation
  - [x] Professional colored terminal output
  - [x] CI/CD integration support
  - [x] Comprehensive tests (12 tests passing)

- [ ] **Phase 4**: Gen AI Integration
  - [ ] OpenAI/Gemini integration
  - [ ] AI-generated documentation content
  - [ ] Prompt engineering for smart updates
  - [ ] `--auto-commit` workflow
  - [ ] Automatic PR creation

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

### Phase 3: CLI / Executor Module ✅

Command-line interface for drift detection and documentation fixing:

- **Check Command**: Verifies documentation is in sync with code
- **Fix Command**: Updates documentation when drift detected
- **Logger**: Professional colored terminal output
- **Drift Detector**: Centralized drift detection logic (DRY principle)

**Data Flow:**
```
CLI Input → Check/Fix Command → Load Map → Detect Drift →
Update Docs (if needed) → Update Map → CLI Output
```

**CI/CD Integration:**
```yaml
# .github/workflows/ci.yml
- run: npx doctype check --verbose
```

📖 **[Detailed CLI Documentation](./src/cli/README.md)** | **[Phase 3 Complete Docs](./docs/PHASE3.md)**

### Future Phases

- **Phase 4**: Gen AI Integration (OpenAI/Gemini, AI-generated content, auto-commit)

For complete project architecture and roadmap, see [CLAUDE.md](./CLAUDE.md).

## License

MIT
