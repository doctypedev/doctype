# Configuration Guide for sintesi-monorepo-root CLI Tool

## Introduction

This document provides comprehensive instructions on how to configure the Command Line Interface (CLI) tool for the `sintesi-monorepo-root` project. The CLI tool is designed to facilitate various tasks across different environments and use cases, enhancing the development experience.

## Prerequisites

Before configuring the CLI tool, ensure that you have the following:

- **Node.js**: Version 14.x or higher.
- **pnpm**: Ensure `pnpm` is installed globally. You can install it using npm:
  ```bash
  npm install -g pnpm
  ```

## Configuration Overview

The CLI tool can be configured to operate in different environments, such as development, testing, and production. The configuration is primarily managed through the `package.json` file located at the root of the `sintesi-monorepo-root` project.

### Key Scripts

The following scripts are available in the `package.json` file:

- **test**: Runs tests across all packages.
- **build**: Builds all packages in the monorepo.
- **clean**: Cleans build artifacts across packages.
- **lint**: Lints the codebase.
- **release**: Handles versioning and publishing of packages.
- **docs:dev**: Serves the documentation in development mode.
- **docs:preview**: Previews the documentation build.
- **docs:build**: Builds the documentation for production.
- **generate:sidebar**: Generates the sidebar for documentation.

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

- **init**: Initializes a new project or package.
- **fix**: Applies fixes to the codebase.
- **menu**: Displays the CLI menu options.
- **changeset**: Manages changesets for versioning.
- **generate**: Generates files or resources based on templates.
- **check**: Performs checks on the codebase.
- **readme**: Generates or updates the README file.
- **documentation**: Automates the generation of documentation.

## Conclusion

Configuring the CLI tool for the `sintesi-monorepo-root` project is straightforward. By using the provided scripts and environment configurations, you can streamline your development, testing, and production workflows. For further assistance, refer to the project's documentation or reach out to the development team.

For any issues or feature requests, please consult the [Changelog](changelog.md) for recent updates or file an issue in the project's repository.
