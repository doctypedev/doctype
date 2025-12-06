/**
 * Utilities for sanitizing AI-generated content
 *
 * This module ensures that AI-generated documentation content is safe
 * for injection into markdown files and doesn't corrupt anchor tags
 */

/**
 * Sanitize AI-generated content to prevent anchor corruption and ensure consistency
 *
 * @param content Raw content from AI provider
 * @returns Sanitized content safe for injection between doctype anchors
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;

  // 1. Convert any accidental markdown headers to bold text
  // This preserves document structure where headers are not allowed
  // e.g. "## Usage" -> "**Usage**"
  sanitized = sanitized.replace(/^#+\s+(.*)$/gm, '**$1**');

  // 2. Remove any HTML comments from the content
  // This is critical to prevent AI from accidentally generating
  // doctype anchor tags (<!-- doctype:start --> or <!-- doctype:end -->)
  // which would corrupt the anchor boundaries
  //
  // KNOWN LIMITATION: This regex is intentionally aggressive and will remove
  // HTML comments even inside markdown code blocks (e.g., ```html <!-- comment --> ```).
  // This is acceptable because anchor integrity is our top priority.
  // Future improvement: (Issue #29) Parse markdown AST to preserve comments in code blocks.
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Remove JSON artifacts that might appear from structured generation
  // e.g. "}},{" or other object separators that leak into the output
  sanitized = sanitized.replace(/^\s*}.*?{.*$/gm, '');
  sanitized = sanitized.replace(/^[},\s]*$/gm, '');

  // 4. Clean up excessive newlines (more than 2 consecutive)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // 5. Trim leading/trailing whitespace for consistency
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate that sanitized content doesn't contain problematic patterns
 *
 * @param content Content to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateSanitizedContent(content: string): string[] {
  const errors: string[] = [];

  // Check for HTML comments (should have been removed)
  if (content.includes('<!--')) {
    errors.push('Content contains HTML comments after sanitization');
  }

  // Check for doctype anchor patterns
  if (content.includes('doctype:start') || content.includes('doctype:end')) {
    errors.push('Content contains doctype anchor references');
  }

  // Check for markdown headers (should have been converted)
  const headerMatch = content.match(/^#+\s+/gm);
  if (headerMatch) {
    errors.push(`Content contains ${headerMatch.length} markdown header(s) after sanitization`);
  }

  return errors;
}
