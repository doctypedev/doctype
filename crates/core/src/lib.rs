#![deny(clippy::all)]

use napi_derive::napi;

// Expose Types
pub mod types;
pub use types::{SymbolType, CodeRef, CodeSignature, SignatureHash, DocRef, DoctypeMapEntry, DoctypeMap};

// Core Rust modules (pure logic, no NAPI)
pub mod discovery;
pub use discovery::{
    discover_files as discover_files_internal, DiscoveredFile, DiscoveryConfig, DiscoveryResult,
    DiscoveryStats, FileCollector,
};

/// AST Analyzer for TypeScript/JavaScript code
#[napi]
pub struct AstAnalyzer {
    config: String,
}

#[napi]
impl AstAnalyzer {
    /// Create a new AST analyzer instance
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            config: String::from("default"),
        }
    }

    /// Analyze a TypeScript/JavaScript file and return information
    ///
    /// This is a placeholder that returns a hello world message.
    /// In the future, this will parse the file and extract symbols.
    #[napi]
    pub fn analyze_file(&self, file_path: String) -> String {
        format!("Hello from Rust! Analyzing file: {}", file_path)
    }

    /// Get a list of exported symbols from a file (placeholder)
    #[napi]
    pub fn get_symbols(&self, _file_path: String) -> Vec<String> {
        vec![
            "function1".to_string(),
            "function2".to_string(),
            "MyClass".to_string(),
        ]
    }
}

/// Simple hello world function to test the napi binding
#[napi]
pub fn hello_world() -> String {
    "Hello from Doctype Rust Core! 🦀".to_string()
}

/// Get version information
#[napi]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ============================================================================
// NAPI Bindings for File Discovery
// ============================================================================

/// NAPI-compatible result structure for file discovery
#[napi(object)]
pub struct FileDiscoveryResult {
    /// List of markdown file paths found
    pub markdown_files: Vec<String>,
    /// List of source file paths found
    pub source_files: Vec<String>,
    /// Total number of files found
    pub total_files: u32,
    /// Number of errors encountered
    pub errors: u32,
}

/// NAPI-compatible options for file discovery
#[napi(object)]
pub struct FileDiscoveryOptions {
    /// Respect .gitignore rules (default: true)
    pub respect_gitignore: Option<bool>,
    /// Include hidden files (default: false)
    pub include_hidden: Option<bool>,
    /// Maximum depth to traverse (default: unlimited)
    pub max_depth: Option<u32>,
}

/// Discover files in a directory (NAPI binding for Node.js)
///
/// Scans the given directory and returns all markdown and source files found.
/// Respects .gitignore by default.
///
/// # Arguments
/// * `root_path` - The root directory to scan
/// * `options` - Optional configuration for the discovery process
///
/// # Example (Node.js)
/// ```javascript
/// const { discoverFiles } = require('@doctypedev/core');
///
/// const result = discoverFiles('./src', {
///   respectGitignore: true,
///   includeHidden: false,
///   maxDepth: 5
/// });
///
/// console.log('Found', result.markdownFiles.length, 'markdown files');
/// console.log('Found', result.sourceFiles.length, 'source files');
/// console.log('Total:', result.totalFiles);
/// ```
#[napi]
pub fn discover_files(
    root_path: String,
    options: Option<FileDiscoveryOptions>,
) -> FileDiscoveryResult {
    // Build Rust configuration from NAPI options
    let mut config = DiscoveryConfig::new();

    if let Some(opts) = options {
        if let Some(respect_gitignore) = opts.respect_gitignore {
            config = config.respect_gitignore(respect_gitignore);
        }
        if let Some(include_hidden) = opts.include_hidden {
            config = config.include_hidden(include_hidden);
        }
        if let Some(max_depth) = opts.max_depth {
            config = config.max_depth(max_depth as usize);
        }
    }

    // Call the pure Rust function
    let result = discover_files_internal(root_path, config);

    // Convert PathBuf to String for NAPI
    let markdown_files: Vec<String> = result
        .markdown_files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    let source_files: Vec<String> = result
        .source_files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    let total_files = (markdown_files.len() + source_files.len()) as u32;

    // Return NAPI-compatible result
    FileDiscoveryResult {
        markdown_files,
        source_files,
        total_files,
        errors: result.stats.errors as u32,
    }
}