# Doctype

> **The Self-Maintaining Documentation System**

Doctype keeps your documentation automatically synchronized with your code. When function signatures change, your Markdown documentation updates automatically using AI-powered generation.

**No more outdated documentation. Ever.**

---

## ✨ Features

### 🤖 AI-Powered Documentation
- Generates intelligent, context-aware documentation using OpenAI GPT-4
- Understands code changes and updates docs accordingly
- Falls back to placeholder content if AI is unavailable

### 🔍 Automatic Drift Detection
- Analyzes TypeScript code using AST (Abstract Syntax Tree)
- Detects when code signatures change
- Integrates seamlessly with CI/CD pipelines

### 📝 Smart Content Management
- Embeds documentation directly in Markdown files
- Uses HTML comment anchors for precise placement
- Preserves formatting and custom content

### 🚀 Git Integration
- Auto-commit documentation updates
- Standard commit messages for easy tracking
- Optional push to remote repositories

---

## 📦 Installation

### NPM (Recommended)

```bash
npm install -g doctype
```

### From Source

```bash
git clone https://github.com/your-org/doctype.git
cd doctype
npm install
npm run build
npm link
```

---

## 🚀 Quick Start

### 1. Set Up Your Documentation

Add doctype anchors to your Markdown files using HTML comments:

```markdown
<!-- docs/api.md -->

# API Documentation

<!-- doctype:start id="auth-login" code_ref="src/auth/login.ts#login" -->
Documentation content will be auto-generated here
<!-- doctype:end id="auth-login" -->
```

### 2. Initialize Tracking

Create a `doctype-map.json` file or let doctype create it for you:

```bash
npx doctype check
```

### 3. Configure OpenAI (Optional but Recommended)

Set your OpenAI API key for AI-powered documentation:

```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

### 4. Check for Drift

Verify your documentation is in sync with code:

```bash
npx doctype check --verbose
```

### 5. Fix Drift Automatically

Update documentation when code changes:

```bash
npx doctype fix
```

---

## 📖 Usage

### Basic Commands

#### Check Documentation

Verifies that documentation matches current code signatures:

```bash
# Basic check
npx doctype check

# With detailed output
npx doctype check --verbose

# Custom map location
npx doctype check --map ./docs/doctype-map.json
```

**Exit Codes:**
- `0` - No drift detected
- `1` - Drift detected or configuration error

#### Fix Documentation

Updates documentation to match code changes:

```bash
# Fix with AI-generated content
npx doctype fix

# Preview changes without writing
npx doctype fix --dry-run

# Fix and commit automatically
npx doctype fix --auto-commit

# Use placeholder content (no AI)
npx doctype fix --no-ai

# Detailed output
npx doctype fix --verbose
```

### Advanced Options

```bash
# Check with custom settings
npx doctype check \
  --map ./custom-map.json \
  --verbose \
  --no-strict  # Don't exit with error on drift

# Fix with all options
npx doctype fix \
  --dry-run \
  --auto-commit \
  --no-ai \
  --verbose
```

---

## 🔧 Configuration

### Environment Variables

```bash
# OpenAI API Key (for AI-powered documentation)
export OPENAI_API_KEY=sk-your-key-here

# Alternative: Gemini API Key (coming soon)
export GEMINI_API_KEY=your-gemini-key
```

### Anchor Format

Doctype uses HTML comments to mark documentation sections:

```markdown
<!-- doctype:start id="unique-id" code_ref="file/path.ts#symbolName" -->
Your documentation content here.
This will be auto-updated when the code changes.
<!-- doctype:end id="unique-id" -->
```

**Format:**
- `id`: Unique identifier (UUID recommended)
- `code_ref`: Code reference in format `file_path#symbol_name`

**Example:**

```markdown
<!-- doctype:start id="550e8400-e29b-41d4-a716-446655440000" code_ref="src/utils/format.ts#formatDate" -->
Formats a date according to the specified format string.

**Parameters:**
- `date` (Date): The date to format
- `format` (string): Format string (e.g., 'YYYY-MM-DD')

**Returns:**
- `string`: Formatted date string
<!-- doctype:end id="550e8400-e29b-41d4-a716-446655440000" -->
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Documentation Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  doctype:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Check documentation drift
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx doctype check --verbose

      # Optional: Auto-fix on main branch
      - name: Fix documentation
        if: github.ref == 'refs/heads/main'
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npx doctype fix --auto-commit
          git push
```

### GitLab CI

```yaml
doctype:check:
  image: node:20
  script:
    - npm ci
    - npx doctype check --verbose
  only:
    - merge_requests
    - main

doctype:fix:
  image: node:20
  script:
    - npm ci
    - npx doctype fix --auto-commit
  only:
    - main
  when: manual
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

npx doctype check || {
  echo "❌ Documentation drift detected!"
  echo "Run 'npx doctype fix' to update documentation"
  exit 1
}
```

---

## 💡 Examples

### Example 1: Basic Workflow

**1. You have a function:**

```typescript
// src/auth/login.ts
export function login(email: string): Promise<string> {
  // Implementation
}
```

**2. You document it:**

