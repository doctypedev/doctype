//! Signature hashing module
//!
//! This module handles the deterministic hashing of code signatures
//! using SHA256. This is the core of drift detection - when a signature
//! changes, its hash will change, triggering documentation updates.

use sha2::{Sha256, Digest};
use crate::types::{CodeSignature, SignatureHash, SymbolType};

/// Signature hasher for generating deterministic hashes
pub struct SignatureHasher;

impl SignatureHasher {
    /// Create a new signature hasher
    pub fn new() -> Self {
        Self
    }

    /// Generate a SignatureHash object from a code signature
    ///
    /// This is the main API that matches the TypeScript SignatureHasher.hash() method
    ///
    /// # Arguments
    /// * `signature` - The code signature to hash
    ///
    /// # Returns
    /// A SignatureHash object containing the hash, signature, and timestamp
    pub fn hash(&self, signature: CodeSignature) -> SignatureHash {
        let hash = self.generate_hash(&signature);
        SignatureHash {
            hash,
            signature,
            timestamp: Self::current_timestamp_millis(),
        }
    }

    /// Generate SignatureHash objects for multiple signatures (batch operation)
    ///
    /// # Arguments
    /// * `signatures` - Vector of code signatures to hash
    ///
    /// # Returns
    /// Vector of SignatureHash objects
    pub fn hash_many(&self, signatures: Vec<CodeSignature>) -> Vec<SignatureHash> {
        signatures.into_iter().map(|sig| self.hash(sig)).collect()
    }

    /// Compare two hash strings for equality
    ///
    /// # Arguments
    /// * `hash1` - First hash string
    /// * `hash2` - Second hash string
    ///
    /// # Returns
    /// True if hashes match, false otherwise
    pub fn compare(&self, hash1: &str, hash2: &str) -> bool {
        hash1 == hash2
    }

    /// Generate a SHA256 hash directly from signature text (for quick comparison)
    ///
    /// # Arguments
    /// * `signature_text` - The signature text to hash
    ///
    /// # Returns
    /// SHA256 hash string
    pub fn hash_text(&self, signature_text: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(signature_text.as_bytes());
        let result = hasher.finalize();
        format!("{:x}", result)
    }

    /// Generate a SHA256 hash of a code signature (internal method)
    ///
    /// This is kept for backwards compatibility with existing code
    ///
    /// # Arguments
    /// * `signature` - The code signature to hash
    ///
    /// # Returns
    /// A hexadecimal string representation of the SHA256 hash
    fn generate_hash(&self, signature: &CodeSignature) -> String {
        // Create a deterministic string representation of the signature
        let signature_string = self.serialize_signature(signature);

        // Generate SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(signature_string.as_bytes());
        let result = hasher.finalize();

        // Convert to hex string
        format!("{:x}", result)
    }

    /// Serialize a signature to ensure deterministic hashing
    ///
    /// This must match the TypeScript implementation exactly to ensure
    /// compatibility between old and new code:
    ///
    /// ```typescript
    /// const parts = [
    ///   `name:${signature.symbolName}`,
    ///   `type:${signature.symbolType}`,
    ///   `exported:${signature.isExported}`,
    ///   `signature:${signature.signatureText}`,
    /// ];
    /// return parts.join('|');
    /// ```
    fn serialize_signature(&self, signature: &CodeSignature) -> String {
        let parts = vec![
            format!("name:{}", signature.symbol_name),
            format!("type:{}", self.symbol_type_to_string(signature.symbol_type)),
            format!("exported:{}", signature.is_exported),
            format!("signature:{}", signature.signature_text),
        ];
        parts.join("|")
    }

    /// Convert SymbolType to string representation (matches TypeScript enum values)
    fn symbol_type_to_string(&self, symbol_type: SymbolType) -> &'static str {
        match symbol_type {
            SymbolType::Function => "Function",
            SymbolType::Class => "Class",
            SymbolType::Interface => "Interface",
            SymbolType::TypeAlias => "TypeAlias",
            SymbolType::Enum => "Enum",
            SymbolType::Variable => "Variable",
            SymbolType::Const => "Const",
        }
    }

    /// Get current timestamp in milliseconds (matches JavaScript Date.now())
    fn current_timestamp_millis() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    }
}

