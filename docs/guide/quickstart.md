---
title: Quickstart Guide
description: A quickstart guide to help users rapidly understand the sintesi-monorepo-root CLI tool by demonstrating common usage patterns and basic commands.
icon: 🚀
order: 10
---

# Quickstart Guide

Welcome to the sintesi-monorepo-root CLI tool! This guide will help you get started quickly by demonstrating common usage patterns and basic commands.

## Installation

To install the CLI tool, ensure you have Node.js and npm installed, then run:

```bash
npm install -g @sintesi/sintesi
```

## Basic Commands

### 1. Check Command

The `check` command is used to detect documentation drift and ensure your README is up to date with the codebase.

#### Usage

```bash
sintesi check --smart --verbose
```

#### Flags

- `--smart`: Enables smart drift detection.
- `--verbose`: Provides detailed output during execution.

#### Example

```bash
sintesi check --smart
```

This command will analyze your code changes and check for any discrepancies in the README.

### 2. Changeset Command

The `changeset` command analyzes symbol changes and generates a detailed changelog.

#### Usage

```bash
sintesi changeset --base main --forceFetch
```

#### Flags

- `--base <branch>`: Specifies the base branch to compare against (default is `main`).
- `--forceFetch`: Forces fetching from the remote repository.

#### Example

```bash
sintesi changeset --base develop --forceFetch
```

This command will fetch changes from the `develop` branch and generate a changelog based on the differences.

### 3. Readme Command

The `readme` command generates a README.md file based on the project context.

#### Usage

```bash
sintesi readme
```

#### Example

```bash
sintesi readme
```

This command will create or update the README.md file with relevant information from your project.

## Advanced Usage

### Smart Checks

The CLI tool integrates smart checks to skip generation when no relevant changes are detected. This is particularly useful for maintaining efficiency in larger projects.

#### Example

```bash
sintesi check --smart
```

This command will utilize the smart checking mechanism to determine if any updates are necessary.

### Documentation Generation

The CLI can also generate project documentation intelligently based on the context of your code.

#### Example

```bash
sintesi documentation --outputDir docs
```

This command will generate documentation and place it in the specified output directory.

## Conclusion

With these commands, you can effectively manage your project's documentation and changelogs using the sintesi-monorepo-root CLI tool. For more detailed information, refer to the [full documentation](/guide/documentation.md).

Happy coding! 🚀
