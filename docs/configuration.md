# Configuration Guide for sintesi-monorepo-root CLI Tool

## Introduction

This document provides comprehensive instructions on how to configure the Command Line Interface (CLI) tool for the `sintesi-monorepo-root` project. The CLI tool is designed to facilitate various tasks across different environments and use cases, enhancing the development experience.

## Prerequisites

Before configuring the CLI tool, ensure that you have the following:

- **Node.js**: Version 20.x or higher.
- **pnpm**: Ensure `pnpm` is installed globally. You can install it using npm:
  ```bash
  npm install -g pnpm
  ```

## Configuration Overview

The CLI tool can be configured through the `sintesi.config.json` file located at the root of the `sintesi-monorepo-root` project. Below is the structure of the configuration file:

```json
{
  "projectName": "sintesi",
  "projectRoot": ".",
  "docsFolder": "./docs",
  "mapFile": "sintesi-map.json",
  "outputStrategy": "mirror"
}
```

### Configuration Fields

- **projectName**: The name of the project (string).
- **projectRoot**: The root directory of the project (string).
- **docsFolder**: The folder where documentation files are stored (string).
- **mapFile**: The name of the map file used by the CLI (string).
- **outputStrategy**: The strategy for outputting results (string, e.g., "mirror").

## Environment Configuration

### Development Environment

For development purposes, you may want to run the CLI tool in a way that allows for real-time feedback and testing. Use the following commands:

```bash
# Start the development server for documentation
pnpm docs:dev

# Run tests in watch mode
pnpm test -- --watch
```

### Testing Environment

To ensure that your changes do not break existing functionality, you can run the tests using:

```bash
pnpm test
```

This command will execute all tests across the packages in the monorepo.

### Production Environment

When you are ready to build your project for production, use the following command:

```bash
pnpm build
```

This command compiles all packages and prepares them for deployment. You can also build the documentation for production using:

```bash
pnpm docs:build
```

### Cleaning Up

To remove build artifacts and reset the environment, use the clean command:

```bash
pnpm clean
```

## Custom Configuration

If you need to customize the CLI tool further, you can create a `.env` file in the root directory of your project. This file can contain environment-specific variables that the CLI tool can read. For example:

```env
# .env file example
NODE_ENV=development
API_URL=https://api.example.com
```

### Accessing Environment Variables

You can access these environment variables in your CLI commands using Node.js's `process.env`:

```javascript
const apiUrl = process.env.API_URL;
```

## CLI Commands

The following commands are available in the `packages/cli/src/commands` directory:

- **check**: Performs checks on the codebase using smart drift detection.
- **readme**: Generates or updates the README file, incorporating smart checks to skip generation if no relevant changes are detected.
- **documentation**: Automates the generation of documentation, also utilizing smart checks to skip generation if no relevant changes are detected.

### Usage Examples

To use the CLI tool with the configuration file, ensure that `sintesi.config.json` is properly set up. For example, you can run:

```bash
npx sintesi documentation --output-dir docs --verbose
```

This command will generate documentation based on the configuration settings.

To generate or update the README file, you can run:

```bash
npx sintesi readme --output README.md --verbose
```

This command will generate the README file, skipping the generation if no relevant code changes are detected.

## Conclusion

Configuring the CLI tool for the `sintesi-monorepo-root` project is straightforward. By using the provided scripts and environment configurations, you can streamline your development, testing, and production workflows. For further assistance, refer to the project's documentation or reach out to the development team.

For any issues or feature requests, please consult the [Changelog](changelog.md) for recent updates or file an issue in the project's repository.
