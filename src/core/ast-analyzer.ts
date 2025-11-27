import {
  Project,
  SourceFile,
  SyntaxKind,
  Node,
  ClassDeclaration,
  MethodDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
  FunctionDeclaration
} from 'ts-morph';
import { CodeSignature, SymbolType } from './types';

/**
 * Analyzes TypeScript source files to extract code signatures
 */
export class ASTAnalyzer {
  private project: Project;

  constructor(tsConfigFilePath?: string) {
    this.project = new Project({
      tsConfigFilePath,
      skipAddingFilesFromTsConfig: !tsConfigFilePath,
    });
  }

  /**
   * Analyzes a TypeScript file and extracts all public symbol signatures
   * @param filePath Path to the TypeScript file
   * @returns Array of code signatures found in the file
   */
  public analyzeFile(filePath: string): CodeSignature[] {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const signatures: CodeSignature[] = [];

    // Extract all exported symbols
    signatures.push(...this.extractFunctions(sourceFile));
    signatures.push(...this.extractClasses(sourceFile));
    signatures.push(...this.extractInterfaces(sourceFile));
    signatures.push(...this.extractTypeAliases(sourceFile));
    signatures.push(...this.extractEnums(sourceFile));
    signatures.push(...this.extractVariables(sourceFile));

    return signatures;
  }

  /**
   * Analyzes TypeScript source code directly (without file)
   * @param code TypeScript source code
   * @returns Array of code signatures found in the code
   */
  public analyzeCode(code: string): CodeSignature[] {
    const sourceFile = this.project.createSourceFile('temp.ts', code, {
      overwrite: true,
    });
    const signatures: CodeSignature[] = [];

    signatures.push(...this.extractFunctions(sourceFile));
    signatures.push(...this.extractClasses(sourceFile));
    signatures.push(...this.extractInterfaces(sourceFile));
    signatures.push(...this.extractTypeAliases(sourceFile));
    signatures.push(...this.extractEnums(sourceFile));
    signatures.push(...this.extractVariables(sourceFile));

    return signatures;
  }

  private extractFunctions(sourceFile: SourceFile): CodeSignature[] {
    const functions = sourceFile.getFunctions();
    return functions
      .filter((fn) => this.isExported(fn))
      .map((fn) => ({
        symbolName: fn.getName() || '<anonymous>',
        symbolType: SymbolType.FUNCTION,
        signatureText: this.normalizeFunctionSignature(fn),
        isExported: true,
      }));
  }

  private extractClasses(sourceFile: SourceFile): CodeSignature[] {
    const classes = sourceFile.getClasses();
    return classes
      .filter((cls) => this.isExported(cls))
      .map((cls) => ({
        symbolName: cls.getName() || '<anonymous>',
        symbolType: SymbolType.CLASS,
        signatureText: this.normalizeClassSignature(cls),
        isExported: true,
      }));
  }

  private extractInterfaces(sourceFile: SourceFile): CodeSignature[] {
    const interfaces = sourceFile.getInterfaces();
    return interfaces
      .filter((iface) => this.isExported(iface))
      .map((iface) => ({
        symbolName: iface.getName(),
        symbolType: SymbolType.INTERFACE,
        signatureText: this.normalizeText(iface.getText()),
        isExported: true,
      }));
  }

  private extractTypeAliases(sourceFile: SourceFile): CodeSignature[] {
    const typeAliases = sourceFile.getTypeAliases();
    return typeAliases
      .filter((type) => this.isExported(type))
      .map((type) => ({
        symbolName: type.getName(),
        symbolType: SymbolType.TYPE_ALIAS,
        signatureText: this.normalizeText(type.getText()),
        isExported: true,
      }));
  }

  private extractEnums(sourceFile: SourceFile): CodeSignature[] {
    const enums = sourceFile.getEnums();
    return enums
      .filter((en) => this.isExported(en))
      .map((en) => ({
        symbolName: en.getName(),
        symbolType: SymbolType.ENUM,
        signatureText: this.normalizeText(en.getText()),
        isExported: true,
      }));
  }

  private extractVariables(sourceFile: SourceFile): CodeSignature[] {
    const variableStatements = sourceFile.getVariableStatements();
    const signatures: CodeSignature[] = [];

    for (const statement of variableStatements) {
      if (!this.isExported(statement)) continue;

      const declarations = statement.getDeclarations();
      for (const decl of declarations) {
        const name = decl.getName();
        const isConst = statement.getDeclarationKind() === 'const';

        signatures.push({
          symbolName: name,
          symbolType: isConst ? SymbolType.CONST : SymbolType.VARIABLE,
          signatureText: this.normalizeText(decl.getText()),
          isExported: true,
        });
      }
    }

    return signatures;
  }

  private isExported(node: Node): boolean {
    // Use ts-morph's built-in isExported method if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (node as any).isExported === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (node as any).isExported();
    }

    // Fallback: check for export keyword
    return node.getChildrenOfKind(SyntaxKind.ExportKeyword).length > 0;
  }

  private normalizeFunctionSignature(fn: FunctionDeclaration): string {
    const body = fn.getBody();
    if (body) {
      // Get text from start of function to start of body
      // We use getFullText() to ensure we are working with the same coordinate system if needed,
      // but here we want the text relative to the node.
      // fn.getText() returns the text of the node.
      // We need the length of the signature part.
      const signatureLength = body.getStart() - fn.getStart();
      const text = fn.getText().substring(0, signatureLength);
      return this.normalizeText(text);
    }
    return this.normalizeText(fn.getText());
  }

  private normalizeClassSignature(cls: ClassDeclaration): string {
    // Extract class header and public methods/properties
    const className = cls.getName();
    const methods = cls
      .getMethods()
      .filter((m: MethodDeclaration) => !m.hasModifier(SyntaxKind.PrivateKeyword))
      .map((m: MethodDeclaration) => {
        const name = m.getName();
        const params = m.getParameters().map((p: ParameterDeclaration) => {
          const paramName = p.getName();
          const paramType = p.getType().getText();
          return `${paramName}: ${paramType}`;
        }).join(', ');
        const returnType = m.getReturnType().getText();
        return `${name}(${params}): ${returnType}`;
      });

    const properties = cls
      .getProperties()
      .filter((p: PropertyDeclaration) => !p.hasModifier(SyntaxKind.PrivateKeyword))
      .map((p: PropertyDeclaration) => {
        const name = p.getName();
        const type = p.getType().getText();
        return `${name}: ${type}`;
      });

    const signature = `class ${className} { ${properties.join('; ')}; ${methods.join('; ')} }`;
    return this.normalizeText(signature);
  }

  private normalizeText(text: string): string {
    // Normalize whitespace and remove comments
    return text
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*/g, '') // Remove single-line comments
      .replace(/import\(".*?"\)\./g, '') // Remove absolute import paths from types
      .replace(/\s+/g, ' ') // Normalize whitespace to single space
      .replace(/\s*([:()[\]{},;])\s*/g, '$1') // Remove whitespace around punctuation
      .replace(/\s*:\s*/g, ': ') // Ensure consistent spacing after colons
      .replace(/,\s*/g, ', ') // Ensure consistent spacing after commas
      .trim();
  }
}
