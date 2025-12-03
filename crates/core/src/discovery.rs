//! File discovery module for scanning codebases
//!
//! This module provides functionality to discover and categorize files in a directory tree.
//! It can find TypeScript/JavaScript source files and Markdown documentation files while
//! respecting .gitignore rules and providing flexible configuration options.

use ignore::{Walk, WalkBuilder};
use std::ffi::OsStr;
use std::path::PathBuf;

/// Represents a discovered file in the codebase
#[derive(Debug, Clone)]
pub enum DiscoveredFile {
    /// Markdown documentation file (.md, .mdx)
    Markdown(PathBuf),
    /// TypeScript/JavaScript source file (.ts, .tsx, .js, .jsx, .mts, .cts)
    Source(PathBuf),
}

impl DiscoveredFile {
    /// Get the path of the discovered file
    pub fn path(&self) -> &PathBuf {
        match self {
            DiscoveredFile::Markdown(p) | DiscoveredFile::Source(p) => p,
        }
    }

    /// Check if this is a markdown file
    pub fn is_markdown(&self) -> bool {
        matches!(self, DiscoveredFile::Markdown(_))
    }

    /// Check if this is a source file
    pub fn is_source(&self) -> bool {
        matches!(self, DiscoveredFile::Source(_))
    }
}

/// Configuration options for file discovery
#[derive(Debug, Clone)]
pub struct DiscoveryConfig {
    /// Follow .gitignore rules
    pub respect_gitignore: bool,
    /// Include hidden files (starting with .)
    pub include_hidden: bool,
    /// Maximum depth to traverse (None = unlimited)
    pub max_depth: Option<usize>,
    /// Include additional file extensions for source files
    pub custom_source_extensions: Vec<String>,
    /// Include additional file extensions for markdown files
    pub custom_markdown_extensions: Vec<String>,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            respect_gitignore: true,
            include_hidden: false,
            max_depth: None,
            custom_source_extensions: vec![],
            custom_markdown_extensions: vec![],
        }
    }
}

impl DiscoveryConfig {
    /// Create a new configuration with default values
    pub fn new() -> Self {
        Self::default()
    }

    /// Set whether to respect .gitignore files
    pub fn respect_gitignore(mut self, value: bool) -> Self {
        self.respect_gitignore = value;
        self
    }

    /// Set whether to include hidden files
    pub fn include_hidden(mut self, value: bool) -> Self {
        self.include_hidden = value;
        self
    }

    /// Set maximum traversal depth
    pub fn max_depth(mut self, depth: usize) -> Self {
        self.max_depth = Some(depth);
        self
    }

    /// Add custom source file extensions
    pub fn add_source_extension(mut self, ext: impl Into<String>) -> Self {
        self.custom_source_extensions.push(ext.into());
        self
    }

    /// Add custom markdown file extensions
    pub fn add_markdown_extension(mut self, ext: impl Into<String>) -> Self {
        self.custom_markdown_extensions.push(ext.into());
        self
    }
}

/// File discovery iterator for traversing a codebase
pub struct FileCollector {
    walker: Walk,
    config: DiscoveryConfig,
    stats: DiscoveryStats,
}

/// Statistics collected during file discovery
#[derive(Debug, Clone, Default)]
pub struct DiscoveryStats {
    pub markdown_files: usize,
    pub source_files: usize,
    pub errors: usize,
    pub skipped_dirs: usize,
}

/// Result of a file discovery operation
#[derive(Debug, Clone)]
pub struct DiscoveryResult {
    /// Paths to discovered markdown files
    pub markdown_files: Vec<PathBuf>,
    /// Paths to discovered source files
    pub source_files: Vec<PathBuf>,
    /// Statistics about the discovery operation
    pub stats: DiscoveryStats,
}

