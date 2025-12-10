//! Markdown anchor extraction module
//!
//! This module processes Markdown files to extract Doctype anchor tags using
//! pulldown-cmark, a proper Markdown parser that understands the document structure.
//!
//! ## Anchor Format
//!
//! Doctype anchors are defined using HTML comments in markdown:
//!
//! ```markdown
//! <!-- doctype:start id="uuid" code_ref="src/file.ts#SymbolName" -->
//! Documentation content goes here...
//! <!-- doctype:end id="uuid" -->
//! ```
//!
//! ## Implementation Notes
//!
//! This implementation uses pulldown-cmark's event-based parser:
//! - Understands Markdown structure (avoids false positives in code blocks)
//! - Line numbers are 0-indexed for TypeScript compatibility
//! - Content extraction excludes anchor lines
//! - Comprehensive validation (duplicate IDs, nested anchors, code_ref format)

use pulldown_cmark::{Event, Parser};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::path::Path;

// Import types from the content/types module
use super::types::{DoctypeAnchor, ExtractionResult};

/// Markdown extractor that finds Doctype anchors using pulldown-cmark
pub struct MarkdownExtractor {
    // No regex needed - we parse proper Markdown AST
}

impl MarkdownExtractor {
    /// Create a new markdown extractor
    pub fn new() -> Self {
        Self {}
    }

    /// Extract anchors from a markdown file
    ///
    /// # Arguments
    /// * `file_path` - Path to the markdown file
    /// * `content` - Content of the markdown file
    ///
    /// # Returns
    /// ExtractionResult containing all found anchors and any errors
    pub fn extract_from_file(&self, file_path: impl AsRef<Path>, content: &str) -> ExtractionResult {
        let file_path = file_path.as_ref();

        // Build line map for byte offset -> line number conversion
        let line_map = build_line_map(content);

        let mut anchors = HashMap::new();
        let mut errors = Vec::new();
        let mut anchor_stack: HashMap<String, AnchorInProgress> = HashMap::new();
        let mut seen_ids = HashSet::new();

        // Parse markdown into events with byte offsets
        let parser = Parser::new(content).into_offset_iter();

        for (event, range) in parser {
            // We only care about HTML events (comments)
            if let Event::Html(html) = event {
                let html_str = html.as_ref();

                // Check if this is a sintesi:start comment
                if let Some((id, code_ref)) = parse_sintesi_start(html_str) {
                    let line_num = byte_offset_to_line(&line_map, range.start);

                    // Validation: Check for duplicate IDs
                    if seen_ids.contains(&id) {
                        errors.push(format!(
                            "Duplicate anchor id=\"{}\" at line {}",
                            id,
                            line_num + 1
                        ));
                    }
                    seen_ids.insert(id.clone());

                    // Validation: Check for nested anchors with same ID
                    if anchor_stack.contains_key(&id) {
                        errors.push(format!(
                            "Nested anchor with same id=\"{}\" at line {}",
                            id,
                            line_num + 1
                        ));
                    }

                    // Validation: Check code_ref format
                    if !code_ref.contains('#') {
                        errors.push(format!(
                            "Invalid code_ref format at line {}: expected \"file_path#symbol_name\", got \"{}\"",
                            line_num + 1,
                            code_ref
                        ));
                    }

                    anchor_stack.insert(
                        id,
                        AnchorInProgress {
                            start_line: line_num,
                            start_offset: range.end, // Content starts after this comment
                            code_ref,
                        },
                    );
                }
                // Check if this is a doctype:end comment
                else if let Some(id) = parse_doctype_end(html_str) {
                    let line_num = byte_offset_to_line(&line_map, range.start);

                    match anchor_stack.remove(&id) {
                        Some(start_info) => {
                            // Extract content between anchors (by byte offset)
                            let content_str = content[start_info.start_offset..range.start].trim();

                            let anchor = DoctypeAnchor {
                                id: id.clone(),
                                code_ref: Some(start_info.code_ref),
                                file_path: file_path.to_path_buf(),
                                start_line: start_info.start_line,
                                end_line: line_num,
                                // Normalize line endings for cross-platform compatibility
                                // This ensures hash consistency between Windows (\r\n) and Unix (\n)
                                content: content_str.replace("\r\n", "\n"),
                            };

                            anchors.insert(id, anchor);
                        }
                        None => {
                            errors.push(format!(
                                "Found doctype:end without matching doctype:start for id=\"{}\" at line {}",
                                id,
                                line_num + 1
                            ));
                        }
                    }
                }
            }
        }

        // Check for unclosed anchors
        if !anchor_stack.is_empty() {
            for (id, start_info) in anchor_stack {
                errors.push(format!(
                    "Unclosed anchor id=\"{}\" started at line {}",
                    id,
                    start_info.start_line + 1
                ));
            }
        }

        ExtractionResult {
            anchor_count: anchors.len(),
            anchors,
            errors,
        }
    }

