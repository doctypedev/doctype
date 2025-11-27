# Getting Started

Welcome to **Doctype** - the self-maintaining documentation system that ensures your docs never drift from your code.

## What is Doctype?

Doctype is a deterministic system for documentation verification that automatically detects when code signatures change and can generate correction Pull Requests. It solves the critical problem of **Documentation Drift** - the inevitable misalignment between code and narrative documentation.

## Quick Start

### Installation

Install Doctype globally or as a dev dependency in your project:

```bash
npm install -g doctype
# or
npm install --save-dev doctype
```

### Basic Usage

1. **Add Doctype anchors** to your Markdown documentation:

```markdown
<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440000" code_ref="src/example.ts#myFunction" -->
This function does something important.
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440000" -->
```

2. **Check for drift**:

```bash
npx doctype check
```

3. **Fix detected drift** (Phase 4 - GenAI integration coming soon):

```bash
npx doctype fix --dry-run
```

## How It Works

Doctype uses a three-layer architecture:

1. **AST Analysis** - Deterministic analysis of TypeScript code signatures
2. **Drift Detection** - SHA256 hash comparison between current and saved signatures
3. **Content Management** - Markdown parsing and content injection within anchor boundaries

## Next Steps

- Learn about [Core Concepts](./core-concepts.md)
- Explore the [CLI Reference](../cli/check.md)
- Check out [API Documentation](../api/ast-analyzer.md)
