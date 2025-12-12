# CLI Troubleshooting Guide

This document serves as a troubleshooting guide for common issues encountered while using the CLI commands in the `sintesi-monorepo-root` project. Below are some common problems, their potential causes, and recommended solutions.

## Common Issues and Solutions

### 1. Command Not Found

**Issue:** When trying to run a command, you receive an error stating that the command is not found.

**Possible Causes:**
- The CLI tool is not installed correctly.
- The command is misspelled or does not exist.

**Solution:**
- Ensure that the CLI tool is installed by running:
  ```bash
  npm install -g @sintesi/sintesi
  ```
- Verify the command name and check the documentation for available commands.

### 2. Permission Denied

**Issue:** You encounter a "permission denied" error when executing a command.

**Possible Causes:**
- Insufficient permissions to access certain files or directories.

**Solution:**
- Try running the command with elevated privileges:
  ```bash
  sudo sintesi <command>
  ```
- Alternatively, check the permissions of the files or directories involved and adjust them accordingly.

### 3. Drift Detection Issues

**Issue:** The `sintesi check` command does not detect changes as expected.

**Possible Causes:**
- The command may not be configured to check the correct branch.
- There may be no relevant changes detected in the code.

**Solution:**
- Ensure you are on the correct branch and specify it using the `--base` flag:
  ```bash
  sintesi check --base main
  ```
- If you are confident there are changes, consider using the `--verbose` flag for more detailed output:
  ```bash
  sintesi check --verbose
  ```

### 4. Documentation Generation Fails

**Issue:** The `sintesi documentation` command fails to generate documentation.

**Possible Causes:**
- Missing or incorrect configuration files.
- Issues with existing documentation structure.

**Solution:**
- Check for the presence of required configuration files in your project directory.
- If existing documentation is detected, ensure it follows the expected structure. You can switch to "Improvement Mode" by ensuring existing documentation is present:
  ```bash
  sintesi documentation --hasExistingDocs
  ```

### 5. AI Integration Errors

**Issue:** Errors related to AI integration during documentation generation.

**Possible Causes:**
- The AI service may not be properly configured or accessible.
- Network issues preventing connection to the AI service.

**Solution:**
- Verify your AI service configuration in the environment variables.
- Check your internet connection and ensure that the AI service is operational.

### 6. Fetching Changes from Remote

**Issue:** The command does not fetch changes from the remote repository as expected.

**Possible Causes:**
- The `forceFetch` option is not set, and there are no changes detected.

**Solution:**
- Use the `--forceFetch` flag to ensure the command fetches changes from the remote:
  ```bash
  sintesi changeset --forceFetch
  ```

## Usage Examples

### Checking for Drift

To check for drift in your documentation, use the following command:
```bash
sintesi check --base main --verbose
```

### Generating Documentation

To generate documentation while respecting existing files, run:
```bash
sintesi documentation --hasExistingDocs
```

### Fetching Changes

To fetch changes from the remote repository, use:
```bash
sintesi changeset --forceFetch
```

## Best Practices

- Always ensure your CLI tool is up to date. Run:
  ```bash
  npm update -g @sintesi/sintesi
  ```
- Regularly check the documentation for updates on commands and flags.
- Use the `--verbose` flag for detailed output when troubleshooting.

By following this guide, you should be able to resolve common issues encountered while using the CLI commands in the `sintesi-monorepo-root` project. If problems persist, consider reaching out to the community or checking the project's issue tracker for further assistance.