impl FileCollector {
    /// Create a new file collector with default configuration
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self::with_config(root, DiscoveryConfig::default())
    }

    /// Create a new file collector with custom configuration
    pub fn with_config(root: impl Into<PathBuf>, config: DiscoveryConfig) -> Self {
        let mut builder = WalkBuilder::new(root.into());

        builder
            .hidden(!config.include_hidden)
            .git_ignore(config.respect_gitignore)
            .git_global(config.respect_gitignore)
            .git_exclude(config.respect_gitignore);

        if let Some(depth) = config.max_depth {
            builder.max_depth(Some(depth));
        }

        let walker = builder.build();

        Self {
            walker,
            config,
            stats: DiscoveryStats::default(),
        }
    }

    /// Get the current discovery statistics
    pub fn stats(&self) -> &DiscoveryStats {
        &self.stats
    }

    /// Check if a file extension is a source file
    fn is_source_extension(&self, ext: &str) -> bool {
        matches!(ext, "ts" | "tsx" | "js" | "jsx" | "mts" | "cts" | "mjs" | "cjs")
            || self.config.custom_source_extensions.iter().any(|e| e == ext)
    }

    /// Check if a file extension is a markdown file
    fn is_markdown_extension(&self, ext: &str) -> bool {
        matches!(ext, "md" | "mdx")
            || self.config.custom_markdown_extensions.iter().any(|e| e == ext)
    }
}

/// Implementing Iterator allows us to use `for file in collector { ... }`
impl Iterator for FileCollector {
    type Item = DiscoveredFile;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(result) = self.walker.next() {
            match result {
                Ok(entry) => {
                    let path = entry.path();

                    // Skip directories
                    if path.is_dir() {
                        self.stats.skipped_dirs += 1;
                        continue;
                    }

                    // Get file extension
                    let extension = match path.extension().and_then(OsStr::to_str) {
                        Some(ext) => ext,
                        None => continue,
                    };

                    // Classify and return the file
                    if self.is_markdown_extension(extension) {
                        self.stats.markdown_files += 1;
                        return Some(DiscoveredFile::Markdown(path.to_path_buf()));
                    } else if self.is_source_extension(extension) {
                        self.stats.source_files += 1;
                        return Some(DiscoveredFile::Source(path.to_path_buf()));
                    }
                }
                Err(err) => {
                    eprintln!("Discovery error: {}", err);
                    self.stats.errors += 1;
                    continue;
                }
            }
        }
        None
    }
}

/// Discover all files in a directory tree
///
/// This is a convenience function that collects all discovered files into vectors.
/// For more control over the discovery process, use `FileCollector` directly.
///
/// # Arguments
/// * `root` - The root directory to scan
/// * `config` - Configuration options for the discovery
///
/// # Example
/// ```
/// use doctype_core::discovery::{discover_files, DiscoveryConfig};
///
/// let config = DiscoveryConfig::new()
///     .respect_gitignore(true)
///     .max_depth(5);
///
/// let result = discover_files("./src", config);
/// println!("Found {} markdown files", result.markdown_files.len());
/// println!("Found {} source files", result.source_files.len());
/// ```
pub fn discover_files(root: impl Into<PathBuf>, config: DiscoveryConfig) -> DiscoveryResult {
    let mut collector = FileCollector::with_config(root, config);
    let mut markdown_files = Vec::new();
    let mut source_files = Vec::new();

    for file in &mut collector {
        match file {
            DiscoveredFile::Markdown(path) => markdown_files.push(path),
            DiscoveredFile::Source(path) => source_files.push(path),
        }
    }

    DiscoveryResult {
        markdown_files,
        source_files,
        stats: collector.stats().clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_discovery_config_builder() {
        let config = DiscoveryConfig::new()
            .respect_gitignore(false)
            .include_hidden(true)
            .max_depth(5)
            .add_source_extension("vue")
            .add_markdown_extension("rst");

        assert!(!config.respect_gitignore);
        assert!(config.include_hidden);
        assert_eq!(config.max_depth, Some(5));
        assert!(config.custom_source_extensions.contains(&"vue".to_string()));
    }

    #[test]
    fn test_discovered_file_methods() {
        let md_file = DiscoveredFile::Markdown(PathBuf::from("test.md"));
        assert!(md_file.is_markdown());
        assert!(!md_file.is_source());

        let ts_file = DiscoveredFile::Source(PathBuf::from("test.ts"));
        assert!(!ts_file.is_markdown());
        assert!(ts_file.is_source());
    }

    #[test]
    fn test_discover_files_function() {
        let config = DiscoveryConfig::new();
        let result = discover_files(".", config);

        // We should find at least this Rust file
        assert!(result.source_files.len() > 0 || result.markdown_files.len() > 0);
    }
}