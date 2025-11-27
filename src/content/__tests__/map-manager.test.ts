import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DoctypeMapManager } from '../map-manager';
import { DoctypeMapEntry } from '../../core/types';
import { existsSync, unlinkSync } from 'fs';

describe('DoctypeMapManager', () => {
  const testMapPath = './test-doctype-map.json';
  let manager: DoctypeMapManager;

  beforeEach(() => {
    // Clean up test file if it exists
    if (existsSync(testMapPath)) {
      unlinkSync(testMapPath);
    }
    manager = new DoctypeMapManager(testMapPath);
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(testMapPath)) {
      unlinkSync(testMapPath);
    }
  });

  const createTestEntry = (id: string): DoctypeMapEntry => ({
    id,
    codeRef: {
      filePath: 'src/test.ts',
      symbolName: 'testFunc',
    },
    codeSignatureHash: 'abc123hash',
    docRef: {
      filePath: 'docs/test.md',
      startLine: 10,
      endLine: 20,
    },
    originalMarkdownContent: 'Test content',
    lastUpdated: Date.now(),
  });

  describe('initialization', () => {
    it('should create a new empty map if file does not exist', () => {
      expect(manager.getEntryCount()).toBe(0);
      expect(manager.getVersion()).toBe('1.0.0');
    });

    it('should load existing map from file', () => {
      const entry = createTestEntry('test-id-1');
      manager.addEntry(entry);
      manager.save();

      const newManager = new DoctypeMapManager(testMapPath);
      expect(newManager.getEntryCount()).toBe(1);
      expect(newManager.getEntryById('test-id-1')).toBeDefined();
    });
  });

  describe('addEntry', () => {
    it('should add a new entry', () => {
      const entry = createTestEntry('new-entry');
      manager.addEntry(entry);

      expect(manager.getEntryCount()).toBe(1);
      expect(manager.getEntryById('new-entry')).toEqual(entry);
    });

    it('should throw error when adding duplicate ID', () => {
      const entry = createTestEntry('duplicate');
      manager.addEntry(entry);

      expect(() => manager.addEntry(entry)).toThrow(/already exists/i);
    });

    it('should add multiple unique entries', () => {
      manager.addEntry(createTestEntry('entry-1'));
      manager.addEntry(createTestEntry('entry-2'));
      manager.addEntry(createTestEntry('entry-3'));

      expect(manager.getEntryCount()).toBe(3);
    });
  });

  describe('getEntryById', () => {
    it('should return entry when it exists', () => {
      const entry = createTestEntry('exists');
      manager.addEntry(entry);

      const found = manager.getEntryById('exists');
      expect(found).toEqual(entry);
    });

    it('should return undefined when entry does not exist', () => {
      const found = manager.getEntryById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getEntriesByCodeRef', () => {
    it('should return entries matching code reference', () => {
      const entry1 = createTestEntry('entry-1');
      entry1.codeRef = { filePath: 'src/a.ts', symbolName: 'funcA' };

      const entry2 = createTestEntry('entry-2');
      entry2.codeRef = { filePath: 'src/a.ts', symbolName: 'funcA' };

      const entry3 = createTestEntry('entry-3');
      entry3.codeRef = { filePath: 'src/b.ts', symbolName: 'funcB' };

      manager.addEntry(entry1);
      manager.addEntry(entry2);
      manager.addEntry(entry3);

      const results = manager.getEntriesByCodeRef('src/a.ts', 'funcA');
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.codeRef.symbolName === 'funcA')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const results = manager.getEntriesByCodeRef('nonexistent.ts', 'func');
      expect(results).toHaveLength(0);
    });
  });

  describe('getEntriesByDocFile', () => {
    it('should return entries in the specified doc file', () => {
      const entry1 = createTestEntry('entry-1');
      entry1.docRef = { filePath: 'docs/a.md', startLine: 1, endLine: 10 };

      const entry2 = createTestEntry('entry-2');
      entry2.docRef = { filePath: 'docs/a.md', startLine: 20, endLine: 30 };

      const entry3 = createTestEntry('entry-3');
      entry3.docRef = { filePath: 'docs/b.md', startLine: 1, endLine: 10 };

      manager.addEntry(entry1);
      manager.addEntry(entry2);
      manager.addEntry(entry3);

      const results = manager.getEntriesByDocFile('docs/a.md');
      expect(results).toHaveLength(2);
    });
  });

  describe('updateEntry', () => {
    it('should update an existing entry', () => {
      const entry = createTestEntry('update-me');
      manager.addEntry(entry);

      const newHash = 'new-hash-456';
      manager.updateEntry('update-me', { codeSignatureHash: newHash });

      const updated = manager.getEntryById('update-me');
      expect(updated?.codeSignatureHash).toBe(newHash);
    });

    it('should update lastUpdated timestamp', async () => {
      const entry = createTestEntry('update-timestamp');
      const originalTime = entry.lastUpdated;
      manager.addEntry(entry);

      // Wait a bit to ensure timestamp changes
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          manager.updateEntry('update-timestamp', { originalMarkdownContent: 'new content' });

          const updated = manager.getEntryById('update-timestamp');
          expect(updated?.lastUpdated).toBeGreaterThan(originalTime);
          resolve();
        }, 10);
      });
    });

    it('should throw error when updating non-existent entry', () => {
      expect(() => manager.updateEntry('non-existent', {})).toThrow(/not found/i);
    });
  });

  describe('removeEntry', () => {
    it('should remove an existing entry', () => {
      const entry = createTestEntry('remove-me');
      manager.addEntry(entry);

      const removed = manager.removeEntry('remove-me');
      expect(removed).toBe(true);
      expect(manager.getEntryById('remove-me')).toBeUndefined();
      expect(manager.getEntryCount()).toBe(0);
    });

    it('should return false when removing non-existent entry', () => {
      const removed = manager.removeEntry('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('hasDrift', () => {
    it('should return true when hashes do not match', () => {
      const entry = createTestEntry('drift-check');
      entry.codeSignatureHash = 'original-hash';
      manager.addEntry(entry);

      const hasDrift = manager.hasDrift('drift-check', 'different-hash');
      expect(hasDrift).toBe(true);
    });

    it('should return false when hashes match', () => {
      const entry = createTestEntry('no-drift');
      entry.codeSignatureHash = 'same-hash';
      manager.addEntry(entry);

      const hasDrift = manager.hasDrift('no-drift', 'same-hash');
      expect(hasDrift).toBe(false);
    });

    it('should throw error for non-existent entry', () => {
      expect(() => manager.hasDrift('non-existent', 'any-hash')).toThrow(/not found/i);
    });
  });

  describe('getDriftedEntries', () => {
    it('should return only drifted entries', () => {
      const entry1 = createTestEntry('entry-1');
      entry1.codeSignatureHash = 'hash-1';

      const entry2 = createTestEntry('entry-2');
      entry2.codeSignatureHash = 'hash-2';

      const entry3 = createTestEntry('entry-3');
      entry3.codeSignatureHash = 'hash-3';

      manager.addEntry(entry1);
      manager.addEntry(entry2);
      manager.addEntry(entry3);

      const currentHashes = new Map([
        ['entry-1', 'hash-1'], // No drift
        ['entry-2', 'hash-2-changed'], // Drifted
        ['entry-3', 'hash-3-changed'], // Drifted
      ]);

      const drifted = manager.getDriftedEntries(currentHashes);
      expect(drifted).toHaveLength(2);
      expect(drifted.some((e) => e.id === 'entry-2')).toBe(true);
      expect(drifted.some((e) => e.id === 'entry-3')).toBe(true);
    });
  });

  describe('save and load', () => {
    it('should persist entries to disk', () => {
      manager.addEntry(createTestEntry('persist-1'));
      manager.addEntry(createTestEntry('persist-2'));
      manager.save();

      expect(existsSync(testMapPath)).toBe(true);

      const newManager = new DoctypeMapManager(testMapPath);
      expect(newManager.getEntryCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      manager.addEntry(createTestEntry('entry-1'));
      manager.addEntry(createTestEntry('entry-2'));

      manager.clear();
      expect(manager.getEntryCount()).toBe(0);
    });
  });

  describe('export', () => {
    it('should return a copy of the entire map', () => {
      manager.addEntry(createTestEntry('export-test'));

      const exported = manager.export();
      expect(exported.version).toBe('1.0.0');
      expect(exported.entries).toHaveLength(1);
    });
  });
});