    /// Validate markdown content without building anchors
    ///
    /// This method performs all validation checks without extracting content,
    /// making it useful for quick validation passes.
    pub fn validate(&self, content: &str) -> Vec<String> {
        let line_map = build_line_map(content);
        let mut errors = Vec::new();
        let mut seen_ids = HashSet::new();
        let mut anchor_stack: HashMap<String, usize> = HashMap::new();

        let parser = Parser::new(content).into_offset_iter();

        for (event, range) in parser {
            if let Event::Html(html) = event {
                let html_str = html.as_ref();
                let line_num = byte_offset_to_line(&line_map, range.start);

                // Check for doctype:start
                if let Some((id, code_ref)) = parse_doctype_start(html_str) {
                    // Check for duplicate IDs
                    if seen_ids.contains(&id) {
                        errors.push(format!(
                            "Duplicate anchor id=\"{}\" at line {}",
                            id,
                            line_num + 1
                        ));
                    }
                    seen_ids.insert(id.clone());

                    // Check if already open
                    if anchor_stack.contains_key(&id) {
                        errors.push(format!(
                            "Nested anchor with same id=\"{}\" at line {}",
                            id,
                            line_num + 1
                        ));
                    }
                    anchor_stack.insert(id.clone(), line_num);

                    // Validate code_ref format
                    if !code_ref.contains('#') {
                        errors.push(format!(
                            "Invalid code_ref format at line {}: expected \"file_path#symbol_name\", got \"{}\"",
                            line_num + 1,
                            code_ref
                        ));
                    }
                }
                // Check for doctype:end
                else if let Some(id) = parse_doctype_end(html_str) {
                    if !anchor_stack.contains_key(&id) {
                        errors.push(format!(
                            "Found doctype:end without matching doctype:start for id=\"{}\" at line {}",
                            id,
                            line_num + 1
                        ));
                    } else {
                        anchor_stack.remove(&id);
                    }
                }
            }
        }

        // Check for unclosed anchors
        for (id, line_num) in anchor_stack {
            errors.push(format!(
                "Unclosed anchor id=\"{}\" started at line {}",
                id,
                line_num + 1
            ));
        }

        errors
    }

    /// Parse the code_ref field into file path and symbol name
    pub fn parse_code_ref(&self, code_ref: &str) -> Result<(String, String), String> {
        let parts: Vec<&str> = code_ref.split('#').collect();

        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
            return Err(format!(
                "Invalid code_ref format: \"{}\". Expected format: \"file_path#symbol_name\"",
                code_ref
            ));
        }

        Ok((parts[0].to_string(), parts[1].to_string()))
    }
}

impl Default for MarkdownExtractor {
    fn default() -> Self {
        Self::new()
    }
}

/// Internal structure to track an anchor being parsed
#[derive(Debug)]
struct AnchorInProgress {
    start_line: usize,
    start_offset: usize, // Byte offset where content starts
    code_ref: String,
}

/// Build a map of byte offsets to line numbers (0-indexed)
fn build_line_map(content: &str) -> Vec<usize> {
    let mut line_starts = vec![0];

    for (idx, ch) in content.char_indices() {
        if ch == '\n' {
            line_starts.push(idx + 1);
        }
    }

    line_starts
}

/// Convert a byte offset to a line number (0-indexed)
fn byte_offset_to_line(line_map: &[usize], offset: usize) -> usize {
    // Binary search for the line containing this offset
    match line_map.binary_search(&offset) {
        Ok(line) => line,
        Err(line) => line.saturating_sub(1),
    }
}

/// Parse a doctype:start HTML comment
/// Returns (id, code_ref) if valid
fn parse_doctype_start(html: &str) -> Option<(String, String)> {
    // Look for: <!-- doctype:start id="..." code_ref="..." -->
    let html = html.trim();

    if !html.starts_with("<!--") || !html.ends_with("-->") {
        return None;
    }

    let inner = html.trim_start_matches("<!--").trim_end_matches("-->").trim();

    if !inner.starts_with("doctype:start") {
        return None;
    }

    // Extract id="..." and code_ref="..."
    let id = extract_attribute(inner, "id")?;
    let code_ref = extract_attribute(inner, "code_ref")?;

    Some((id, code_ref))
}

