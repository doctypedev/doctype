# Native Packages

This directory contains platform-specific npm packages for the Sintesi Rust core.

## Structure

Each subdirectory represents a platform-specific package:

- `darwin-arm64/` - macOS ARM64 (Apple Silicon: M1, M2, M3, etc.)
- *(More platforms will be added in the future)*

## Package Naming

Native packages follow this naming convention:

```
@sintesi/sintesi-{platform}-{arch}
```

Examples:
- `@sintesi/sintesi-darwin-arm64`
- `@sintesi/sintesi-linux-x64`
- `@sintesi/sintesi-win32-x64`

## How It Works

1. **Build**: The Rust library is compiled for each platform during CI/CD
2. **Package**: The compiled binary is copied to the corresponding npm package
3. **Publish**: Each platform package is published independently to npm
4. **Install**: The main `@sintesi/sintesi` package can optionally depend on these

## Version Synchronization

This directory contains the native npm packages for the different platforms.



## Binary Format

Each package contains a native Node.js addon with the following structure:

```
darwin-arm64/
├── package.json
├── index.js                               # Loader script
├── README.md
└── sintesi-core.darwin-arm64.node        # Native binary (generated)
```

The `.node` file is a compiled C dynamic library that Node.js can load directly.

## Publishing

Native packages are published automatically via GitHub Actions when the main package is published.

See `.github/workflows/publish.yml` for the full workflow.

## Local Development

To build locally:

```bash
# Build Rust library
cd crates/core
cargo build --release

# Copy binary to npm package
cd ../..
./crates/core/scripts/build.sh
```

## Adding New Platforms

To add support for a new platform:

1. Create a new directory: `crates/core/npm/{platform}-{arch}/`
2. Copy the structure from an existing platform
3. Update the GitHub Actions matrix in `.github/workflows/publish.yml`
4. Add the platform to the build script
