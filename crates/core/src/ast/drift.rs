//! Drift detection module
//!
//! This module compares current code signatures with saved hashes
//! to detect when documentation has drifted out of sync with the code.

use std::collections::HashMap;
use crate::types::{CodeSignature, DoctypeMapEntry};
use crate::ast::hasher::SignatureHasher;

/// Status of drift detection for a symbol
#[derive(Debug, Clone, PartialEq)]
pub enum DriftStatus {
    /// No drift detected - hash matches
    InSync,
    /// Drift detected - signature has changed
    Drifted {
        old_hash: String,
        new_hash: String,
    },
    /// Symbol not found in map
    NotTracked,
    /// Symbol was tracked but no longer exists in code
    Removed,
}

/// Result of drift detection
#[derive(Debug, Clone)]
pub struct DriftResult {
    /// Total number of symbols checked
    pub total_symbols: usize,
    /// Number of symbols in sync
    pub in_sync: usize,
    /// Number of symbols that have drifted
    pub drifted: usize,
    /// Number of symbols not tracked
    pub not_tracked: usize,
    /// Number of tracked symbols that were removed
    pub removed: usize,
    /// Detailed drift status for each symbol
    pub symbol_status: HashMap<String, DriftStatus>,
}

impl DriftResult {
    /// Check if any drift was detected
    pub fn has_drift(&self) -> bool {
        self.drifted > 0 || self.removed > 0
    }

    /// Get a summary message
    pub fn summary(&self) -> String {
        if !self.has_drift() {
            format!("✓ All {} symbols are in sync", self.in_sync)
        } else {
            format!(
                "⚠ Drift detected: {} drifted, {} removed, {} in sync",
                self.drifted, self.removed, self.in_sync
            )
        }
    }
}

/// Drift detector for comparing signatures with saved hashes
pub struct DriftDetector {
    /// Map of symbol IDs to their saved entries
    saved_map: HashMap<String, DoctypeMapEntry>,
}

impl DriftDetector {
    /// Create a new drift detector
    ///
    /// # Arguments
    /// * `entries` - The saved doctype map entries to compare against
    pub fn new(entries: Vec<DoctypeMapEntry>) -> Self {
        let mut saved_map = HashMap::new();
        for entry in entries {
            let key = format!("{}#{}", entry.code_ref.file_path, entry.code_ref.symbol_name);
            saved_map.insert(key, entry);
        }

        Self { saved_map }
    }

    /// Check drift for a single signature
    ///
    /// # Arguments
    /// * `file_path` - Path to the source file
    /// * `signature` - Current signature from the code
    ///
    /// # Returns
    /// DriftStatus indicating whether the signature has drifted
    pub fn check_signature(&self, file_path: &str, signature: &CodeSignature) -> DriftStatus {
        let key = format!("{}#{}", file_path, signature.symbol_name);

        match self.saved_map.get(&key) {
            Some(saved_entry) => {
                let hasher = SignatureHasher::new();
                let hash_result = hasher.hash(signature.clone());
                let new_hash = hash_result.hash;

                if new_hash == saved_entry.code_signature_hash {
                    DriftStatus::InSync
                } else {
                    DriftStatus::Drifted {
                        old_hash: saved_entry.code_signature_hash.clone(),
                        new_hash,
                    }
                }
            }
            None => DriftStatus::NotTracked,
        }
    }

    /// Check drift for multiple signatures
    ///
    /// # Arguments
    /// * `file_path` - Path to the source file
    /// * `signatures` - Current signatures from the code
    ///
    /// # Returns
    /// DriftResult with complete drift analysis
    pub fn check_file(&self, file_path: &str, signatures: &[CodeSignature]) -> DriftResult {
        let mut symbol_status = HashMap::new();
        let mut in_sync = 0;
        let mut drifted = 0;
        let mut not_tracked = 0;

        // Check each current signature
        for signature in signatures {
            let status = self.check_signature(file_path, signature);

            match &status {
                DriftStatus::InSync => in_sync += 1,
                DriftStatus::Drifted { .. } => drifted += 1,
                DriftStatus::NotTracked => not_tracked += 1,
                DriftStatus::Removed => {} // Should not happen here
            }

            let key = format!("{}#{}", file_path, signature.symbol_name);
            symbol_status.insert(key, status);
        }

        // Check for removed symbols (in map but not in current signatures)
        let mut removed = 0;
        for (key, _) in &self.saved_map {
            if key.starts_with(file_path) && !symbol_status.contains_key(key) {
                symbol_status.insert(key.clone(), DriftStatus::Removed);
                removed += 1;
            }
        }

        DriftResult {
            total_symbols: signatures.len(),
            in_sync,
            drifted,
            not_tracked,
            removed,
            symbol_status,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolType, CodeRef, DocRef};

    fn create_test_entry(
        file_path: &str,
        symbol_name: &str,
        hash: &str,
    ) -> DoctypeMapEntry {
        DoctypeMapEntry {
            id: "test-id".to_string(),
            code_ref: CodeRef {
                file_path: file_path.to_string(),
                symbol_name: symbol_name.to_string(),
            },
            code_signature_hash: hash.to_string(),
            code_signature_text: Some("test signature".to_string()),
            doc_ref: DocRef {
                file_path: "test.md".to_string(),
                start_line: 1,
                end_line: 10,
            },
            original_markdown_content: "test content".to_string(),
            last_updated: 0.0,
        }
    }

    #[test]
    fn test_drift_detection() {
        let sig = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): void".to_string(),
            is_exported: true,
            hash: None,
        };

        let hasher = SignatureHasher::new();
        let hash_result = hasher.hash(sig.clone());
        let entry = create_test_entry("test.ts", "test", &hash_result.hash);

        let detector = DriftDetector::new(vec![entry]);
        let status = detector.check_signature("test.ts", &sig);

        assert_eq!(status, DriftStatus::InSync);
    }

    #[test]
    fn test_drift_detected() {
        let old_sig = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): void".to_string(),
            is_exported: true,
            hash: None,
        };

        let new_sig = CodeSignature {
            symbol_name: "test".to_string(),
            symbol_type: SymbolType::Function,
            signature_text: "function test(): string".to_string(), // Changed return type
            is_exported: true,
            hash: None,
        };

        let hasher = SignatureHasher::new();
        let hash_result = hasher.hash(old_sig.clone());
        let entry = create_test_entry("test.ts", "test", &hash_result.hash);

        let detector = DriftDetector::new(vec![entry]);
        let status = detector.check_signature("test.ts", &new_sig);

        match status {
            DriftStatus::Drifted { .. } => {
                // Test passes
            }
            _ => panic!("Expected Drifted status"),
        }
    }
}
