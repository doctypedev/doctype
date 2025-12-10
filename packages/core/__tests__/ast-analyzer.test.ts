import { describe, it, expect, beforeEach } from 'vitest';
import { ASTAnalyzer } from '../ast-analyzer';
import { SymbolType } from '@sintesi/core';
import path from 'path';

describe('ASTAnalyzer', () => {
  let analyzer: ASTAnalyzer;

  beforeEach(() => {
    analyzer = new ASTAnalyzer();
  });

  describe('analyzeCode', () => {
    it('should extract exported functions', () => {
      const code = `
        export function add(a: number, b: number): number {
          return a + b;
        }

        export async function fetchData(url: string): Promise<string> {
          return 'data';
        }
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(2);
      expect(signatures[0].symbolName).toBe('add');
      expect(signatures[0].symbolType).toBe(SymbolType.Function);
      expect(signatures[0].isExported).toBe(true);

      expect(signatures[1].symbolName).toBe('fetchData');
      expect(signatures[1].symbolType).toBe(SymbolType.Function);
      expect(signatures[1].isExported).toBe(true);
    });

    it('should NOT extract non-exported functions', () => {
      const code = `
        export function publicFunc(): void {}

        function privateFunc(): void {}
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(1);
      expect(signatures[0].symbolName).toBe('publicFunc');
    });

    it('should extract exported classes', () => {
      const code = `
        export class Calculator {
          public add(a: number, b: number): number {
            return a + b;
          }

          private privateMethod(): void {}
        }
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(1);
      expect(signatures[0].symbolName).toBe('Calculator');
      expect(signatures[0].symbolType).toBe(SymbolType.Class);
      expect(signatures[0].isExported).toBe(true);
    });

    it('should extract exported interfaces', () => {
      const code = `
        export interface User {
          id: string;
          name: string;
          email: string;
        }

        export interface ApiResponse<T> {
          data: T;
          status: number;
        }
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(2);
      expect(signatures[0].symbolName).toBe('User');
      expect(signatures[0].symbolType).toBe(SymbolType.Interface);

      expect(signatures[1].symbolName).toBe('ApiResponse');
      expect(signatures[1].symbolType).toBe(SymbolType.Interface);
    });

    it('should extract exported type aliases', () => {
      const code = `
        export type StringOrNumber = string | number;

        export type Point = {
          x: number;
          y: number;
        };
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(2);
      expect(signatures[0].symbolName).toBe('StringOrNumber');
      expect(signatures[0].symbolType).toBe(SymbolType.TypeAlias);

      expect(signatures[1].symbolName).toBe('Point');
      expect(signatures[1].symbolType).toBe(SymbolType.TypeAlias);
    });

    it('should extract exported enums', () => {
      const code = `
        export enum Status {
          PENDING = 'pending',
          ACTIVE = 'active',
          INACTIVE = 'inactive',
        }
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(1);
      expect(signatures[0].symbolName).toBe('Status');
      expect(signatures[0].symbolType).toBe(SymbolType.Enum);
    });

    it('should extract exported const variables', () => {
      const code = `
        export const API_URL = 'https://api.example.com';
        export const DEFAULT_TIMEOUT = 5000;
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(2);
      expect(signatures[0].symbolName).toBe('API_URL');
      expect(signatures[0].symbolType).toBe(SymbolType.Const);

      expect(signatures[1].symbolName).toBe('DEFAULT_TIMEOUT');
      expect(signatures[1].symbolType).toBe(SymbolType.Const);
    });

    it('should extract exported let/var variables', () => {
      const code = `
        export let counter = 0;
        export var oldStyle = 'legacy';
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(2);
      expect(signatures[0].symbolType).toBe(SymbolType.Variable);
      expect(signatures[1].symbolType).toBe(SymbolType.Variable);
    });

    it('should normalize whitespace in signatures', () => {
      const code = `
        export function    test(  a:   number  ):  void   {
          console.log(a);
        }
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures[0].signatureText).not.toContain('  ');
      expect(signatures[0].signatureText).toBe(
        signatures[0].signatureText.trim()
      );
    });

    it('should remove comments from signatures', () => {
      const code = `
        // This is a comment
        export function test(): void {
          /* Multi-line
             comment */
          return;
        }
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures[0].signatureText).not.toContain('//');
      expect(signatures[0].signatureText).not.toContain('/*');
      expect(signatures[0].signatureText).not.toContain('Multi-line');
    });

    it('should handle empty code', () => {
      const code = '';
      const signatures = analyzer.analyzeCode(code);
      expect(signatures).toHaveLength(0);
    });

    it('should handle code with only non-exported symbols', () => {
      const code = `
        function privateFunc(): void {}
        class PrivateClass {}
        interface PrivateInterface {}
      `;

      const signatures = analyzer.analyzeCode(code);
      expect(signatures).toHaveLength(0);
    });

    it('should extract multiple symbol types from mixed code', () => {
      const code = `
        export function myFunc(): void {}
        export class MyClass {}
        export interface MyInterface {}
        export type MyType = string;
        export enum MyEnum { A, B }
        export const MY_CONST = 42;
      `;

      const signatures = analyzer.analyzeCode(code);

      expect(signatures).toHaveLength(6);

      const types = signatures.map(s => s.symbolType);
      expect(types).toContain(SymbolType.Function);
      expect(types).toContain(SymbolType.Class);
      expect(types).toContain(SymbolType.Interface);
      expect(types).toContain(SymbolType.TypeAlias);
      expect(types).toContain(SymbolType.Enum);
      expect(types).toContain(SymbolType.Const);
    });
  });

  describe('analyzeFile', () => {
    it('should analyze a file with simple functions', () => {
      const filePath = path.resolve(
        __dirname,
        'fixtures/simple-functions.ts'
      );

      const signatures = analyzer.analyzeFile(filePath);

      expect(signatures.length).toBeGreaterThan(0);

      const functionNames = signatures.map(s => s.symbolName);
      expect(functionNames).toContain('add');
      expect(functionNames).toContain('subtract');
      expect(functionNames).toContain('fetchData');
      expect(functionNames).toContain('multiply');

      // Should NOT contain non-exported function
      expect(functionNames).not.toContain('privateHelper');
    });

    it('should analyze a file with classes', () => {
      const filePath = path.resolve(__dirname, 'fixtures/classes.ts');

      const signatures = analyzer.analyzeFile(filePath);

      const classNames = signatures.map(s => s.symbolName);
      expect(classNames).toContain('Calculator');
      expect(classNames).toContain('User');

      // Should NOT contain non-exported class
      expect(classNames).not.toContain('InternalService');
    });

    it('should analyze a file with types and interfaces', () => {
      const filePath = path.resolve(
        __dirname,
        'fixtures/types-and-interfaces.ts'
      );

      const signatures = analyzer.analyzeFile(filePath);

      const names = signatures.map(s => s.symbolName);
      expect(names).toContain('UserProfile');
      expect(names).toContain('ApiResponse');
      expect(names).toContain('StringOrNumber');
      expect(names).toContain('Point');
      expect(names).toContain('Status');
      expect(names).toContain('Priority');
      expect(names).toContain('API_URL');
      expect(names).toContain('DEFAULT_TIMEOUT');

      // Should NOT contain non-exported symbols
      expect(names).not.toContain('InternalConfig');
      expect(names).not.toContain('INTERNAL_KEY');
    });
  });

  describe('signature normalization', () => {
    it('should produce consistent signatures for equivalent code', () => {
      const code1 = `
        export function test(a: number): void {
          console.log(a);
        }
      `;

      const code2 = `
        export   function   test  ( a  :  number )  :  void   {
          console.log(a);
        }
      `;

      const sig1 = analyzer.analyzeCode(code1);
      const sig2 = analyzer.analyzeCode(code2);

      expect(sig1[0].signatureText).toBe(sig2[0].signatureText);
    });

    it('should detect signature changes when parameters change', () => {
      const code1 = `export function test(a: number): void {}`;
      const code2 = `export function test(a: string): void {}`;

      const sig1 = analyzer.analyzeCode(code1);
      const sig2 = analyzer.analyzeCode(code2);

      expect(sig1[0].signatureText).not.toBe(sig2[0].signatureText);
    });

    it('should detect signature changes when return type changes', () => {
      const code1 = `export function test(): number { return 1; }`;
      const code2 = `export function test(): string { return '1'; }`;

      const sig1 = analyzer.analyzeCode(code1);
      const sig2 = analyzer.analyzeCode(code2);

      expect(sig1[0].signatureText).not.toBe(sig2[0].signatureText);
    });
  });
});
