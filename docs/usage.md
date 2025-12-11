# Usage Instructions for sintesi-monorepo-root

## Overview

The `sintesi-monorepo-root` project provides a command-line interface (CLI) and library functionalities that facilitate documentation generation and project management. This guide outlines how to effectively use the CLI commands and the library features available in this project.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [pnpm](https://pnpm.js.org/) (version 8.15.5 or higher)

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/your-repo/sintesi-monorepo-root.git
cd sintesi-monorepo-root
pnpm install
```

## CLI Usage

The CLI provides several commands to manage your project. Below are the available commands and their usage:

### 1. Check Documentation Drift

Verifies that documentation is in sync with code by detecting signature drift.

```bash
npx sintesi check [options]
```

#### Options

- `--map <path>`: Path to sintesi-map.json (default: `./sintesi-map.json`)
- `--verbose`: Enable detailed output (default: `false`)
- `--strict`: Exit with error code on drift (default: `true`)

#### Example

```bash
# Basic check
npx sintesi check

# Check with custom map location
npx sintesi check --map ./docs/sintesi-map.json

# Check with verbose output
npx sintesi check --verbose

# Check without failing on drift (for CI warnings)
npx sintesi check --no-strict
```

### 2. Fix Documentation Drift

Updates documentation when drift is detected, using AI or placeholder content.

```bash
npx sintesi fix [options]
```

#### Options

- `--map <path>`: Path to sintesi-map.json (default: `./sintesi-map.json`)
- `--dry-run`: Preview changes without writing (default: `false`)
- `--auto-commit`: Auto-commit changes to git (default: `false`)
- `--no-ai`: Use placeholder instead of AI (default: `false`)
- `--verbose`: Enable detailed output (default: `false`)

#### Example

```bash
# Fix with AI-generated content (requires OPENAI_API_KEY)
npx sintesi fix

# Preview changes without writing files
npx sintesi fix --dry-run

# Fix and automatically commit changes
npx sintesi fix --auto-commit

# Fix without AI (use placeholder content)
npx sintesi fix --no-ai

# Fix with verbose output
npx sintesi fix --verbose
```

### 3. Initialize Sintesi

Initializes Sintesi by scanning the codebase and creating documentation anchors based on the selected strategy.

```bash
npx sintesi init [options]
```

#### Options

- `--docs <path>`: Documentation directory to scan (default: `./docs`)
- `--map <path>`: Output path for sintesi-map.json (default: `./sintesi-map.json`)
- `--verbose`: Enable detailed output (default: `false`)

#### Example

```bash
# Initialize with default settings
npx sintesi init

# Initialize with custom docs directory
npx sintesi init --docs ./documentation

# Initialize with custom map location
npx sintesi init --map ./custom-map.json
```

## Library Usage

The project also exposes library functionalities that can be used programmatically. Below is a brief overview of the key exports.

### Key Exports

- **Logger**: A utility for logging messages with different severity levels.
- **createAgentFromEnv**: Function to create an AI agent using environment variables for configuration.
- **getProjectContext**: Function to retrieve the current project context, including the file structure and package.json data.

### Example Usage

Here’s an example of how to use the library in your own scripts:

```javascript
import { Logger, createAgentFromEnv, getProjectContext } from '@sintesi/core';

const logger = new Logger(true);
const context = getProjectContext(process.cwd());

logger.info('Project context:', context);
```

## Conclusion

The `sintesi-monorepo-root` project provides powerful tools for managing and documenting your codebase. By leveraging the CLI commands and library functionalities, you can streamline your development process and ensure comprehensive documentation. For further assistance, refer to the project's GitHub repository or contact the maintainers.
