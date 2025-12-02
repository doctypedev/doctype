#![deny(clippy::all)]

use napi_derive::napi;

mod ast_analyzer;

pub use ast_analyzer::{AstAnalyzer, CodeSignature, SymbolType};
