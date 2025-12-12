---
title: Release Workflow
description: A comprehensive guide detailing the release workflow for the sintesi-monorepo-root project, including versioning, changelog generation, and the monorepo release process.
icon: 🚀
order: 20
---

# Release Workflow

This document outlines the release workflow for the `sintesi-monorepo-root` project. It details how the `changeset` command integrates with the project's versioning, changelog generation, and the overall monorepo release process. This guide is essential for developers responsible for managing the project's release cycle.

## Overview

The release process in this project is primarily managed through the `changeset` command, which automates versioning and changelog generation. The workflow consists of the following key steps:

1. **Creating a Changeset**: Developers create a changeset to document changes made in the codebase.
2. **Versioning**: The `changeset version` command updates the package versions based on the changes documented.
3. **Publishing**: The `changeset publish` command publishes the updated packages to the registry.

## Step-by-Step Release Process

### 1. Creating a Changeset

To create a changeset, run the following command:

```bash
pnpm changeset
```

This command will prompt you to specify the changes made, including the type of change (major, minor, or patch) and the affected packages. The changeset will be saved in the `.changeset` directory.

### 2. Versioning

Once all changesets are created, you can version the packages by executing:

```bash
pnpm changeset version
```

This command will:

- Read all changesets in the `.changeset` directory.
- Update the version numbers of the affected packages according to the specified changes.
- Generate a changelog based on the changes documented in the changesets.

### 3. Publishing

After versioning, the next step is to publish the updated packages. Use the following command:

```bash
pnpm changeset publish
```

This command will:

- Publish the updated packages to the npm registry.
- Ensure that the changelog is included in the published packages.

## Usage Examples

### Creating a Changeset

When you run `pnpm changeset`, you might see a prompt like this:

```
What packages would you like to update? (select multiple with space)
- @sintesi/sintesi
- @sintesi/cli

What is the type of change? (major, minor, patch)
```

### Versioning Packages

After creating changesets, running `pnpm changeset version` will output something like:

```
Updated packages:
- @sintesi/sintesi: 0.0.0 → 0.1.0
- @sintesi/cli: 0.0.0 → 0.0.1
```

### Publishing Packages

When you execute `pnpm changeset publish`, you may see:

```
Publishing @sintesi/sintesi@0.1.0...
Publishing @sintesi/cli@0.0.1...
```

## Important Notes

<Callout type="info">
Ensure that all changes are documented in changesets before running the versioning and publishing commands. This helps maintain a clear history of changes and ensures accurate versioning.
</Callout>

## Conclusion

Following this release workflow will help maintain consistency and clarity in the release process of the `sintesi-monorepo-root` project. By leveraging the `changeset` command, developers can efficiently manage versioning and changelog generation, ensuring a smooth release cycle.
