//! # Doctype Core
//!
//! Core Rust implementation for Doctype - AST analysis and signature hashing.
//!
//! This module will provide high-performance implementations of:
//! - AST analysis and parsing
//! - Code signature generation and hashing
//! - Drift detection algorithms
//!
//! ## Architecture
//!
//! The core is designed to be called from the TypeScript layer via FFI (Foreign Function Interface),
//! providing native performance for CPU-intensive operations while maintaining the existing
//! TypeScript CLI and workflow.

#![warn(missing_docs)]
#![warn(clippy::all)]

/// Module for AST analysis
pub mod ast;

/// Module for signature hashing
pub mod signature;

/// Module for drift detection
pub mod drift;

// Re-export main types for convenience
pub use ast::*;
pub use signature::*;
pub use drift::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        // Placeholder test
        assert_eq!(2 + 2, 4);
    }
}
