import { readFileSync, writeFileSync } from 'fs';

/**
 * Injection result containing the updated content and metadata
 */
export interface InjectionResult {
  /** Whether the injection was successful */
  success: boolean;
  /** The updated markdown content */
  content: string;
  /** Number of lines changed */
  linesChanged: number;
  /** Error message if injection failed */
  error?: string;
}

/**
 * Injects AI-generated content into Markdown files within doctype anchors
 *
 * This class handles the safe replacement of content between anchor tags
 * while preserving the anchor comments themselves
 */
export class ContentInjector {
  /**
   * Inject new content into a markdown file at the specified anchor
   * @param filePath Path to the markdown file
   * @param anchorId ID of the anchor where content should be injected
   * @param newContent The new content to inject (should not include anchor comments)
   * @param writeToFile If true, writes changes to file. If false, only returns updated content
   * @returns InjectionResult with success status and updated content
   */
  public injectIntoFile(
    filePath: string,
    anchorId: string,
    newContent: string,
    writeToFile: boolean = true
  ): InjectionResult {
    try {
      const originalContent = readFileSync(filePath, 'utf-8');
      const result = this.injectIntoContent(originalContent, anchorId, newContent);

      if (result.success && writeToFile) {
        writeFileSync(filePath, result.content, 'utf-8');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        content: '',
        linesChanged: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Inject new content into markdown content string at the specified anchor
   * @param content Original markdown content
   * @param anchorId ID of the anchor where content should be injected
   * @param newContent The new content to inject
   * @returns InjectionResult with success status and updated content
   */
  public injectIntoContent(content: string, anchorId: string, newContent: string): InjectionResult {
    const lines = content.split('\n');
    let startLine = -1;
    let endLine = -1;

    // Find the anchor boundaries
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for start anchor
      const startMatch = line.match(/<!--\s*doctype:start\s+id="([^"]+)"/);
      if (startMatch && startMatch[1] === anchorId) {
        startLine = i;
        continue;
      }

      // Look for end anchor (only if we found the start)
      if (startLine !== -1) {
        const endMatch = line.match(/<!--\s*doctype:end\s+id="([^"]+)"/);
        if (endMatch && endMatch[1] === anchorId) {
          endLine = i;
          break;
        }
      }
    }

    // Validation
    if (startLine === -1) {
      return {
        success: false,
        content,
        linesChanged: 0,
        error: `Anchor with id="${anchorId}" not found`,
      };
    }

    if (endLine === -1) {
      return {
        success: false,
        content,
        linesChanged: 0,
        error: `End anchor for id="${anchorId}" not found`,
      };
    }

    // Calculate lines changed
    const oldContentLines = endLine - startLine - 1;
    const newContentLines = newContent.split('\n').length;
    const linesChanged = Math.abs(newContentLines - oldContentLines);

    // Build the new content
    const before = lines.slice(0, startLine + 1);
    const after = lines.slice(endLine);
    const middle = newContent.split('\n');

    // Ensure proper spacing around content
    const updatedLines = [...before, ...middle, ...after];
    const updatedContent = updatedLines.join('\n');

    return {
      success: true,
      content: updatedContent,
      linesChanged,
    };
  }

  /**
   * Inject content into multiple anchors in a single file
   * @param filePath Path to the markdown file
   * @param injections Map of anchor IDs to their new content
   * @param writeToFile If true, writes changes to file
   * @returns Array of InjectionResults for each anchor
   */
  public injectMultiple(
    filePath: string,
    injections: Map<string, string>,
    writeToFile: boolean = true
  ): InjectionResult[] {
    try {
      let content = readFileSync(filePath, 'utf-8');
      const results: InjectionResult[] = [];

      // Apply injections one by one
      for (const [anchorId, newContent] of injections.entries()) {
        const result = this.injectIntoContent(content, anchorId, newContent);
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
          linesChanged: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      ];
    }
  }

  /**
   * Preview injection without writing to file
   * Useful for showing diffs or validation
   * @param filePath Path to the markdown file
   * @param anchorId ID of the anchor
   * @param newContent The new content
   * @returns InjectionResult with preview content
   */
  public preview(filePath: string, anchorId: string, newContent: string): InjectionResult {
    return this.injectIntoFile(filePath, anchorId, newContent, false);
  }

  /**
   * Get line numbers for a specific anchor in a file
   * @param filePath Path to the markdown file
   * @param anchorId ID of the anchor
   * @returns Object with startLine and endLine, or null if not found
   */
  public getAnchorLocation(filePath: string, anchorId: string): { startLine: number; endLine: number } | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return this.getAnchorLocationFromContent(content, anchorId);
    } catch {
      return null;
    }
  }

  /**
   * Get line numbers for a specific anchor in content
   * @param content Markdown content
   * @param anchorId ID of the anchor
   * @returns Object with startLine and endLine, or null if not found
   */
  public getAnchorLocationFromContent(content: string, anchorId: string): { startLine: number; endLine: number } | null {
    const lines = content.split('\n');
    let startLine = -1;
    let endLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const startMatch = line.match(/<!--\s*doctype:start\s+id="([^"]+)"/);
      if (startMatch && startMatch[1] === anchorId) {
        startLine = i;
        continue;
      }

      if (startLine !== -1) {
        const endMatch = line.match(/<!--\s*doctype:end\s+id="([^"]+)"/);
        if (endMatch && endMatch[1] === anchorId) {
          endLine = i;
          break;
        }
      }
    }

    if (startLine === -1 || endLine === -1) {
      return null;
    }

    return { startLine, endLine };
  }

  /**
   * Validate that an anchor exists and is properly formed
   * @param content Markdown content
   * @param anchorId ID of the anchor to validate
   * @returns Array of validation errors, empty if valid
   */
  public validateAnchor(content: string, anchorId: string): string[] {
    const errors: string[] = [];
    const lines = content.split('\n');
    let startLine = -1;
    let endLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const startMatch = line.match(/<!--\s*doctype:start\s+id="([^"]+)"/);
      if (startMatch && startMatch[1] === anchorId) {
        if (startLine !== -1) {
          errors.push(`Duplicate start anchor for id="${anchorId}"`);
        }
        startLine = i;
      }

      const endMatch = line.match(/<!--\s*doctype:end\s+id="([^"]+)"/);
      if (endMatch && endMatch[1] === anchorId) {
        if (endLine !== -1) {
          errors.push(`Duplicate end anchor for id="${anchorId}"`);
        }
        endLine = i;
      }
    }

    if (startLine === -1) {
      errors.push(`Start anchor for id="${anchorId}" not found`);
    }

    if (endLine === -1) {
      errors.push(`End anchor for id="${anchorId}" not found`);
    }

    if (startLine !== -1 && endLine !== -1 && startLine >= endLine) {
      errors.push(`End anchor appears before or at the same line as start anchor for id="${anchorId}"`);
    }

    return errors;
  }
}
