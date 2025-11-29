import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

/**
 * Options for anchor insertion
 */
export interface AnchorInsertionOptions {
  /** Whether to create API Reference section if it doesn't exist */
  createSection?: boolean;
  /** Custom section title (defaults to "API Reference") */
  sectionTitle?: string;
  /** Placeholder text for empty anchor content */
  placeholder?: string;
}

/**
 * Result of anchor insertion
 */
export interface AnchorInsertionResult {
  /** Whether the insertion was successful */
  success: boolean;
  /** Updated markdown content */
  content: string;
  /** Generated anchor ID */
  anchorId: string;
  /** Line numbers where anchor was inserted */
  location: {
    startLine: number;
    endLine: number;
  };
  /** Error message if insertion failed */
  error?: string;
}

/**
 * Inserts doctype anchors into markdown files
 *
 * This class handles the creation of new anchor tags in markdown files,
 * complementing the ContentInjector which modifies content within existing anchors.
 */
export class MarkdownAnchorInserter {
  /**
   * Insert a new anchor into a markdown file
   * @param filePath Path to the markdown file
   * @param codeRef Code reference (format: "file_path#symbol_name")
   * @param options Insertion options
   * @param writeToFile If true, writes changes to file. If false, only returns updated content
   * @returns AnchorInsertionResult with success status and updated content
   */
  public insertIntoFile(
    filePath: string,
    codeRef: string,
    options: AnchorInsertionOptions = {},
    writeToFile: boolean = true
  ): AnchorInsertionResult {
    try {
      let content = '';

      // Read existing file or create new content
      if (existsSync(filePath)) {
        content = readFileSync(filePath, 'utf-8');
      } else {
        // Create basic markdown structure
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Documentation';
        content = `# ${fileName}\n\n`;
      }

      const result = this.insertIntoContent(content, codeRef, options);

      if (result.success && writeToFile) {
        writeFileSync(filePath, result.content, 'utf-8');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        content: '',
        anchorId: '',
        location: { startLine: 0, endLine: 0 },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Insert a new anchor into markdown content
   * @param content Original markdown content
   * @param codeRef Code reference (format: "file_path#symbol_name")
   * @param options Insertion options
   * @returns AnchorInsertionResult with success status and updated content
   */
  public insertIntoContent(
    content: string,
    codeRef: string,
    options: AnchorInsertionOptions = {}
  ): AnchorInsertionResult {
    const {
      createSection = true,
      sectionTitle = 'API Reference',
      placeholder = 'TODO: Document this symbol',
    } = options;

    // Validate codeRef format
    if (!codeRef.includes('#')) {
      return {
        success: false,
        content,
        anchorId: '',
        location: { startLine: 0, endLine: 0 },
        error: `Invalid code_ref format: "${codeRef}". Expected "file_path#symbol_name"`,
      };
    }

    const anchorId = randomUUID();
    const [, symbolName] = codeRef.split('#');
    const lines = content.split('\n');

    // Find or create the API Reference section
    let insertionPoint = -1;
    const apiRefPattern = new RegExp(`^#+\\s*${sectionTitle}\\s*$`, 'i');

    for (let i = 0; i < lines.length; i++) {
      if (apiRefPattern.test(lines[i])) {
        // Found API Reference section, insert after it
        insertionPoint = i + 1;
        break;
      }
    }

    // If section not found and createSection is true, add it at the end
    if (insertionPoint === -1 && createSection) {
      // Add section at the end with proper spacing
      const needsNewline = lines.length > 0 && lines[lines.length - 1].trim() !== '';
      if (needsNewline) {
        lines.push('');
      }
      lines.push(`## ${sectionTitle}`);
      lines.push('');
      insertionPoint = lines.length;
    }

    if (insertionPoint === -1) {
      return {
        success: false,
        content,
        anchorId: '',
        location: { startLine: 0, endLine: 0 },
        error: `Section "${sectionTitle}" not found and createSection is false`,
      };
    }

    // Create anchor content
    const anchorLines = [
      '',
      `### ${symbolName}`,
      '',
      `<!-- doctype:start id="${anchorId}" code_ref="${codeRef}" -->`,
      `<!-- ${placeholder} -->`,
      `<!-- doctype:end id="${anchorId}" -->`,
      '',
    ];

    // Calculate line numbers (accounting for array index vs line number)
    const startLine = insertionPoint + 3; // The actual doctype:start line
    const endLine = insertionPoint + 5;   // The actual doctype:end line

    // Insert the anchor
    lines.splice(insertionPoint, 0, ...anchorLines);

    return {
      success: true,
      content: lines.join('\n'),
      anchorId,
      location: { startLine, endLine },
    };
  }

  /**
   * Insert multiple anchors into a markdown file
   * @param filePath Path to the markdown file
   * @param codeRefs Array of code references
   * @param options Insertion options
   * @param writeToFile If true, writes changes to file
   * @returns Array of AnchorInsertionResults for each code reference
   */
  public insertMultiple(
    filePath: string,
    codeRefs: string[],
    options: AnchorInsertionOptions = {},
    writeToFile: boolean = true
  ): AnchorInsertionResult[] {
    try {
      let content = '';

      // Read existing file or create new content
      if (existsSync(filePath)) {
        content = readFileSync(filePath, 'utf-8');
      } else {
        // Create basic markdown structure
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Documentation';
        content = `# ${fileName}\n\n`;
      }

      const results: AnchorInsertionResult[] = [];

      // Apply insertions one by one
      for (const codeRef of codeRefs) {
        const result = this.insertIntoContent(content, codeRef, options);
        results.push(result);

        if (result.success) {
          content = result.content;
        }
      }

      // Write final result if all succeeded
      const allSucceeded = results.every((r) => r.success);
      if (allSucceeded && writeToFile) {
        writeFileSync(filePath, content, 'utf-8');
      }

      return results;
    } catch (error) {
      return [
        {
          success: false,
          content: '',
          anchorId: '',
          location: { startLine: 0, endLine: 0 },
          error: error instanceof Error ? error.message : String(error),
        },
      ];
    }
  }

  /**
   * Check if a code reference already has an anchor in the markdown
   * @param content Markdown content
   * @param codeRef Code reference to check
   * @returns True if anchor exists, false otherwise
   */
  public hasAnchor(content: string, codeRef: string): boolean {
    const pattern = new RegExp(`<!--\\s*doctype:start\\s+id="[^"]+"\\s+code_ref="${this.escapeRegex(codeRef)}"\\s*-->`);
    return pattern.test(content);
  }

  /**
   * Get all code references that already have anchors in the markdown
   * @param content Markdown content
   * @returns Array of code references
   */
  public getExistingCodeRefs(content: string): string[] {
    const pattern = /<!--\s*doctype:start\s+id="[^"]+"\s+code_ref="([^"]+)"\s*-->/g;
    const matches = content.matchAll(pattern);
    return Array.from(matches, (m) => m[1]);
  }

  /**
   * Escape special regex characters in a string
   * @param str String to escape
   * @returns Escaped string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
