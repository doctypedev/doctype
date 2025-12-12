---
layout: home
title: Home
hero:
  name: Sintesi
  text: Intelligent Documentation Generator
  tagline: Keep your docs in sync with your code automatically.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/configuration
    - theme: alt
      text: View Commands
      link: /reference/commands
features:
  - title: Smart Drift Detection
    details: Automatically detects when your documentation is out of sync with your code.
  - title: AI-Powered Updates
    details: Uses advanced LLMs to intelligently update documentation based on code changes.
  - title: Zero Config
    details: Works out of the box with sensible defaults, but fully configurable when needed.
---

## Introduction

The **Sintesi CLI Tool** is a command-line interface designed to streamline the documentation process for developers. By integrating intelligent checks and automated updates, Sintesi ensures that your documentation remains in sync with your codebase. This tool leverages AI to enhance documentation quality, making it easier to maintain and generate comprehensive documentation.

## Purpose

The primary purpose of the Sintesi CLI Tool is to facilitate the following:

- **Documentation Drift Detection**: Automatically checks for discrepancies between your code and its corresponding documentation.
- **Automated Documentation Updates**: Uses AI to update documentation based on recent code changes.
- **User-Friendly Interface**: Provides an intuitive command-line interface for various documentation tasks.

## Verified Commands

Sintesi includes several verified commands that enhance its functionality:

### `sintesi check`

- **Purpose**: Verifies that documentation is in sync with the code.
- **Flags**:
  - `--verbose`: Enables verbose output.
  - `--smart`: Uses smart checks to detect drift.
  - `--base <branch>`: Specifies the base branch for comparison (default is `main`).

### `sintesi readme`

- **Purpose**: Generates a `README.md` based on project context.
- **Features**: Analyzes recent code changes to improve documentation generation.

### `sintesi changeset`

- **Purpose**: Generates changesets from code changes using AI.
- **Flags**:
  - `--baseBranch <branch>`: Specifies the base branch for changeset generation (default is `main`).
  - `--forceFetch`: Forces fetching from the specified base branch.

### `sintesi documentation`

- **Purpose**: Generates project documentation using AI.
- **Features**: Automatically creates documentation based on code analysis and TODO placeholders.

## Usage Examples

### Check Command

To check for documentation drift:

```bash
npx sintesi check --verbose --smart --base main
```

### Readme Command

To generate a README file:

```bash
npx sintesi readme
```

### Changeset Command

To generate a changeset:

```bash
npx sintesi changeset --baseBranch main --noAI
```

### Documentation Command

To generate documentation:

```bash
npx sintesi documentation
```

## Conclusion

With Sintesi, developers can ensure their documentation is always up-to-date and reflective of the current state of their code. The integration of AI and smart checks makes it a powerful tool for maintaining high-quality documentation effortlessly.
