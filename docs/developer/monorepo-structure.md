# Monorepo Structure Documentation for sintesi-monorepo-root

## Overview

The `sintesi-monorepo-root` project utilizes a monorepo structure to manage multiple packages efficiently. This document outlines the internal architecture, the organization of packages, and guidelines for contributing to the CLI functionality.

## Monorepo Structure

The monorepo is organized into several packages, each serving a specific purpose. Below is a high-level overview of the directory structure:

```
sintesi-monorepo-root/
├── packages/
│   ├── cli/
│   ├── core/
│   └── other-packages/
├── .changeset/
├── docs/
└── package.json
```

### Packages

- **cli**: This package contains the command-line interface (CLI) for the Sintesi project. It provides commands for documentation generation, checks, and other utilities.
- **core**: The core package contains the main logic and utilities that support the CLI and other packages.
- **other-packages**: Additional packages that may be added as the project evolves.

### Key Files

- **package.json**: The root `package.json` file defines scripts for building, testing, and managing dependencies across the monorepo.
- **.changeset/**: This directory contains markdown files that track changes made to the packages, facilitating versioning and release management.
- **docs/**: Documentation files for the project, including guides and API references.

## CLI Commands

The CLI provides several commands to interact with the project. Below are some of the key commands and their functionalities:

### `sintesi check`

This command checks for documentation drift and verifies that the README is up-to-date.

#### Usage Example

```bash
sintesi check --verbose --smart --base main
```

### `sintesi fix`

This command fixes documentation issues detected by the `check` command. It includes a `--prune` flag to remove dead documentation entries.

#### Usage Example

```bash
sintesi fix --prune
```

### `sintesi readme`

Generates a `README.md` based on the project context.

#### Usage Example

```bash
sintesi readme
```

### `sintesi changeset`

Generates a changeset based on code changes.

#### Usage Example

```bash
sintesi changeset --base main --noAI
```

## Contributing Guidelines

To contribute to the Sintesi project, please follow these guidelines:

1. **Fork the Repository**: Create a personal fork of the repository.
2. **Create a Branch**: Use a descriptive branch name for your feature or bug fix.
3. **Write Tests**: Ensure that your changes are covered by tests. The project uses Vitest for testing.
4. **Update Documentation**: If your changes affect the CLI commands or functionality, update the relevant documentation.
5. **Submit a Pull Request**: Once your changes are ready, submit a pull request for review.

## Extending CLI Functionality

To extend the CLI functionality, you can add new commands or modify existing ones. Here are some steps to follow:

1. **Create a New Command**: Add a new file in the `src/commands` directory.
2. **Implement Command Logic**: Define the command's logic and options.
3. **Update Command Registration**: Ensure that the new command is registered in the CLI entry point.
4. **Test Your Command**: Write tests to validate the command's behavior.
5. **Document Your Command**: Update the documentation to include usage examples and descriptions.

## Conclusion

The `sintesi-monorepo-root` project is designed to facilitate efficient development and collaboration. By following the outlined structure and guidelines, developers can contribute effectively and extend the CLI functionality as needed. For any questions or further assistance, please refer to the documentation or reach out to the project maintainers.