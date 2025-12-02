/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs/promises';
import * as path from 'path';
import { CodeSignature, SymbolType } from './types';

// Robustly load the Rust module
let RustAstAnalyzer: any;
try {
  // Strategy 1: Try loading from standard NPM package (production/user scenario)
  // This works if @doctypedev/core is installed via optionalDependencies
  try {
    const rustModule = require('@doctypedev/core');
    RustAstAnalyzer = rustModule.AstAnalyzer;
  } catch (npmError) {
    // Strategy 2: Check for standard NAPI-RS generated binding in local/dev structure
    const devPath = path.resolve(__dirname, '../../src/rust-core/index.js');
    
    if (require('fs').existsSync(devPath)) {
      const rustModule = require(devPath);
      RustAstAnalyzer = rustModule.AstAnalyzer;
    } else {
      throw npmError; // Throw the original error if local build not found
    }
  }
} catch (e) {
  console.error('Failed to load Rust AST Analyzer. Ensure @doctypedev/core is installed or built locally.', e);
  // We don't crash immediately, but constructor will fail if instantiated
}

/**
 * Analyzes TypeScript source files to extract code signatures
 * Uses the Rust-based implementation for performance.
 */
export class ASTAnalyzer {
  private rustAnalyzer: any;

  constructor(_tsConfigFilePath?: string) {
    if (!RustAstAnalyzer) {
       throw new Error("Rust AST Analyzer module not loaded correctly.");
    }
    // Rust analyzer currently doesn't use tsConfigFilePath
    this.rustAnalyzer = new RustAstAnalyzer();
  }

  /**
   * Analyzes a TypeScript file and extracts all public symbol signatures
   * @param filePath Path to the TypeScript file
   * @returns Array of code signatures found in the file
   */
  public async analyzeFile(filePath: string): Promise<CodeSignature[]> {
    try {
      const code = await fs.readFile(filePath, 'utf-8');
      return this.analyzeCode(code);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Analyzes TypeScript source code directly (without file)
   * @param code TypeScript source code
   * @returns Array of code signatures found in the code
   */
  public analyzeCode(code: string): CodeSignature[] {
    try {
      const signatures = this.rustAnalyzer.analyzeCode(code);
      
      // Map Rust result to our CodeSignature type
      // The fields symbolName, symbolType, signatureText, isExported should match due to napi(object) conversion
      return signatures.map((s: any) => ({
        symbolName: s.symbolName,
        symbolType: s.symbolType as SymbolType, // Cast string to enum
        signatureText: s.signatureText,
        isExported: s.isExported
      }));
    } catch (error) {
      console.error('Error analyzing code with Rust analyzer:', error);
      return [];
    }
  }
}

