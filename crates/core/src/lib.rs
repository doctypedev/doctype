#![deny(clippy::all)]
#![doc = include_str!("../README.md")]

//! # Doctype Core
//!
//! Core Rust implementation for the Doctype documentation system.
//!
//! ## Architecture
//!
//! This crate is organized into four main modules following the Doctype architecture:
//!
//! ### 1. Types (`types`)
//! Core type definitions used across all modules. Includes:
//! - `CodeRef`, `CodeSignature`, `SignatureHash`
//! - `DocRef`, `DoctypeMapEntry`, `DoctypeMap`
//! - `SymbolType` enum
//!
//! ### 2. AST & Drift Detection (`ast`)
//! Static analysis and drift detection (Deterministic Logic):
//! - AST analysis for TypeScript/JavaScript
//! - Signature extraction and normalization
//! - SHA256 hashing for deterministic drift detection
//!
//! ### 3. Content & Mapping (`content`)
//! Markdown processing and file discovery:
//! - File discovery (source and markdown files)
//! - Markdown anchor extraction using pulldown-cmark
//! - Content injection into documentation
//!
//! ### 4. Gen AI Agent (`genai`)
//! LLM interaction for content generation (Probabilistic Logic):
//! - Prompt engineering
//! - API integration (OpenAI, Gemini, etc.)
//! - Documentation generation and updates
//!
//! ### 5. NAPI Bindings (`napi`)
//! Node.js bindings layer that exposes Rust functionality to JavaScript/TypeScript.
//! This layer is separate from the core logic to maintain clean architecture.

// ============================================================================
// Core Modules (Pure Rust Logic)
// ============================================================================

/// Core type definitions
pub mod types;

/// AST analysis and drift detection
pub mod ast;

/// Content management and markdown processing
pub mod content;

/// Filesystem crawler and project context
pub mod crawler;
pub mod graph;
pub mod context;

/// Gen AI agent for documentation generation
pub mod genai;

/// NAPI bindings for Node.js (separate layer)
mod napi;

// ============================================================================
// Re-exports for convenient access
// ============================================================================

// Types
pub use types::{
    CodeRef, CodeSignature, DocRef, DoctypeMap, DoctypeMapEntry, SignatureHash, SymbolType,
};

// AST & Drift Detection
pub use ast::{
    AstAnalyzerInternal, DriftDetector, DriftResult, DriftStatus, SignatureHasher,
};

// Content & Mapping
pub use content::{
    discover_files, extract_anchors, AnchorMap, DiscoveredFile, DiscoveryConfig, DiscoveryResult,
    DiscoveryStats, DoctypeAnchor, ExtractionResult, FileCollector, MarkdownExtractor,
};

// Gen AI
pub use genai::GenAiAgent;

// ============================================================================
// NAPI Exports (for Node.js)
// ============================================================================

// These are automatically exported by napi-rs and available in Node.js
// - napi::utils::hello_world()
// - napi::utils::get_version()
// - napi::ast::AstAnalyzer
// - napi::content::discover_files()
// - napi::content::FileDiscoveryResult
// - napi::content::FileDiscoveryOptions
