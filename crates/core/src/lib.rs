#![deny(clippy::all)]

use napi_derive::napi;

/// AST Analyzer for TypeScript/JavaScript code
#[napi]
pub struct AstAnalyzer {
    config: String,
}

#[napi]
impl AstAnalyzer {
    /// Create a new AST analyzer instance
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            config: String::from("default"),
        }
    }

    /// Analyze a TypeScript/JavaScript file and return information
    ///
    /// This is a placeholder that returns a hello world message.
    /// In the future, this will parse the file and extract symbols.
    #[napi]
    pub fn analyze_file(&self, file_path: String) -> String {
        format!("Hello from Rust! Analyzing file: {}", file_path)
    }

    /// Get a list of exported symbols from a file (placeholder)
    #[napi]
    pub fn get_symbols(&self, _file_path: String) -> Vec<String> {
        vec![
            "function1".to_string(),
            "function2".to_string(),
            "MyClass".to_string(),
        ]
    }
}

/// Simple hello world function to test the napi binding
#[napi]
pub fn hello_world() -> String {
    "Hello from Doctype Rust Core! 🦀".to_string()
}

/// Get version information
#[napi]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
