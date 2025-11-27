import { describe, it, expect, afterEach } from 'vitest';
import { ContentInjector } from '../content-injector';
import { writeFileSync, existsSync, unlinkSync, readFileSync } from 'fs';

describe('ContentInjector', () => {
  const injector = new ContentInjector();
  const testFilePath = './test-inject.md';

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  const createTestContent = (): string => `# Test Document

<!-- doctype:start id="test-anchor" code_ref="src/test.ts#testFunc" -->
Old content here
that spans multiple lines
<!-- doctype:end id="test-anchor" -->

More content below.`;

  describe('injectIntoContent', () => {
    it('should inject new content successfully', () => {
      const content = createTestContent();
      const newContent = 'New content\nwith multiple lines';

      const result = injector.injectIntoContent(content, 'test-anchor', newContent);

      expect(result.success).toBe(true);
      expect(result.content).toContain('New content');
      expect(result.content).toContain('with multiple lines');
      expect(result.content).not.toContain('Old content here');
    });

    it('should preserve anchor comments', () => {
      const content = createTestContent();
      const newContent = 'Replacement';

      const result = injector.injectIntoContent(content, 'test-anchor', newContent);

      expect(result.content).toContain('<!-- doctype:start id="test-anchor"');
      expect(result.content).toContain('<!-- doctype:end id="test-anchor" -->');
    });

    it('should preserve content outside anchors', () => {
      const content = createTestContent();
      const newContent = 'Replacement';

      const result = injector.injectIntoContent(content, 'test-anchor', newContent);

      expect(result.content).toContain('# Test Document');
      expect(result.content).toContain('More content below.');
    });

    it('should return error for non-existent anchor', () => {
      const content = createTestContent();
      const result = injector.injectIntoContent(content, 'non-existent', 'content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should calculate lines changed correctly', () => {
      const content = createTestContent();
      const newContent = 'Single line';

      const result = injector.injectIntoContent(content, 'test-anchor', newContent);

      expect(result.linesChanged).toBeGreaterThan(0);
    });

    it('should handle empty new content', () => {
      const content = createTestContent();
      const result = injector.injectIntoContent(content, 'test-anchor', '');

      expect(result.success).toBe(true);
      expect(result.content).toContain('<!-- doctype:start');
      expect(result.content).toContain('<!-- doctype:end');
    });
  });

  describe('injectIntoFile', () => {
    it('should inject content and write to file', () => {
      writeFileSync(testFilePath, createTestContent());

      const result = injector.injectIntoFile(testFilePath, 'test-anchor', 'New file content', true);

      expect(result.success).toBe(true);
      expect(existsSync(testFilePath)).toBe(true);
    });

    it('should not write to file when writeToFile is false', () => {
      writeFileSync(testFilePath, createTestContent());
      const originalContent = createTestContent();

      injector.injectIntoFile(testFilePath, 'test-anchor', 'New content', false);

      const currentContent = readFileSync(testFilePath, 'utf-8');
      expect(currentContent).toBe(originalContent);
    });
  });

  describe('injectMultiple', () => {
    it('should inject content into multiple anchors', () => {
      const content = `<!-- doctype:start id="anchor1" code_ref="src/a.ts#a" -->
Old A
<!-- doctype:end id="anchor1" -->

<!-- doctype:start id="anchor2" code_ref="src/b.ts#b" -->
Old B
<!-- doctype:end id="anchor2" -->`;

      writeFileSync(testFilePath, content);

      const injections = new Map([
        ['anchor1', 'New A'],
        ['anchor2', 'New B'],
      ]);

      const results = injector.injectMultiple(testFilePath, injections, true);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should not write file if any injection fails', () => {
      writeFileSync(testFilePath, createTestContent());

      const injections = new Map([
        ['test-anchor', 'Valid content'],
        ['non-existent', 'Invalid'],
      ]);

      const results = injector.injectMultiple(testFilePath, injections, true);

      expect(results.some((r) => !r.success)).toBe(true);
    });
  });

  describe('preview', () => {
    it('should return updated content without writing to file', () => {
      writeFileSync(testFilePath, createTestContent());
      const originalContent = createTestContent();

      const result = injector.preview(testFilePath, 'test-anchor', 'Preview content');

      expect(result.success).toBe(true);
      expect(result.content).toContain('Preview content');

      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toBe(originalContent);
    });
  });

  describe('getAnchorLocationFromContent', () => {
    it('should return correct line numbers', () => {
      const content = createTestContent();
      const location = injector.getAnchorLocationFromContent(content, 'test-anchor');

      expect(location).not.toBeNull();
      expect(location?.startLine).toBeGreaterThanOrEqual(0);
      expect(location?.endLine).toBeGreaterThan(location?.startLine || 0);
    });

    it('should return null for non-existent anchor', () => {
      const content = createTestContent();
      const location = injector.getAnchorLocationFromContent(content, 'non-existent');

      expect(location).toBeNull();
    });
  });

  describe('validateAnchor', () => {
    it('should return no errors for valid anchor', () => {
      const content = createTestContent();
      const errors = injector.validateAnchor(content, 'test-anchor');

      expect(errors).toHaveLength(0);
    });

    it('should detect missing start anchor', () => {
      const content = `<!-- doctype:end id="orphan" -->`;
      const errors = injector.validateAnchor(content, 'orphan');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Start anchor'))).toBe(true);
    });

    it('should detect missing end anchor', () => {
      const content = `<!-- doctype:start id="unclosed" code_ref="src/test.ts#test" -->`;
      const errors = injector.validateAnchor(content, 'unclosed');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('End anchor'))).toBe(true);
    });

    it('should detect duplicate start anchors', () => {
      const content = `<!-- doctype:start id="dup" code_ref="src/test.ts#test" -->
<!-- doctype:start id="dup" code_ref="src/test.ts#test" -->
<!-- doctype:end id="dup" -->
<!-- doctype:end id="dup" -->`;

      const errors = injector.validateAnchor(content, 'dup');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });

    it('should detect misordered anchors', () => {
      const content = `<!-- doctype:end id="backwards" -->
<!-- doctype:start id="backwards" code_ref="src/test.ts#test" -->`;

      const errors = injector.validateAnchor(content, 'backwards');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('before or at the same line'))).toBe(true);
    });
  });
});
