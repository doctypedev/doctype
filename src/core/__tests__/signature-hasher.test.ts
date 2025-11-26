import { describe, it, expect, beforeEach } from 'vitest';
import { SignatureHasher } from '../signature-hasher';
import { CodeSignature, SymbolType } from '../types';

describe('SignatureHasher', () => {
  let hasher: SignatureHasher;

  beforeEach(() => {
    hasher = new SignatureHasher();
  });

  describe('hash', () => {
    it('should generate a valid SHA256 hash', () => {
      const signature: CodeSignature = {
        symbolName: 'testFunction',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function testFunction(): void',
        isExported: true,
      };

      const result = hasher.hash(signature);

      expect(result.hash).toBeDefined();
      expect(result.hash).toHaveLength(64); // SHA256 is 64 hex chars
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should include original signature in result', () => {
      const signature: CodeSignature = {
        symbolName: 'testFunction',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function testFunction(): void',
        isExported: true,
      };

      const result = hasher.hash(signature);

      expect(result.signature).toEqual(signature);
    });

    it('should include timestamp in result', () => {
      const signature: CodeSignature = {
        symbolName: 'testFunction',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function testFunction(): void',
        isExported: true,
      };

      const before = Date.now();
      const result = hasher.hash(signature);
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate same hash for identical signatures', () => {
      const signature1: CodeSignature = {
        symbolName: 'testFunction',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function testFunction(a: number): void',
        isExported: true,
      };

      const signature2: CodeSignature = {
        symbolName: 'testFunction',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function testFunction(a: number): void',
        isExported: true,
      };

      const hash1 = hasher.hash(signature1);
      const hash2 = hasher.hash(signature2);

      expect(hash1.hash).toBe(hash2.hash);
    });

    it('should generate different hashes for different symbol names', () => {
      const signature1: CodeSignature = {
        symbolName: 'functionA',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(): void',
        isExported: true,
      };

      const signature2: CodeSignature = {
        symbolName: 'functionB',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(): void',
        isExported: true,
      };

      const hash1 = hasher.hash(signature1);
      const hash2 = hasher.hash(signature2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should generate different hashes for different symbol types', () => {
      const signature1: CodeSignature = {
        symbolName: 'Test',
        symbolType: SymbolType.CLASS,
        signatureText: 'class Test {}',
        isExported: true,
      };

      const signature2: CodeSignature = {
        symbolName: 'Test',
        symbolType: SymbolType.INTERFACE,
        signatureText: 'interface Test {}',
        isExported: true,
      };

      const hash1 = hasher.hash(signature1);
      const hash2 = hasher.hash(signature2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should generate different hashes for different signature text', () => {
      const signature1: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(a: number): void',
        isExported: true,
      };

      const signature2: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(a: string): void',
        isExported: true,
      };

      const hash1 = hasher.hash(signature1);
      const hash2 = hasher.hash(signature2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should generate different hashes for different export status', () => {
      const signature1: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(): void',
        isExported: true,
      };

      const signature2: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(): void',
        isExported: false,
      };

      const hash1 = hasher.hash(signature1);
      const hash2 = hasher.hash(signature2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });
  });

  describe('hashMany', () => {
    it('should hash multiple signatures', () => {
      const signatures: CodeSignature[] = [
        {
          symbolName: 'func1',
          symbolType: SymbolType.FUNCTION,
          signatureText: 'function func1(): void',
          isExported: true,
        },
        {
          symbolName: 'func2',
          symbolType: SymbolType.FUNCTION,
          signatureText: 'function func2(): void',
          isExported: true,
        },
        {
          symbolName: 'Class1',
          symbolType: SymbolType.CLASS,
          signatureText: 'class Class1 {}',
          isExported: true,
        },
      ];

      const results = hasher.hashMany(signatures);

      expect(results).toHaveLength(3);
      expect(results[0].signature.symbolName).toBe('func1');
      expect(results[1].signature.symbolName).toBe('func2');
      expect(results[2].signature.symbolName).toBe('Class1');
    });

    it('should handle empty array', () => {
      const results = hasher.hashMany([]);
      expect(results).toHaveLength(0);
    });

    it('should generate unique hashes for each signature', () => {
      const signatures: CodeSignature[] = [
        {
          symbolName: 'func1',
          symbolType: SymbolType.FUNCTION,
          signatureText: 'function func1(): void',
          isExported: true,
        },
        {
          symbolName: 'func2',
          symbolType: SymbolType.FUNCTION,
          signatureText: 'function func2(): void',
          isExported: true,
        },
      ];

      const results = hasher.hashMany(signatures);

      expect(results[0].hash).not.toBe(results[1].hash);
    });
  });

  describe('compare', () => {
    it('should return true for identical hashes', () => {
      const hash1 = 'abc123';
      const hash2 = 'abc123';

      expect(hasher.compare(hash1, hash2)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = 'abc123';
      const hash2 = 'def456';

      expect(hasher.compare(hash1, hash2)).toBe(false);
    });

    it('should be case sensitive', () => {
      const hash1 = 'ABC123';
      const hash2 = 'abc123';

      expect(hasher.compare(hash1, hash2)).toBe(false);
    });
  });

  describe('hashText', () => {
    it('should generate SHA256 hash from text', () => {
      const text = 'function test(): void';
      const hash = hasher.hashText(text);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate same hash for same text', () => {
      const text = 'function test(): void';
      const hash1 = hasher.hashText(text);
      const hash2 = hasher.hashText(text);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different text', () => {
      const text1 = 'function test(): void';
      const text2 = 'function test(): string';

      const hash1 = hasher.hashText(text1);
      const hash2 = hasher.hashText(text2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hasher.hashText('');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('determinism', () => {
    it('should produce identical hashes across multiple runs', () => {
      const signature: CodeSignature = {
        symbolName: 'myFunction',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function myFunction(x: number, y: string): boolean',
        isExported: true,
      };

      const hashes = Array.from({ length: 100 }, () =>
        hasher.hash(signature).hash
      );

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very long signature text', () => {
      const longText = 'a'.repeat(10000);
      const signature: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: longText,
        isExported: true,
      };

      const result = hasher.hash(signature);

      expect(result.hash).toHaveLength(64);
    });

    it('should handle special characters in signature', () => {
      const signature: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(): void { /* comment */ }',
        isExported: true,
      };

      const result = hasher.hash(signature);

      expect(result.hash).toHaveLength(64);
    });

    it('should handle unicode characters', () => {
      const signature: CodeSignature = {
        symbolName: 'test',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function test(): string { return "你好世界"; }',
        isExported: true,
      };

      const result = hasher.hash(signature);

      expect(result.hash).toHaveLength(64);
    });
  });

  describe('real-world scenarios', () => {
    it('should detect when function parameter type changes', () => {
      const before: CodeSignature = {
        symbolName: 'processData',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function processData(input: string): void',
        isExported: true,
      };

      const after: CodeSignature = {
        symbolName: 'processData',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function processData(input: number): void',
        isExported: true,
      };

      const hashBefore = hasher.hash(before);
      const hashAfter = hasher.hash(after);

      expect(hasher.compare(hashBefore.hash, hashAfter.hash)).toBe(false);
    });

    it('should detect when function return type changes', () => {
      const before: CodeSignature = {
        symbolName: 'getData',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function getData(): string',
        isExported: true,
      };

      const after: CodeSignature = {
        symbolName: 'getData',
        symbolType: SymbolType.FUNCTION,
        signatureText: 'function getData(): Promise<string>',
        isExported: true,
      };

      const hashBefore = hasher.hash(before);
      const hashAfter = hasher.hash(after);

      expect(hasher.compare(hashBefore.hash, hashAfter.hash)).toBe(false);
    });

    it('should detect when interface properties change', () => {
      const before: CodeSignature = {
        symbolName: 'User',
        symbolType: SymbolType.INTERFACE,
        signatureText: 'interface User { id: string; name: string; }',
        isExported: true,
      };

      const after: CodeSignature = {
        symbolName: 'User',
        symbolType: SymbolType.INTERFACE,
        signatureText:
          'interface User { id: string; name: string; email: string; }',
        isExported: true,
      };

      const hashBefore = hasher.hash(before);
      const hashAfter = hasher.hash(after);

      expect(hasher.compare(hashBefore.hash, hashAfter.hash)).toBe(false);
    });
  });
});
