# CLI Overview

## Introduction

The Sintesi CLI (Command Line Interface) is a powerful tool designed to streamline the development process by automating various tasks related to documentation and code management. It integrates intelligent features that enhance productivity, allowing developers to focus on writing code rather than managing documentation manually.

## Purpose

The Sintesi CLI serves multiple purposes, including:

- **Documentation Generation**: Automatically generate and update documentation based on code changes.
- **Code Checks**: Perform smart checks to ensure that documentation is in sync with the codebase.
- **Changeset Management**: Generate changesets to track modifications in the code.
- **Interactive Commands**: Provide an interactive experience for users to manage their projects effectively.

## Verified Commands

### 1. `sintesi check`

The `check` command is used to verify the state of the documentation against the current codebase. It employs smart drift detection to identify discrepancies.

#### Usage
```bash
sintesi check --verbose --smart --base <branch>
```

#### Flags
- `--verbose`: Enables verbose output for detailed logging.
- `--smart`: Activates smart checks to detect changes.

#### Example
```bash
sintesi check --verbose --smart --base main
```

### 2. `sintesi readme`

This command generates a `README.md` file based on the project's context and recent code changes. It leverages AI to enhance the quality of the generated content.

#### Usage
```bash
sintesi readme
```

#### Example
```bash
sintesi readme
```

### 3. `sintesi changeset`

The `changeset` command generates a changeset based on the modifications made in the code. This is particularly useful for tracking changes over time.

#### Usage
```bash
sintesi changeset --base <branch> --forceFetch
```

#### Flags
- `--base`: Specifies the base branch for comparison.
- `--forceFetch`: Forces fetching from the remote repository.

#### Example
```bash
sintesi changeset --base main --forceFetch
```

### 4. `sintesi documentation`

This command generates project documentation intelligently based on the existing documentation structure and code context. It can adapt its strategy based on whether existing documentation is found.

#### Usage
```bash
sintesi documentation
```

#### Example
```bash
sintesi documentation
```

## Conclusion

The Sintesi CLI is an essential tool for developers looking to enhance their workflow through automation and intelligent documentation management. By utilizing the verified commands outlined above, users can efficiently manage their projects and maintain high-quality documentation with minimal effort.