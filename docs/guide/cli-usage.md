---
title: CLI Usage Guide
description: A comprehensive guide to using the Sintesi CLI commands for various workflows.
icon: ⚙️
order: 10
---

# CLI Usage Guide

This guide provides step-by-step instructions for using the Sintesi CLI commands: `check`, `readme`, `changeset`, and `documentation`. Each section includes practical examples to help you understand how to apply these commands in real-world scenarios.

## Table of Contents
- [Check Command](#check-command)
- [Readme Command](#readme-command)
- [Changeset Command](#changeset-command)
- [Documentation Command](#documentation-command)

## Check Command

The `check` command is used to analyze your project for documentation drift and ensure that your README is up to date with the latest code changes.

### Usage

```bash
sintesi check --verbose --smart --base <branch>
```

### Flags
- `--verbose`: Enables verbose logging for detailed output.
- `--smart`: Activates smart drift detection.
- `--base <branch>`: Specifies the base branch to compare against (default is `main`).

### Example

To check for drift against the `main` branch with verbose output:

```bash
sintesi check --verbose --smart --base main
```

### Expected Output

- If no drift is detected:
  ```
  Success: No drift detected.
  ```
- If drift is detected:
  ```
  Error: Drift detected. Reason: Missing docs. Suggestion: Update docs.
  ```

## Readme Command

The `readme` command generates or updates the README.md file based on the current project context and recent code changes.

### Usage

```bash
sintesi readme --force
```

### Flags
- `--force`: Forces the generation of the README even if no relevant changes are detected.

### Example

To generate the README while forcing an update:

```bash
sintesi readme --force
```

### Expected Output

- If the README is generated successfully:
  ```
  README.md has been updated successfully.
  ```
- If no relevant changes are detected and `--force` is not used:
  ```
  Skipping generation: No relevant changes detected.
  ```

## Changeset Command

The `changeset` command generates a changeset based on the code changes made in the repository.

### Usage

```bash
sintesi changeset --base <branch> --forceFetch
```

### Flags
- `--base <branch>`: Specifies the base branch to compare against (default is `main`).
- `--forceFetch`: Forces fetching from the remote repository before generating the changeset.

### Example

To generate a changeset from the `develop` branch and force fetching:

```bash
sintesi changeset --base develop --forceFetch
```

### Expected Output

- If the changeset is generated successfully:
  ```
  Changeset generated successfully.
  ```
- If no changes are detected:
  ```
  No changes detected for the specified base branch.
  ```

## Documentation Command

The `documentation` command generates project documentation based on the current codebase and context.

### Usage

```bash
sintesi documentation --site
```

### Flags
- `--site`: Indicates that the documentation is for a site context, which may require different handling.

### Example

To generate documentation for the site context:

```bash
sintesi documentation --site
```

### Expected Output

- If documentation is generated successfully:
  ```
  Documentation generated successfully.
  ```
- If the impact analysis indicates no updates are needed:
  ```
  Skipping generation: No relevant changes detected.
  ```

## Conclusion

This guide provides a foundational understanding of how to use the Sintesi CLI commands effectively. For further details on specific commands or flags, refer to the official documentation or use the `--help` flag with any command for more information.
