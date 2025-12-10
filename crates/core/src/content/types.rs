//! Content module type definitions
//!
//! This module contains data structures used throughout the content module
//! for markdown processing, anchor management, and file discovery.

use std::collections::HashMap;
use std::path::PathBuf;

// ============================================================================
// Anchor Types
// ============================================================================

/// Represents a Sintesi anchor found in a Markdown file
///
/// Sintesi anchors are defined using HTML comments that mark sections
/// of documentation tied to specific code symbols.
///
/// # Format
/// ```markdown
/// <!-- sintesi:start id="uuid" code_ref="src/file.ts#SymbolName" -->
/// Documentation content goes here...
/// <!-- sintesi:end id="uuid" -->
/// ```
#[derive(Debug, Clone)]
pub struct SintesiAnchor {
    /// Unique identifier for this anchor (UUID)
    pub id: String,

    /// Code reference (e.g., "src/auth.ts#login")
    /// Format: "file_path#symbol_name"
    pub code_ref: Option<String>,

    /// File path where this anchor was found
    pub file_path: PathBuf,

    /// Start line number in the markdown file (0-indexed)
    /// Note: Compatible with TypeScript implementation
    pub start_line: usize,

    /// End line number in the markdown file (0-indexed)
    /// Note: Compatible with TypeScript implementation
    pub end_line: usize,

    /// Content between the start and end tags
    /// This is the actual documentation text
    pub content: String,
}

impl SintesiAnchor {
    /// Get the symbol name from the code_ref if present
    ///
    /// # Example
    /// ```rust,ignore
    /// let anchor = SintesiAnchor {
    ///     code_ref: Some("src/auth.ts#login".to_string()),
    ///     // ... other fields
    /// };
    /// assert_eq!(anchor.symbol_name(), Some("login"));
    /// ```
    pub fn symbol_name(&self) -> Option<&str> {
        self.code_ref
            .as_ref()
            .and_then(|cr| cr.split('#').nth(1))
    }

    /// Get the file path from the code_ref if present
    ///
    /// # Example
    /// ```rust,ignore
    /// let anchor = SintesiAnchor {
    ///     code_ref: Some("src/auth.ts#login".to_string()),
    ///     // ... other fields
    /// };
    /// assert_eq!(anchor.code_file_path(), Some("src/auth.ts"));
    /// ```
    pub fn code_file_path(&self) -> Option<&str> {
        self.code_ref
            .as_ref()
            .and_then(|cr| cr.split('#').next())
    }

    /// Get the span (number of lines) covered by this anchor
    pub fn line_span(&self) -> usize {
        if self.end_line >= self.start_line {
            self.end_line - self.start_line + 1
        } else {
            0
        }
    }

    /// Check if the anchor has content
    pub fn is_empty(&self) -> bool {
        self.content.trim().is_empty()
    }
}

/// Map of anchor IDs to their complete anchor information
///
/// This is the primary data structure returned by the markdown extractor.
/// It maps unique anchor IDs to their full anchor details.
///
/// # Example
/// ```rust,ignore
/// use sintesi_core::content::{AnchorMap, extract_anchors};
///
/// let content = std::fs::read_to_string("docs/api.md")?;
/// let result = extract_anchors("docs/api.md", &content);
/// let anchors: AnchorMap = result.anchors;
///
/// for (id, anchor) in anchors {
///     println!("Anchor {}: {} lines at {}",
///         id,
///         anchor.line_span(),
///         anchor.file_path.display()
///     );
/// }
/// ```
pub type AnchorMap = HashMap<String, SintesiAnchor>;

// ============================================================================
// Extraction Result Types
// ============================================================================

/// Result of a markdown extraction operation
///
/// Contains all anchors found in a markdown file along with statistics
/// and any errors encountered during parsing.
#[derive(Debug, Clone)]
pub struct ExtractionResult {
    /// All anchors found in the file, indexed by their ID
    pub anchors: AnchorMap,

    /// Number of anchors successfully extracted
    pub anchor_count: usize,

    /// Errors encountered during parsing
    /// These might include:
    /// - Mismatched anchor IDs
    /// - Unclosed anchors
    /// - Malformed anchor tags
    pub errors: Vec<String>,
}

impl ExtractionResult {
    /// Check if the extraction was successful (no errors)
    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }

    /// Check if there were any errors
    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    /// Get a summary of the extraction
    pub fn summary(&self) -> String {
        if self.is_ok() {
            format!("✓ Found {} anchor(s)", self.anchor_count)
        } else {
            format!(
                "⚠ Found {} anchor(s) with {} error(s)",
                self.anchor_count,
                self.errors.len()
            )
        }
    }

    /// Get the first error if any
    pub fn first_error(&self) -> Option<&str> {
        self.errors.first().map(|s| s.as_str())
    }
}

impl Default for ExtractionResult {
    fn default() -> Self {
        Self {
            anchors: HashMap::new(),
            anchor_count: 0,
            errors: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_anchor_symbol_name() {
        let anchor = SintesiAnchor {
            id: "test".to_string(),
            code_ref: Some("src/auth.ts#login".to_string()),
            file_path: PathBuf::from("test.md"),
            start_line: 1,
            end_line: 10,
            content: "Test content".to_string(),
        };

        assert_eq!(anchor.symbol_name(), Some("login"));
        assert_eq!(anchor.code_file_path(), Some("src/auth.ts"));
    }

    #[test]
    fn test_anchor_line_span() {
        let anchor = SintesiAnchor {
            id: "test".to_string(),
            code_ref: None,
            file_path: PathBuf::from("test.md"),
            start_line: 5,
            end_line: 15,
            content: "Test".to_string(),
        };

        assert_eq!(anchor.line_span(), 11);
    }

    #[test]
    fn test_anchor_is_empty() {
        let empty_anchor = SintesiAnchor {
            id: "test".to_string(),
            code_ref: None,
            file_path: PathBuf::from("test.md"),
            start_line: 1,
            end_line: 2,
            content: "   \n  ".to_string(),
        };

        assert!(empty_anchor.is_empty());

        let non_empty = SintesiAnchor {
            content: "Some content".to_string(),
            ..empty_anchor
        };

        assert!(!non_empty.is_empty());
    }

    #[test]
    fn test_extraction_result_summary() {
        let ok_result = ExtractionResult {
            anchors: HashMap::new(),
            anchor_count: 5,
            errors: vec![],
        };

        assert!(ok_result.is_ok());
        assert_eq!(ok_result.summary(), "✓ Found 5 anchor(s)");

        let error_result = ExtractionResult {
            anchors: HashMap::new(),
            anchor_count: 3,
            errors: vec!["Error 1".to_string(), "Error 2".to_string()],
        };

        assert!(error_result.has_errors());
        assert_eq!(error_result.summary(), "⚠ Found 3 anchor(s) with 2 error(s)");
    }
}
