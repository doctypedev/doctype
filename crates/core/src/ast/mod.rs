//! AST & Drift Detection module
//!
//! This module handles:
//! - TypeScript/JavaScript AST analysis
//! - Code signature extraction
//! - Signature hashing (SHA256)
//! - Drift detection by comparing hashes

pub mod analyzer;
pub mod hasher;
pub mod drift;

// Re-export commonly used types
pub use analyzer::{AstAnalyzerInternal, SymbolInfo, AnalysisResult};
pub use hasher::SignatureHasher;
pub use drift::{DriftDetector, DriftResult, DriftStatus};
