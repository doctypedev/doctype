<p align="center">
  <img src="assets/full_logo.png" alt="Sintesi Logo" width="500" />
</p>

# Sintesi

[![npm version](https://badge.fury.io/js/@sintesi%2Fsintesi.svg)](https://www.npmjs.com/package/@sintesi/sintesi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Documentation that lives and evolves with your code.**

Sintesi is the intelligent documentation engine for modern engineering teams. It stops documentation drift by automatically detecting code changes and using AI to keep your docs perfectly in sync.

---

## ⚡️ The "Zero Drift" Promise

**You write code. Sintesi writes the docs.**

- **Automatic Sync**: Detects changes in your codebase instantly.
- **AI-Powered**: Generates professional, context-aware documentation.
- **VitePress Ready**: Builds beautiful documentation sites with a single command.
- **CI/CD Native**: Blocks PRs if documentation is outdated.

## 🚀 Quick Start

1.  **Install**
    ```bash
    npm install -g @sintesi/sintesi
    ```

2.  **Generate a README instantly**
    Don't have a README? Let Sintesi inspect your code and write one for you.
    ```bash
    sintesi readme
    ```

3.  **Generate Full Docs Site**
    Ready for a full website?
    ```bash
    sintesi documentation --site
    ```

## 📚 Documentation

We believe in eating our own dog food. Our entire documentation is generated and maintained by Sintesi itself.

👉 **[Read the Full Documentation](./docs/index.md)**

- **[Installation Guide](./docs/guide/configuration.md)**
- **[CLI Commands Reference](./docs/reference/commands.md)**
- **[Recipes & Workflows](./docs/guide/recipes.md)**

## ✨ Key Features

### 📄 Instant README
Starting a new project? `sintesi readme` scans your file structure, `package.json`, and source code to generate a comprehensive, professional `README.md` in seconds. It even detects recent git changes to keep it updated.

### 🧠 Smart Context
Sintesi doesn't just read files; it understands your project architecture. It analyzes imports, exports, and dependencies to write documentation that explains *why*, not just *what*.

### 🎨 Site Mode
Turn your repository into a full-fledged documentation website.
`sintesi documentation --site` organizes your content into guides, references, and API docs, complete with:
- **Manual Sidebar Configuration** guidance for VitePress.
- **Mermaid Diagrams** for flows.
- **Rich Frontmatter** for SEO and metadata.

### 🛡️ Drift Protection
Never merge undocumented code again.
`sintesi check` verifies that every exported function, class, and component has up-to-date documentation matching its current signature.

---

## Contributing

We love contributions! Please check out our [Contributing Guide](./docs/community/contributing.md).

## License

MIT © [Alessio Pelliccione](https://github.com/alessiopelliccione)