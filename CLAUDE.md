# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Doctype - The Self-Maintaining Documentation System**

Doctype is a deterministic system for documentation verification that automatically creates correction Pull Requests when code undergoes signature changes. It solves the problem of **Documentation Drift** - the misalignment between code and narrative documentation.

### Vision and Goals

- **Problem Solved**: Documentation Drift (misalignment between code and narrative documentation)
- **Primary Goal**: Provide a deterministic system for documentation verification that automatically creates correction Pull Requests when code undergoes signature changes
- **Target Audience**: Complex monorepos, TypeScript libraries, and engineering teams requiring a guarantee of documentation veracity
- **Project Status**: Early development stages

## Planned Architecture

Doctype will be built using a layered architecture with four independent logical modules:

### 1. CLI / Executor

**Role**: Entry point, command parsing (`check`, `fix`)

**Technologies**:
- Node.js
- yargs (command parsing)
- Nx Executor (optional, for monorepo integration)

**Key Commands**:
- `npx doctype check` - Verify documentation is in sync with code
- `npx doctype fix --auto-commit` - Automatically fix drift and commit changes

### 2. AST & Drift Detection

**Role**: Static analysis, calculation of code signature hash from AST (Deterministic Logic)

**Technologies**:
- TypeScript Compiler API (TSS)
- ts-morph

**Responsibilities**:
- Analyze TypeScript code signatures
- Generate SHA256 hash of symbol public signatures
- Compare current hash with saved hash from `doctype-map.json`
- Trigger drift detection when hashes don't match

### 3. Content & Mapping

**Role**: Markdown parsing, anchor extraction, GenAI content injection

**Technologies**:
- remark/unified (Markdown processing)
- HTML comment parsing (for anchor tags)

**Responsibilities**:
- Parse Markdown files and extract documentation anchors
- Manage the `doctype-map.json` tracking file
- Inject AI-generated content into Markdown files within anchor boundaries

### 4. Gen AI Agent

**Role**: Prompt Engineering, LLM interaction, generation of fix text (Probabilistic Logic)

**Technologies**:
- OpenAI/Gemini API
- API Key management (CI Secrets)

**Responsibilities**:
- Generate prompts comparing old vs new code signatures
- Request LLM to update documentation based on code changes
- Return formatted Markdown for injection

## Core Data Model: doctype-map.json

This file tracks every anchor in the repository and is essential for drift detection. It is saved in the repository and managed exclusively by Doctype.

**Schema**:

| Field | Description | Purpose |
|-------|-------------|---------|
| `id` | Unique UUID for the anchor | Tracking and Markdown reference |
| `code_ref` | Source file path (`file_path`) and symbol name (`symbol_name`) | Locating the symbol in the code |
| `code_signature_hash` | SHA256 hash of the symbol's public signature | Deterministic drift trigger - checked against saved hash on every CI run |
| `doc_ref` | Markdown file path, start/end lines of content | Target for AI content injection |
| `original_markdown_content` | The outdated text between anchor tags | Provides context (the "before") to the LLM for correction |

## Operational Flows

### A. Drift Detection: `npx doctype check`

**Input**: Source code changes within the PR

**Process**:
1. AST Module analyzes potentially affected symbols (optimized by dependency graph in Nx environments)
2. Compares NEW signature hash with SAVED hash in `doctype-map.json`

**Output**:
- If hashes don't match: CI pipeline fails with error code
- Logs: "Documentation Drift Detected"

### B. Automatic Correction: `npx doctype fix --auto-commit`

**Input**:
- Old code (from saved hash)
- New code (from current AST)

**Process**:
1. Gen AI Module creates detailed prompt with obsolete content and signature change details
2. LLM generates updated, formatted Markdown text
3. Content Module injects AI response into Markdown file within anchor tags
4. Updates `code_signature_hash` in `doctype-map.json`

**Output**:
- Executes `git commit` and automatic `git push` to PR
- Standard commit message: `🤖 Doctype Bot: Auto-fix documentation for [Symbol Name]`

### C. Initialization: `npx doctype init`

**Input**: User configuration (project paths, API keys)

**Process**:
1. Interactive prompts collect project configuration
2. Save `doctype.config.json` and `.env` (for API keys)
3. Recursively scan project root for TypeScript files
4. Use ASTAnalyzer to extract all exported symbols
5. Generate SHA256 hashes for each symbol signature
6. Create documentation files in docs folder with anchor placeholders (structure based on strategy)
7. Build `doctype-map.json` with all entries