```markdown
<!-- docs/auth.md -->
<!-- doctype:start id="auth-login" code_ref="src/auth/login.ts#login" -->
Authenticates a user with email.

**Parameters:**
- `email` (string): User's email address

**Returns:**
- `Promise<string>`: Authentication token
<!-- doctype:end id="auth-login" -->
```

**3. You change the code:**

```typescript
// src/auth/login.ts
export function login(email: string, password: string): Promise<string> {
  // Implementation
}
```

**4. Doctype detects and fixes:**

```bash
npx doctype fix
```

**5. Documentation is automatically updated:**

```markdown
<!-- docs/auth.md -->
<!-- doctype:start id="auth-login" code_ref="src/auth/login.ts#login" -->
Authenticates a user with email and password credentials.

**Parameters:**
- `email` (string): User's email address for authentication
- `password` (string): User's password (minimum 8 characters required)

**Returns:**
- `Promise<string>`: JWT authentication token with 24-hour expiry

**Example:**
\`\`\`typescript
const token = await login('user@example.com', 'securePassword123');
\`\`\`
<!-- doctype:end id="auth-login" -->
```

### Example 2: CI/CD Integration

**Scenario:** Prevent merging PRs with outdated documentation

```yaml
# .github/workflows/pr-check.yml
name: PR Checks

on: pull_request

jobs:
  documentation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx doctype check
        name: Verify documentation is up-to-date
```

### Example 3: Automatic Documentation Updates

**Scenario:** Auto-fix documentation on main branch

```yaml
# .github/workflows/auto-fix-docs.yml
name: Auto-fix Documentation

on:
  push:
    branches: [main]

jobs:
  fix-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci

      - name: Fix documentation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npx doctype fix --auto-commit
          git push
```

---

## 🎯 How It Works

### 1. **AST Analysis**
Doctype analyzes your TypeScript code using Abstract Syntax Tree (AST) parsing to extract function signatures, parameters, return types, and more.

### 2. **Hash-Based Drift Detection**
Each code signature is hashed (SHA256). When code changes, the hash changes, triggering drift detection.

### 3. **AI-Powered Documentation**
OpenAI GPT-4 analyzes the old signature, new signature, and previous documentation to generate updated, context-aware documentation.

### 4. **Safe Content Injection**
Documentation is injected between anchor tags, preserving your custom content outside the anchors.

### 5. **Git Integration**
Changes are automatically staged and committed with standardized messages:
```
🤖 Doctype Bot: Auto-fix documentation for login, logout
```

---

## 🔐 Security

### API Key Management

**Never commit API keys to your repository.**

**Local Development:**
```bash
# Add to .env (and .gitignore)
OPENAI_API_KEY=sk-your-key-here
```

**CI/CD:**
Use secrets management:
- GitHub: Repository Settings → Secrets → Actions
- GitLab: Settings → CI/CD → Variables
- Use service accounts with minimal permissions

### Rate Limiting

OpenAI enforces rate limits. Doctype handles this automatically:
- Retries on rate limit errors (with exponential backoff)
- Falls back to placeholder content on persistent failures
- Clear error messages for troubleshooting

---

## 💰 Cost Considerations

### OpenAI Pricing (GPT-4)
- Input: ~$0.03 per 1K tokens
- Output: ~$0.06 per 1K tokens
- **Per documentation update:** ~$0.06-$0.15

### Cost Optimization Tips

1. **Use GPT-3.5-turbo** for simpler documentation (10x cheaper):
   ```bash
   # Set in code or configuration
   # Default: gpt-4
   ```

2. **Batch changes** before running fix:
   ```bash
   # Fix all changes at once instead of one-by-one
   npx doctype fix
   ```

3. **Use `--no-ai`** for testing:
   ```bash
   npx doctype fix --no-ai --dry-run
   ```

4. **Limit to critical docs** using selective anchors

---

## 🐛 Troubleshooting

### "Map file not found"

**Problem:** `doctype-map.json` doesn't exist

**Solution:**
```bash
# Run from your project root
npx doctype check

# Or specify custom path
npx doctype check --map ./docs/doctype-map.json
```

### "No API key found"

**Problem:** Missing `OPENAI_API_KEY` environment variable

**Solution:**
```bash
export OPENAI_API_KEY=sk-your-key-here
npx doctype fix
```

Or use `--no-ai` flag:
```bash
npx doctype fix --no-ai
```

### "Symbol not found"

**Problem:** Code reference in anchor doesn't match actual code

**Solution:**
1. Verify the `code_ref` format: `file_path#symbol_name`
2. Ensure the symbol is exported
3. Check file path is correct relative to project root

### "Connection timeout"

**Problem:** OpenAI API request timeout

**Solution:**
- Check your internet connection
- Verify API key is valid
- Check OpenAI service status
- Doctype will retry automatically

---

## 📚 Further Documentation

- **[PHASE4.md](./PHASE4.md)** - Complete AI Agent documentation
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[Examples](./src/examples/)** - Code examples and integration guides

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙋 Support

- **Issues:** [GitHub Issues](https://github.com/alessiopelliccione/doctype/issues)
- **Discussions:** [GitHub Discussions](https://github.com/alessiopelliccione/doctype/discussions)
- **Documentation:** [Complete Docs](./docs/)

---

## ⭐ Show Your Support

If Doctype helps you maintain better documentation, give it a star on GitHub!

---

**Made with ❤️**