/// Parse a doctype:end HTML comment
/// Returns id if valid
fn parse_doctype_end(html: &str) -> Option<String> {
    // Look for: <!-- doctype:end id="..." -->
    let html = html.trim();

    if !html.starts_with("<!--") || !html.ends_with("-->") {
        return None;
    }

    let inner = html.trim_start_matches("<!--").trim_end_matches("-->").trim();

    if !inner.starts_with("doctype:end") {
        return None;
    }

    extract_attribute(inner, "id")
}

/// Extract an attribute value from an HTML comment
/// e.g., extract_attribute('doctype:start id="foo" code_ref="bar"', "id") -> Some("foo")
///
/// This parser is tolerant of:
/// - Spaces around the equals sign: id = "foo"
/// - Single quotes: id='foo'
/// - Double quotes: id="foo"
fn extract_attribute(text: &str, attr_name: &str) -> Option<String> {
    // Regex pattern that matches:
    // - attr_name followed by optional whitespace
    // - equals sign with optional whitespace
    // - either single or double quotes
    // - capture group for the value
    // - matching closing quote
    let pattern = format!(r#"{}\s*=\s*["']([^"']+)["']"#, regex::escape(attr_name));
    let re = Regex::new(&pattern).ok()?;

    re.captures(text)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str().to_string())
}