**Output**:
- `doctype.config.json` - Project configuration
- Documentation files (e.g., `src/auth/login.md`, `api.md`, etc.) - Markdown files with TODO anchors
- `doctype-map.json` - Complete tracking map with hashes
- `.env` - API key (optional, gitignored)

**Anchor Format Created**:
```markdown
### SymbolName

<!-- doctype:start id="uuid" code_ref="src/file.ts#SymbolName" -->
<!-- TODO: Add documentation for this symbol -->
<!-- doctype:end id="uuid" -->
```

## Current Implementation Status

### Implemented Core Features

1. **Init Command** (`npx doctype init`)
   - Interactive configuration setup
   - Automatic codebase scanning
   - TypeScript AST analysis using ts-morph
   - SHA256 signature hashing
   - Automatic anchor insertion in documentation files (Mirror, Module, or Type strategy)
   - doctype-map.json generation

2. **Core Modules**
   - **ASTAnalyzer** (src/core/ast-analyzer.ts) - Extracts public symbols from TypeScript files
   - **SignatureHasher** (src/core/signature-hasher.ts) - Generates deterministic SHA256 hashes
   - **DoctypeMapManager** (src/content/map-manager.ts) - Manages doctype-map.json CRUD operations
   - **MarkdownParser** (src/content/markdown-parser.ts) - Parses and validates anchor tags
   - **MarkdownAnchorInserter** (src/content/markdown-anchor-inserter.ts) - Inserts new anchors in markdown
   - **ContentInjector** (src/content/content-injector.ts) - Updates content within existing anchors

### GitHub Automation (Proof-of-Concept)

The repository also contains GitHub automation infrastructure:

### GitHub Workflows

Three automated workflows are configured:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Triggers on push/PR to main branch
   - Runs: `npm ci` → `npm run build`
   - Uses Node.js 20 (LTS)

2. **PR AI Reviewer** (`.github/workflows/pr-evaluation.yml`)
   - Triggered by comment `/openai review` on a PR
   - Uses GPT-4o to perform code reviews
   - Script: `.github/scripts/evaluate-pr.js`
   - Reviews focus on TypeScript best practices, type safety, and architecture

3. **Automatic README Updates** (`.github/workflows/update-readme.yml`)
   - Triggers on push to main (except README changes)
   - Uses GPT-4o to analyze git diff and update README.md
   - Script: `.github/scripts/update_readme.py`
   - Creates a PR with automated README updates

### Automation Scripts

- **`.github/scripts/evaluate-pr.js`**: Node.js script that fetches PR diffs and sends them to OpenAI for code review. Uses GitHub Actions API and native fetch.
- **`.github/scripts/update_readme.py`**: Python script that analyzes recent commits and uses OpenAI to update documentation accordingly.

## Development Commands

### Implemented Commands

```bash
npx doctype init                     # Initialize Doctype, scan codebase, create anchors and map
npx doctype check                    # Verify documentation is in sync with code (for CI)
```

### Planned Commands (Not Yet Implemented)

```bash
npx doctype fix                      # Interactively fix documentation drift
npx doctype fix --auto-commit        # Automatically fix drift and commit changes
npx doctype generate                 # Use AI to generate initial documentation content
```

### Build Commands

```bash
npm ci              # Install dependencies
npm run build       # Build the TypeScript project
npm test            # Run unit tests
```

## Environment Variables

### Current (Automation Scripts)
- `OPENAI_API_KEY`: Required for AI-powered PR reviews and README updates (used in GitHub Actions)

### Planned (Doctype Core)
- `OPENAI_API_KEY` or `GEMINI_API_KEY`: Required for Gen AI Agent module
- API keys will be managed through CI Secrets for automated fix commits

## Key Principles

1. **Deterministic vs Probabilistic Logic**:
   - AST & Drift Detection: Deterministic (hash-based comparison)
   - Gen AI Agent: Probabilistic (LLM-generated content)

2. **Single Source of Truth**: `doctype-map.json` is the authoritative record of all documentation anchors and their associated code signatures

3. **Fail-Safe Design**: The `check` command fails CI when drift is detected, ensuring documentation never falls out of sync

4. **Automation-First**: The `fix --auto-commit` workflow automatically creates commits within PRs, reducing manual intervention
