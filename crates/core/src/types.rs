use napi_derive::napi;
use serde::Serialize;

/**
 * Core type definitions for Sintesi
 */

/**
 * Reference to a code symbol in the source code
 */
#[napi(object)]
#[derive(Debug, Serialize)]
pub struct CodeRef {
    /// Absolute path to the source file
    pub file_path: String,
    /// Name of the symbol (function, class, interface, etc.)
    pub symbol_name: String,
}

/**
 * Signature information extracted from code
 */
#[napi(object)]
#[derive(Debug, Serialize, Clone)]
pub struct CodeSignature {
    /// Name of the symbol
    pub symbol_name: String,
    /// Type of the symbol (function, class, interface, type, etc.)
    pub symbol_type: SymbolType,
    /// The actual signature text (normalized)
    pub signature_text: String,
    /// Whether the symbol is exported
    pub is_exported: bool,
    /// SHA256 hash of the signature (computed by Rust analyzer)
    pub hash: Option<String>,
}

/**
 * Types of symbols we track
 */
#[napi(string_enum)]
#[derive(Debug, PartialEq, Serialize)]
pub enum SymbolType {
    Function,
    Class,
    Interface,
    TypeAlias,
    Enum,
    Variable,
    Const,
}

/**
 * Hash information for a code signature
 */
#[napi(object)]
#[derive(Debug, Serialize)]
pub struct SignatureHash {
    /// SHA256 hash of the signature
    pub hash: String,
    /// Original signature that was hashed
    pub signature: CodeSignature,
    /// Timestamp when hash was generated (milliseconds since Unix epoch)
    pub timestamp: i64,
}

/**
 * Reference to documentation location
 */
#[napi(object)]
#[derive(Debug, Serialize)]
pub struct DocRef {
    /// Path to the markdown file
    pub file_path: String,
}

/**
 * Complete mapping entry in sintesi-map.json
 *
 * Note: Content is not stored here to avoid duplication.
 * The markdown file is the single source of truth for content.
 * Use the anchor ID to locate content between sintesi:start and sintesi:end tags.
 */
#[napi(object)]
#[derive(Debug, Serialize)]
pub struct SintesiMapEntry {
    /// Unique identifier for this anchor
    pub id: String,
    /// Reference to the code
    pub code_ref: CodeRef,
    /// Hash of the code signature
    pub code_signature_hash: String,
    /// The signature text (for AI context)
    pub code_signature_text: Option<String>,
    /// Reference to the documentation
    pub doc_ref: DocRef,
    /// Last updated timestamp
    pub last_updated: f64,
}

/**
 * The complete sintesi-map.json structure
 */
#[napi(object)]
#[derive(Debug, Serialize)]
pub struct SintesiMap {
    /// Schema version for future compatibility
    pub version: String,
    /// All tracked documentation anchors
    pub entries: Vec<SintesiMapEntry>,
}
