# CLI Commands Reference for sintesi-monorepo-root

This document provides a comprehensive reference for all available CLI commands in the `sintesi-monorepo-root` project. The commands are designed to facilitate various tasks within the monorepo, enhancing development efficiency and project management.

## Available Commands

### 1. `init`

The `init` command initializes the project environment. It sets up necessary configurations and prepares the workspace for development.

#### Usage
```bash
npm run init
```

#### Description
- Creates a `sintesi.config.json` file with user-provided settings.
- Scans all TypeScript files in the project root.
- Extracts exported symbols and creates documentation anchors in `api.md`.
- Generates `sintesi-map.json` with code signatures and hash tracking.

#### Options
- `--force`: Overwrites existing configurations without prompting.

---

### 2. `check`

The `check` command performs a series of validation checks on the project. This includes verifying configurations, ensuring dependencies are correctly installed, and checking for any potential issues in the codebase.

#### Usage
```bash
npm run check
```

#### Description
- Validates project configurations.
- Checks for missing or incompatible dependencies.
- Reports any issues found in the codebase.

#### Options
- `--verbose`: Provides detailed output of the checks performed.
- `--smart`: Enables high-level drift detection without requiring a map file.

---

### 3. `fix`

The `fix` command is used to automatically correct issues identified in the project. This can include fixing linting errors, updating dependencies, and resolving configuration problems.

#### Usage
```bash
npm run fix
```

#### Description
- Automatically applies fixes for linting errors.
- Updates outdated dependencies to their latest versions.
- Corrects configuration issues where possible.

#### Options
- `--dry-run`: Simulates the fixes without applying them, allowing users to review changes beforehand.
- `--all`: Applies fixes across all packages in the monorepo.

---

### 4. `generate`

The `generate` command creates new files or structures based on predefined templates or configurations.

#### Usage
```bash
npm run generate
```

#### Description
- Generates new components, modules, or files as specified by the user.
- Utilizes templates to ensure consistency across generated items.

#### Options
- `--type <type>`: Specifies the type of item to generate (e.g., component, service).
- `--name <name>`: Sets the name for the generated item.

---

### 5. `changeset`

The `changeset` command manages versioning and changelogs for the project.

#### Usage
```bash
npm run changeset
```

#### Description
- Creates a new changeset for tracking changes in the project.
- Generates a changelog based on the changesets created.

#### Options
- `--message <message>`: Adds a custom message to the changeset.
- `--bump <bump>`: Specifies the version bump type (patch, minor, major).

---

### 6. `documentation`

The `documentation` command automates the generation of project documentation based on the current codebase.

#### Usage
```bash
npm run documentation
```

#### Description
- Analyzes the project structure and generates documentation files.
- Ensures that documentation is up-to-date with the latest changes in the codebase.

#### Options
- `--output <path>`: Specifies the output directory for the generated documentation.
- `--format <format>`: Sets the format of the documentation (e.g., markdown, HTML).

---

### 7. `readme`

The `readme` command generates or updates the README file for the project.

#### Usage
```bash
npm run readme
```

#### Description
- Creates or updates the README file based on the current project state.
- Ensures that all necessary information is included and formatted correctly.

#### Options
- `--overwrite`: Overwrites the existing README file without prompting.

---

## Conclusion

These CLI commands are integral to the development workflow of the `sintesi-monorepo-root` project. By utilizing these commands, developers can streamline their processes, maintain project integrity, and enhance productivity. For further assistance or to report issues, please refer to the project's documentation or contact the development team.
