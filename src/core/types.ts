/**
 * Core type definitions for Doctype
 */

/**
 * Reference to a code symbol in the source code
 */
export interface CodeRef {
  /** Absolute path to the source file */
  filePath: string;
  /** Name of the symbol (function, class, interface, etc.) */
  symbolName: string;
}

/**
 * Signature information extracted from code
 */
export interface CodeSignature {
  /** Name of the symbol */
  symbolName: string;
  /** Type of the symbol (function, class, interface, type, etc.) */
  symbolType: SymbolType;
  /** The actual signature text (normalized) */
  signatureText: string;
  /** Whether the symbol is exported */
  isExported: boolean;
}

/**
 * Types of symbols we track
 */
export enum SymbolType {
  FUNCTION = 'function',
  CLASS = 'class',
  INTERFACE = 'interface',
  TYPE_ALIAS = 'type',
  ENUM = 'enum',
  VARIABLE = 'variable',
  CONST = 'const',
}

/**
 * Hash information for a code signature
 */
export interface SignatureHash {
  /** SHA256 hash of the signature */
  hash: string;
  /** Original signature that was hashed */
  signature: CodeSignature;
  /** Timestamp when hash was generated */
  timestamp: number;
}

/**
 * Reference to documentation location
 */
export interface DocRef {
  /** Path to the markdown file */
  filePath: string;
  /** Line number where the anchor starts */
  startLine: number;
  /** Line number where the anchor ends */
  endLine: number;
}

/**
 * Complete mapping entry in doctype-map.json
 */
export interface DoctypeMapEntry {
  /** Unique identifier for this anchor */
  id: string;
  /** Reference to the code */
  codeRef: CodeRef;
  /** Hash of the code signature */
  codeSignatureHash: string;
  /** Reference to the documentation */
  docRef: DocRef;
  /** Original markdown content between anchors */
  originalMarkdownContent: string;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * The complete doctype-map.json structure
 */
export interface DoctypeMap {
  /** Schema version for future compatibility */
  version: string;
  /** All tracked documentation anchors */
  entries: DoctypeMapEntry[];
}