/// Convenience function to extract anchors from a markdown file
pub fn extract_anchors(file_path: impl AsRef<Path>, content: &str) -> ExtractionResult {
    let extractor = MarkdownExtractor::new();
    extractor.extract_from_file(file_path, content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_simple_anchor() {
        let markdown = r#"# API Documentation

<!-- doctype:start id="abc-123" code_ref="src/api.ts#fetchUser" -->
This function fetches a user from the API.
<!-- doctype:end id="abc-123" -->

More content here.
"#;

        let result = extract_anchors("test.md", markdown);

        assert_eq!(result.anchor_count, 1);
        assert!(result.errors.is_empty(), "Expected no errors, got: {:?}", result.errors);

        let anchor = result.anchors.get("abc-123").unwrap();
        assert_eq!(anchor.id, "abc-123");
        assert_eq!(anchor.code_ref.as_deref(), Some("src/api.ts#fetchUser"));
        assert_eq!(anchor.content.trim(), "This function fetches a user from the API.");
        // Line numbers are 0-indexed
        assert_eq!(anchor.start_line, 2);
        assert_eq!(anchor.end_line, 4);
    }

    #[test]
    fn test_extract_multiple_anchors() {
        let markdown = r#"
<!-- doctype:start id="anchor-1" code_ref="file.ts#symbol1" -->
First anchor content.
<!-- doctype:end id="anchor-1" -->

<!-- doctype:start id="anchor-2" code_ref="file.ts#symbol2" -->
Second anchor content.
<!-- doctype:end id="anchor-2" -->
"#;

        let result = extract_anchors("test.md", markdown);

        assert_eq!(result.anchor_count, 2);
        assert!(result.anchors.contains_key("anchor-1"));
        assert!(result.anchors.contains_key("anchor-2"));
    }

    #[test]
    fn test_duplicate_id_validation() {
        let markdown = r#"
<!-- doctype:start id="same-id" code_ref="file.ts#symbol1" -->
First.
<!-- doctype:end id="same-id" -->

<!-- doctype:start id="same-id" code_ref="file.ts#symbol2" -->
Second.
<!-- doctype:end id="same-id" -->
"#;

        let result = extract_anchors("test.md", markdown);

        assert!(!result.errors.is_empty());
        assert!(result.errors.iter().any(|e| e.contains("Duplicate anchor")));
    }

    #[test]
    fn test_invalid_code_ref_format() {
        let markdown = r#"
<!-- doctype:start id="test-id" code_ref="invalid-no-hash" -->
Content.
<!-- doctype:end id="test-id" -->
"#;

        let result = extract_anchors("test.md", markdown);

        assert!(!result.errors.is_empty());
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Invalid code_ref format")));
    }

    #[test]
    fn test_mismatched_anchor_ids() {
        let markdown = r#"
<!-- doctype:start id="start-id" code_ref="file.ts#symbol" -->
Content here.
<!-- doctype:end id="different-id" -->
"#;

        let result = extract_anchors("test.md", markdown);

        assert!(!result.errors.is_empty());
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("without matching doctype:start")));
    }

    #[test]
    fn test_unclosed_anchor() {
        let markdown = r#"
<!-- doctype:start id="unclosed" code_ref="file.ts#symbol" -->
This anchor is never closed.
"#;

        let result = extract_anchors("test.md", markdown);

        assert!(!result.errors.is_empty());
        assert!(result.errors.iter().any(|e| e.contains("Unclosed anchor")));
    }

    #[test]
    fn test_validate_method() {
        let extractor = MarkdownExtractor::new();

        let valid = r#"
<!-- doctype:start id="valid" code_ref="file.ts#symbol" -->
Content.
<!-- doctype:end id="valid" -->
"#;

        let errors = extractor.validate(valid);
        assert!(errors.is_empty());

        let invalid = r#"
<!-- doctype:start id="unclosed" code_ref="file.ts#symbol" -->
Content without end.
"#;

        let errors = extractor.validate(invalid);
        assert!(!errors.is_empty());
    }

    #[test]
    fn test_parse_code_ref() {
        let extractor = MarkdownExtractor::new();

        let (path, symbol) = extractor.parse_code_ref("src/auth.ts#login").unwrap();
        assert_eq!(path, "src/auth.ts");
        assert_eq!(symbol, "login");

        assert!(extractor.parse_code_ref("invalid").is_err());
        assert!(extractor.parse_code_ref("no-symbol#").is_err());
        assert!(extractor.parse_code_ref("#no-path").is_err());
    }

    #[test]
    fn test_nested_anchor_detection() {
        let markdown = r#"
<!-- doctype:start id="outer" code_ref="file.ts#symbol1" -->
Content.
<!-- doctype:start id="outer" code_ref="file.ts#symbol2" -->
Nested with same ID!
<!-- doctype:end id="outer" -->
<!-- doctype:end id="outer" -->
"#;

        let result = extract_anchors("test.md", markdown);

        assert!(!result.errors.is_empty());
        assert!(result.errors.iter().any(|e| e.contains("Nested anchor")));
    }

    #[test]
    fn test_anchors_in_code_blocks_ignored() {
        let markdown = r#"# Documentation

Normal anchor:
<!-- doctype:start id="real" code_ref="file.ts#symbol" -->
Real content.
<!-- doctype:end id="real" -->

Code block with fake anchor:
```markdown
<!-- doctype:start id="fake" code_ref="file.ts#fake" -->
This should be ignored.
<!-- doctype:end id="fake" -->
```

End of doc.
"#;

        let result = extract_anchors("test.md", markdown);

        // Should only find the real anchor, not the one in code block
        assert_eq!(result.anchor_count, 1);
        assert!(result.anchors.contains_key("real"));
        assert!(!result.anchors.contains_key("fake"));
    }

    #[test]
    fn test_attribute_extraction() {
        // Standard double quotes
        assert_eq!(
            extract_attribute("doctype:start id=\"test-123\" code_ref=\"foo.ts#bar\"", "id"),
            Some("test-123".to_string())
        );
        assert_eq!(
            extract_attribute("doctype:start id=\"test-123\" code_ref=\"foo.ts#bar\"", "code_ref"),
            Some("foo.ts#bar".to_string())
        );
        assert_eq!(
            extract_attribute("doctype:end id=\"end-123\"", "id"),
            Some("end-123".to_string())
        );
    }

    #[test]
    fn test_attribute_extraction_flexible_syntax() {
        // Single quotes
        assert_eq!(
            extract_attribute("doctype:start id='test-123' code_ref='foo.ts#bar'", "id"),
            Some("test-123".to_string())
        );

        // Spaces around equals sign
        assert_eq!(
            extract_attribute("doctype:start id = \"test-123\" code_ref=\"foo.ts#bar\"", "id"),
            Some("test-123".to_string())
        );

        // Multiple spaces
        assert_eq!(
            extract_attribute("doctype:start id  =  \"test-123\"", "id"),
            Some("test-123".to_string())
        );

        // Mixed: single quotes with spaces
        assert_eq!(
            extract_attribute("doctype:start id = 'test-123'", "id"),
            Some("test-123".to_string())
        );
    }

    #[test]
    fn test_newline_normalization() {
        // Windows-style line endings
        let markdown_windows = "<!-- doctype:start id=\"test\" code_ref=\"file.ts#symbol\" -->\r\nLine 1\r\nLine 2\r\n<!-- doctype:end id=\"test\" -->";

        let result = extract_anchors("test.md", markdown_windows);
        let anchor = result.anchors.get("test").unwrap();

        // Content should have normalized newlines (\n only)
        assert_eq!(anchor.content, "Line 1\nLine 2");
        assert!(!anchor.content.contains("\r\n"));
    }
}
