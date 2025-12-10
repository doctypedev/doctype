<p align="center">
  <img src="assets/doctype_logo.png" alt="Doctype Logo" width="500" />
</p>

# Doctype

[![npm version](https://badge.fury.io/js/@doctypedev%2Fdoctype.svg)](https://www.npmjs.com/package/@doctypedev/doctype)
[![CI Build](https://github.com/alessiopelliccione/doctype/actions/workflows/ci.yml/badge.svg)](https://github.com/alessiopelliccione/doctype/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

> **Stop chasing documentation drift. Let AI keep your docs in perfect sync with your code.**

Doctype automatically detects when your code changes and updates your documentation using AI. No more outdated docs. No more manual rewrites. Just accurate, always-current documentation.

---

## Why Doctype?

**The Problem:** You change a function signature. Your documentation becomes outdated. Your team wastes time debugging with wrong info. Sound familiar?

**The Solution:** Doctype detects code changes automatically and regenerates documentation using a Large Language Model. Your docs stay in sync, your team stays productive.

### What Makes It Different

- ✅ **Truly Automatic** - Detects drift using cryptographic hashing, not guesswork
- ✅ **AI-Powered** - Uses OpenAI GPT-4 to write better docs than most humans
- ✅ **CI/CD Native** - Fails your build if docs are out of sync (no more "I forgot")
- ✅ **Zero Config** - Drop in anchors, run one command, done
- ✅ **Git-Friendly** - Auto-commits with standardized messages, plays nice with your workflow

---

## Quick Start

### 1. Install

```bash
npm install -g @doctypedev/doctype
```

### 2. Run the Interactive Menu

The easiest way to use Doctype is through its interactive menu. Just run:

```bash
doctype
```

You'll be presented with a menu to:
- **Initialize** your project
- **Check** for documentation drift
- **Fix** outdated documentation
- **Generate** new content
- **Create Changesets**
- **Readme** - Generate a README file based on your project structure

### 3. Or Use Individual Commands

If you prefer scripting or know exactly what you want:

**Initialize Tracking:**
```bash
doctype init
```

**Generate Content (AI):**
```bash
doctype generate
```

**Check for Drift:**
```bash
doctype check
```

**Fix Drift (Update Docs):**
```bash
doctype fix
```

**Generate a README file:**
```bash
doctype readme
```

---

### Initialization Details

Running `doctype init` (or selecting "Initialize" in the menu) will:
- Prompt you for project configuration (name, root, docs folder)
- **Automatically scan your TypeScript codebase** for exported symbols
- **Create documentation files** with "TODO" placeholders based on your chosen strategy
- Generate SHA256 hashes of all code signatures
- Create `doctype-map.json` to track everything (commit this file)
- Create `doctype.config.json` with your project configuration (commit this file)

**Doctype will create documentation files with anchors like this:**

```markdown
<!-- docs/src/auth/login.md (Mirror Strategy) -->

# Login

### login

<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440000" code_ref="src/auth/login.ts#login" -->
<!-- TODO: Add documentation for this symbol -->
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440000" -->
```

### 3. Generate Content

Once initialized, generate the actual documentation content using AI:

```bash
doctype generate
```

This command scans for "TODO" placeholders and uses your configured AI provider to write comprehensive documentation for each symbol.

### 4. Check for Drift

```bash
doctype check
```

**Output:**
```
✓ All documentation is in sync with code
```

### 5. Update Code, Fix Docs

Change your code:
```typescript
// src/auth/login.ts
-export function login(email: string): Promise<string>
+export function login(email: string, password: string): Promise<string>
```

Run fix:
```bash
doctype fix
```

**Result:**
```markdown
<!-- docs/api.md -->

<!-- doctype:start id="auth-login" code_ref="src/auth/login.ts#login" -->
Authenticates a user with email and password credentials.

**Parameters:**
- `email` (string): User's email address for authentication
- `password` (string): User's password (minimum 8 characters required)

**Returns:**
- `Promise<string>`: JWT authentication token with 24-hour expiry

**Example:**
```typescript
const token = await login('user@example.com', 'securePassword123');
```
<!-- doctype:end id="auth-login" -->
```

**AI-generated. Automatically. Every time.**

---

## Commands

### `doctype changeset`

Generate a changeset file from code changes using AI.

```bash
doctype changeset
```

**Options:**
- `--base-branch` - Base branch to compare against (default: `main`)
- `--staged-only` - Only analyze staged changes
- `--skip-ai` - Skip AI analysis and use manual/interactive mode
- `--package-name` - Manually allow specifying package name
- `--verbose` - Show detailed output

**What it does:**
1. Detects code changes (git diff + AST analysis)
2. Uses AI to analyze the semantic impact of changes
3. Suggests version bump type (major/minor/patch) and description
4. Generates a changeset file (compatible with `@changesets/cli`)
   - Supports multi-package selection (linked changes)
   - Filters AI context to selected packages for accuracy

**Example:**
```bash
$ doctype changeset
📦 Select Packages for Changeset
? Which packages should this changeset be for? (Press <space> to select, <enter> to submit)
✔ Selected: packages/cli, packages/core

ℹ Analyzing code changes...
✔ Found 3 symbol changes in 2 files
ℹ Generating changeset...
ℹ AI determined version type: minor
✔ Generated changeset: .changeset/calm-eagles-listen.md
```

---

### `doctype init`

Initialize doctype in your project with an interactive setup process.

```bash
doctype init
```

**What it does:**
1. Prompts you for project configuration (name, root directory, docs folder)
2. **Scans all TypeScript files** in your project root
3. **Extracts all exported symbols** (functions, classes, interfaces, types, enums)
4. **Creates documentation files** in your docs folder (structure depends on selected strategy)
5. Generates SHA256 hashes of all code signatures
6. Creates `doctype-map.json` to track everything (commit this)
7. Creates `doctype.config.json` with project configuration (commit this)

**Initial anchors are created with TODO placeholders:**
```markdown
<!-- doctype:start id="uuid" code_ref="src/file.ts#SymbolName" -->
<!-- TODO: Add documentation for this symbol -->
<!-- doctype:end id="uuid" -->
```

You can then manually document each symbol, or use `doctype generate` to auto-fill with AI.

### `doctype generate`

Generate documentation content using AI.

```bash
doctype generate
```

**Options:**
- `--dry-run` - Preview generation without writing files
- `--auto-commit` - Automatically commit changes to git
- `--no-ai` - Use placeholder content instead of AI generation
- `--verbose` - Show detailed output

**What it does:**
1. Scans for "TODO" placeholders in your documentation
2. Detects documentation drift (out of sync code)
3. Sends code context to your AI provider
4. Injects intelligent, generated documentation
5. Updates `doctype-map.json` hashes

### `doctype check`

Verify documentation is in sync with code. Perfect for CI/CD.

```bash
doctype check --verbose
```

**Exit codes:**
- `0` = Docs are in sync ✅
- `1` = Drift detected ❌

**What it does:**
1. **Drift Detection:** Checks if tracked code signatures have changed since the last update.
2. **Missing Symbols:** Detects symbols that have been renamed or removed from the codebase.
3. **Untracked Symbols:** Scans your project for new exported symbols that are not yet documented/tracked.

**Example output when drift detected:**
```
⚠ Documentation drift detected in 2 entries:

  login - src/auth/login.ts
    Documentation: docs/auth.md:10
    Cause: Function signature changed

⚠ Found 1 untracked symbol (not documented): 
  
  newHelperFunc in src/utils.ts

ℹ Run `npx doctype fix` to update the documentation
```

### `doctype fix`

Update documentation to match code changes using AI.

```bash
doctype fix --auto-commit
```

**Options:**
- `--dry-run` - Preview changes without writing files
- `--auto-commit` - Automatically commit changes to git
- `--no-ai` - Skip AI generation (useful for testing CI/CD pipelines without consuming tokens - does not update documentation content)
- `--prune` - Automatically remove missing symbols (deleted/renamed code) from the map and markdown
- `--verbose` - Show detailed output

**What it does:**
1. Detects outdated documentation (drift) and new untracked symbols.
2. Sends old signature + new signature to GPT-4.
3. Receives updated, intelligent documentation.
4. Injects content into your Markdown files (updating existing anchors or creating new ones).
5. Updates `doctype-map.json` with new hashes.
6. (Optional) Prunes dead entries if `--prune` is used.
7. (Optional) Auto-commits with message: `🤖 Doctype Bot: Auto-fix documentation for login`

### `doctype readme`

Generate a README file based on your project structure.

```bash
doctype readme
```

**What it does:**
1. Scans your project for relevant information.
2. Creates a structured README file with sections for installation, usage, and commands.

---

## CI/CD Integration

> **🚧 In Progress**
> 
> CI/CD integration workflows are currently being finalized. Full GitHub Actions, GitLab CI, and other platform integrations will be documented here soon.
> 
> Basic usage in CI:
> ```bash
> doctype check  # Fails with exit code 1 if drift detected
> ```

---

## How It Works

### 1. Deterministic Drift Detection

Doctype uses **SHA256 hashing** of code signatures to detect changes:

```
Old signature: function login(email: string): Promise<string>
New signature: function login(email: string, password: string): Promise<string>

Old hash: abc123...
New hash: def456...

Hashes don't match → Drift detected ✓
```

**Why this matters:**
- 100% accurate (no false positives from whitespace changes)
- Fast (instant hash comparison)
- Deterministic (same code = same hash, every time)

### 2. AI-Powered Documentation

When drift is detected:

```
Doctype sends to GPT-4:
├─ Old signature
├─ New signature
├─ Previous documentation
└─ File context

GPT-4 returns:
└─ Updated, intelligent documentation
```

**Example prompt sent to GPT-4:**

> *"The function signature changed from `login(email: string)` to `login(email: string, password: string)`. The previous documentation described it as 'Authenticates a user with email.' Update the documentation to reflect the new parameter while maintaining the same style and clarity."

**GPT-4's response** is injected between your anchor tags. Your docs update automatically.

### 3. Safe Content Injection

Doctype **never touches** content outside anchor tags:

```markdown
# Your Custom Content Here

This text is never modified by Doctype.

<!-- doctype:start id="uuid" code_ref="src/auth.ts#login" -->
This content is AI-generated and auto-updated.
<!-- doctype:end id="uuid" -->

Your custom content here is also safe.
```

**Result:** Mix auto-generated and hand-written docs safely.

---

## Real-World Example

### Before

**Code:**
```typescript
// src/payments/checkout.ts
export function processPayment(amount: number): Promise<string>
```

**Docs:**
```markdown
<!-- doctype:start id="f47ac10b-58cc-4372-a567-0e02b2c3d479" code_ref="src/payments/checkout.ts#processPayment" -->
Processes a payment for the specified amount.

**Parameters:**
- `amount` (number): Payment amount in dollars

**Returns:**
- `Promise<string>`: Transaction ID
<!-- doctype:end id="f47ac10b-58cc-4372-a567-0e02b2c3d479" -->
```

### You Change the Code

```typescript
// src/payments/checkout.ts
export function processPayment(
  amount: number,
  currency: string,
  paymentMethod: PaymentMethod
): Promise<Transaction>
```

### Doctype Detects + Fixes

```bash
doctype fix --auto-commit
```

### After

**Docs (auto-updated by AI):**
```markdown
<!-- doctype:start id="f47ac10b-58cc-4372-a567-0e02b2c3d479" code_ref="src/payments/checkout.ts#processPayment" -->
Processes a payment transaction with the specified amount, currency, and payment method.

**Parameters:**
- `amount` (number): Payment amount (must be positive)
- `currency` (string): ISO 4217 currency code (e.g., 'USD', 'EUR')
- `paymentMethod` (PaymentMethod): Payment method object containing card or wallet details

**Returns:**
- `Promise<Transaction>`: Complete transaction object including:
  - `id`: Unique transaction identifier
  - `status`: Payment status ('pending', 'completed', 'failed')
  - `timestamp`: Transaction timestamp
  - `receipt`: Receipt URL

**Example:**
```typescript
const transaction = await processPayment(
  99.99,
  'USD',
  { type: 'card', last4: '4242' }
);
console.log(transaction.id); // "txn_abc123"
```

**Errors:**
- Throws `InvalidCurrencyError` if currency code is invalid
- Throws `PaymentDeclinedError` if payment method is declined
<!-- doctype:end id="f47ac10b-58cc-4372-a567-0e02b2c3d479" -->
```

**You didn't write this. Your selected AI provider did. Automatically.**

---

## Cost

### AI Provider Pricing

Doctype uses your selected AI provider:

- **Input:** Pricing varies per provider and model.
- **Output:** Pricing varies per provider and model.
- **Per documentation update:** Pricing varies per provider and model.

### Cost Optimization Tips

1. **Batch your changes**: Don't run `fix` after every small edit. Make multiple changes, then run once.

2. **Use `--no-ai` for testing CI/CD pipelines**:
   ```bash
   doctype fix --no-ai --dry-run  # Test pipeline without consuming tokens
   ```

   **Note:** `--no-ai` does not update documentation content, only for testing.

3. **Choose cheaper models**: Some AI providers offer models that are faster and cheaper. Check your provider's documentation for options.

---

## FAQ

### Do I need to commit `doctype-map.json`?

**Yes.** This file is the source of truth for drift detection. Commit it so your team and CI/CD can detect drift.

### What if I don't want to use AI?

You can manually edit the documentation files. Doctype will still track changes and warn you (via `doctype check`) if your manual documentation gets out of sync with the code.

If you want to use the tooling but skip AI generation during updates, use the `--no-ai` flag:

```bash
doctype fix --no-ai
```

This will update the `doctype-map.json` hashes but inject a placeholder instead of AI content.

### Can I use this without an AI provider?

For **drift detection**: Yes. `doctype check` works without an AI provider.

For **automatic fixing**: No. You need an AI provider.

### Does this work with private codebases?

Yes. Your code can be sent to your selected AI provider's API, but always review their data usage policies.
- Many AI providers do not train on API data.
- You can use `--no-ai` for sensitive code.
- Support for local LLMs is planned.

### What languages are supported?

Currently **TypeScript only**. Support for JavaScript, Python, Go, Rust, and Java is planned.

### Can I customize the AI prompts?

Not yet, but it's on the roadmap. For now, Doctype uses optimized prompts designed for technical documentation.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](https://github.com/doctypedev/.github/blob/main/CONTRIBUTING.md) and submit pull requests.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/alessiopelliccione/doctype/issues)
- **Documentation:** [Full Docs](./src/)

---

## Show Your Support

If Doctype saves you time, give it a ⭐ on GitHub!

---

**Made with ❤️ by developers who hate outdated documentation.**
