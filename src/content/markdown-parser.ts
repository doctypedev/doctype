import { readFileSync } from 'fs';

/**
 * Represents a doctype anchor found in markdown
 */
export interface DoctypeAnchor {
  /** Unique ID from the HTML comment */
  id: string;
  /** Line number where the anchor starts (0-indexed) */
  startLine: number;
  /** Line number where the anchor ends (0-indexed) */
  endLine: number;
  /** Content between the anchor tags */
  content: string;
  /** Code reference from the anchor tag (format: file_path#symbol_name) */
  codeRef: string;
}

/**
 * Parses Markdown files and extracts doctype anchors
 *
 * Anchor format:
 * <!-- doctype:start id="uuid" code_ref="path/to/file.ts#symbolName" -->
 * Content here will be managed by Doctype
 * <!-- doctype:end id="uuid" -->
 */
export class MarkdownParser {
  /**
   * Parse a markdown file and extract all doctype anchors
   * @param filePath Path to the markdown file
   * @returns Array of doctype anchors found in the file
   */
  public parseFile(filePath: string): DoctypeAnchor[] {
    const content = readFileSync(filePath, 'utf-8');
    return this.parseContent(content);
  }

  /**
   * Parse markdown content and extract all doctype anchors
   * @param content Markdown content as string
   * @returns Array of doctype anchors found in the content
   */
  public parseContent(content: string): DoctypeAnchor[] {
    const lines = content.split('\n');
    const anchors: DoctypeAnchor[] = [];
    const anchorStack: Map<string, { startLine: number; codeRef: string }> = new Map();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match start anchor: <!-- doctype:start id="uuid" code_ref="path/file.ts#symbolName" -->
      const startMatch = line.match(/<!--\s*doctype:start\s+id="([^"]+)"\s+code_ref="([^"]+)"\s*-->/);
      if (startMatch) {
        const [, id, codeRef] = startMatch;
        anchorStack.set(id, { startLine: i, codeRef });
        continue;
      }

      // Match end anchor: <!-- doctype:end id="uuid" -->
      const endMatch = line.match(/<!--\s*doctype:end\s+id="([^"]+)"\s*-->/);
      if (endMatch) {
        const [, id] = endMatch;
        const start = anchorStack.get(id);

        if (!start) {
          throw new Error(`Found doctype:end without matching doctype:start for id="${id}" at line ${i + 1}`);
        }

        // Extract content between anchors (excluding the anchor lines themselves)
        const contentLines = lines.slice(start.startLine + 1, i);
        const content = contentLines.join('\n');

        anchors.push({
          id,
          startLine: start.startLine,
          endLine: i,
          content: content,
          codeRef: start.codeRef,
        });

        anchorStack.delete(id);
      }
    }

    // Check for unclosed anchors
    if (anchorStack.size > 0) {
      const unclosedIds = Array.from(anchorStack.keys()).join(', ');
      throw new Error(`Found unclosed doctype anchors: ${unclosedIds}`);
    }

    return anchors;
  }

  /**
   * Validates anchor format and returns parsing errors if any
   * @param content Markdown content to validate
   * @returns Array of validation errors, empty if valid
   */
  public validate(content: string): string[] {
    const errors: string[] = [];
    const lines = content.split('\n');
    const seenIds = new Set<string>();
    const anchorStack = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for start anchor
      const startMatch = line.match(/<!--\s*doctype:start\s+id="([^"]+)"\s+code_ref="([^"]+)"\s*-->/);
      if (startMatch) {
        const [, id, codeRef] = startMatch;

        // Check for duplicate IDs
        if (seenIds.has(id)) {
          errors.push(`Duplicate anchor id="${id}" at line ${i + 1}`);
        }
        seenIds.add(id);

        // Check if already open
        if (anchorStack.has(id)) {
          errors.push(`Nested anchor with same id="${id}" at line ${i + 1}`);
        }
        anchorStack.set(id, i);

        // Validate code_ref format
        if (!codeRef.includes('#')) {
          errors.push(`Invalid code_ref format at line ${i + 1}: expected "file_path#symbol_name", got "${codeRef}"`);
        }
        continue;
      }

      // Check for end anchor
      const endMatch = line.match(/<!--\s*doctype:end\s+id="([^"]+)"\s*-->/);
      if (endMatch) {
        const [, id] = endMatch;

        if (!anchorStack.has(id)) {
          errors.push(`Found doctype:end without matching doctype:start for id="${id}" at line ${i + 1}`);
        } else {
          anchorStack.delete(id);
        }
      }
    }

    // Check for unclosed anchors
    if (anchorStack.size > 0) {
      for (const [id, lineNum] of anchorStack.entries()) {
        errors.push(`Unclosed anchor id="${id}" started at line ${lineNum + 1}`);
      }
    }

    return errors;
  }

  /**
   * Parse the code_ref field into file path and symbol name
   * @param codeRef Code reference string (format: "file_path#symbol_name")
   * @returns Object with filePath and symbolName
   */
  public parseCodeRef(codeRef: string): { filePath: string; symbolName: string } {
    const [filePath, symbolName] = codeRef.split('#');

    if (!filePath || !symbolName) {
      throw new Error(`Invalid code_ref format: "${codeRef}". Expected format: "file_path#symbol_name"`);
    }

    return { filePath, symbolName };
  }
}
