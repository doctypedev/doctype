import { describe, it, expect, afterEach } from 'vitest';
import { MarkdownAnchorInserter } from '../markdown-anchor-inserter';
import { writeFileSync, existsSync, unlinkSync, readFileSync } from 'fs';

describe('MarkdownAnchorInserter', () => {
  const inserter = new MarkdownAnchorInserter();
  const testFilePath = './test-insert.md';

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe('insertIntoContent', () => {
    it('should insert anchor into existing section', () => {
      const content = `# API Reference\n\nExisting content`;
      const result = inserter.insertIntoContent(content, 'src/foo.ts#bar');

      expect(result.success).toBe(true);
      expect(result.content).toContain('### bar');
      expect(result.content).toContain('code_ref="src/foo.ts#bar"');
      expect(result.content).toContain('<!-- doctype:start');
    });

    it('should create section if missing and createSection is true', () => {
      const content = `# Intro\n\nSome text`;
      const result = inserter.insertIntoContent(content, 'src/foo.ts#bar', { createSection: true });

      expect(result.success).toBe(true);
      expect(result.content).toContain('## API Reference');
      expect(result.content).toContain('### bar');
    });

    it('should fail if section missing and createSection is false', () => {
      const content = `# Intro\n\nSome text`;
      const result = inserter.insertIntoContent(content, 'src/foo.ts#bar', { createSection: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate codeRef format', () => {
      const content = `# API Reference\n`;
      const result = inserter.insertIntoContent(content, 'invalid-ref');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid code_ref format');
    });
  });

  describe('hasAnchor', () => {
    it('should return true for existing anchor', () => {
      const content = `<!-- doctype:start id="123" code_ref="src/foo.ts#bar" -->`;
      expect(inserter.hasAnchor(content, 'src/foo.ts#bar')).toBe(true);
    });

    it('should return false for missing anchor', () => {
      const content = `<!-- doctype:start id="123" code_ref="src/foo.ts#bar" -->`;
      expect(inserter.hasAnchor(content, 'src/baz.ts#qux')).toBe(false);
    });
  });

  describe('getExistingCodeRefs', () => {
    it('should return all code refs', () => {
      const content = `
<!-- doctype:start id="1" code_ref="src/a.ts#A" -->
<!-- doctype:start id="2" code_ref="src/b.ts#B" -->
        `;
      const refs = inserter.getExistingCodeRefs(content);
      expect(refs).toContain('src/a.ts#A');
      expect(refs).toContain('src/b.ts#B');
      expect(refs.length).toBe(2);
    });

    it('should return empty array if no refs found', () => {
      const content = 'No anchors here';
      const refs = inserter.getExistingCodeRefs(content);
      expect(refs).toEqual([]);
    });
  });

  describe('insertIntoFile', () => {
    it('should insert content and write to file', () => {
      const initialContent = `# API Reference\n`;
      writeFileSync(testFilePath, initialContent);

      const result = inserter.insertIntoFile(testFilePath, 'src/test.ts#func', {}, true);

      expect(result.success).toBe(true);
      expect(existsSync(testFilePath)).toBe(true);
      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toContain('src/test.ts#func');
    });

    it('should create file if it does not exist', () => {
      const result = inserter.insertIntoFile(testFilePath, 'src/test.ts#func', { createSection: true }, true);

      expect(result.success).toBe(true);
      expect(existsSync(testFilePath)).toBe(true);
      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toContain('# test-insert'); // Default title from filename
      expect(fileContent).toContain('src/test.ts#func');
    });
  });
});