impl Default for SignatureHasher {
    fn default() -> Self {
        Self::new()
    }
}

/// Convenience function to hash a signature (deprecated, use hash() method instead)
///
/// # Arguments
/// * `signature` - The code signature to hash
///
/// # Returns
/// A hexadecimal string representation of the SHA256 hash
#[deprecated(note = "Use SignatureHasher::new().hash() instead")]
pub fn hash_signature(signature: &CodeSignature) -> String {
    let hasher = SignatureHasher::new();
    hasher.generate_hash(signature)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SymbolType;

    #[test]
    fn test_hash_method() {
        let sig = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): void".to_string(),
            is_exported: true,
            hash: None,
        };

        let hasher = SignatureHasher::new();
        let result = hasher.hash(sig.clone());

        // Hash should be 64 hex characters (256 bits)
        assert_eq!(result.hash.len(), 64);

        // Should include the signature
        assert_eq!(result.signature.symbol_name, "test");

        // Should have a timestamp
        assert!(result.timestamp > 0);
    }

    #[test]
    fn test_same_signature_same_hash() {
        let sig1 = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): void".to_string(),
            is_exported: true,
            hash: None,
        };

        let sig2 = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): void".to_string(),
            is_exported: true,
            hash: None,
        };

        let hasher = SignatureHasher::new();
        let hash1 = hasher.hash(sig1);
        let hash2 = hasher.hash(sig2);

        // Same signature should produce same hash
        assert_eq!(hash1.hash, hash2.hash);
    }

    #[test]
    fn test_different_signatures_different_hashes() {
        let sig1 = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): void".to_string(),
            is_exported: true,
            hash: None,
        };

        let sig2 = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): string".to_string(), // Different return type
            is_exported: true,
            hash: None,
        };

        let hasher = SignatureHasher::new();
        let hash1 = hasher.hash(sig1);
        let hash2 = hasher.hash(sig2);

        // Different signatures should produce different hashes
        assert_ne!(hash1.hash, hash2.hash);
    }

    #[test]
    fn test_hash_many() {
        let signatures = vec![
            CodeSignature {
                symbol_name: "func1".to_string(),
                symbol_type: SymbolType::Function,
                signature_text: "function func1(): void".to_string(),
                is_exported: true,
                hash: None,
            },
            CodeSignature {
                symbol_name: "func2".to_string(),
                symbol_type: SymbolType::Function,
                signature_text: "function func2(): string".to_string(),
                is_exported: true,
                hash: None,
            },
        ];

        let hasher = SignatureHasher::new();
        let results = hasher.hash_many(signatures);

        assert_eq!(results.len(), 2);
        assert_ne!(results[0].hash, results[1].hash);
    }

    #[test]
    fn test_compare() {
        let hasher = SignatureHasher::new();

        assert!(hasher.compare("abc123", "abc123"));
        assert!(!hasher.compare("abc123", "def456"));
    }

    #[test]
    fn test_hash_text() {
        let hasher = SignatureHasher::new();
        let hash1 = hasher.hash_text("function test(): void");
        let hash2 = hasher.hash_text("function test(): void");
        let hash3 = hasher.hash_text("function test(): string");

        // Same text should produce same hash
        assert_eq!(hash1, hash2);

        // Different text should produce different hash
        assert_ne!(hash1, hash3);

        // Hash should be 64 hex characters
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_serialization_format() {
        let sig = CodeSignature {
            symbol_name: "myFunc".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function myFunc(x: number): string".to_string(),
            is_exported: true,
            hash: None,
        };

        let hasher = SignatureHasher::new();
        let serialized = hasher.serialize_signature(&sig);

        // Should match TypeScript format exactly
        assert_eq!(
            serialized,
            "name:myFunc|type:Function|exported:true|signature:function myFunc(x: number): string"
        );
    }
}
