//! AST Analyzer for TypeScript/JavaScript code using Oxc
//!
//! This module analyzes TypeScript/JavaScript source code to extract
//! public API signatures (functions, classes, interfaces, types, etc.)
//! using the Oxc parser for high performance.

use crate::types::{CodeSignature, SymbolType};
use oxc_allocator::Allocator;
use oxc_ast::ast::*;
use oxc_ast::visit::walk;
use oxc_ast::Visit;
use oxc_parser::{Parser, ParserReturn};
use oxc_semantic::ScopeFlags;
use oxc_span::SourceType;
use regex::Regex;
use std::path::Path;
use std::sync::OnceLock;

/// Information about a symbol found in the code
#[derive(Debug, Clone)]
pub struct SymbolInfo {
    /// Name of the symbol
    pub name: String,
    /// Type of symbol
    pub symbol_type: SymbolType,
    /// Full signature text
    pub signature: String,
    /// Whether it's exported
    pub is_exported: bool,
    /// File path where it was found
    pub file_path: String,
}

/// Result of analyzing a source file
#[derive(Debug, Clone)]
pub struct AnalysisResult {
    /// All symbols found in the file
    pub symbols: Vec<SymbolInfo>,
    /// Errors encountered during analysis
    pub errors: Vec<String>,
}

/// Global regex cache - compiled once and reused across all analyzer instances
struct NormalizationRegexes {
    multi_line_comment: Regex,
    single_line_comment: Regex,
    import_paths: Regex,
    whitespace: Regex,
}

impl NormalizationRegexes {
    fn new() -> Self {
        Self {
            multi_line_comment: Regex::new(r"/\*[\s\S]*?\*/").unwrap(),
            single_line_comment: Regex::new(r"//.*").unwrap(),
            import_paths: Regex::new(r#"import\(".*?"\)\."#).unwrap(),
            whitespace: Regex::new(r"\s+").unwrap(),
        }
    }
}

/// Static regex cache - initialized once on first use
static NORMALIZE_REGEX: OnceLock<NormalizationRegexes> = OnceLock::new();

/// Get the global regex cache, initializing it if necessary
fn get_normalize_regex() -> &'static NormalizationRegexes {
    NORMALIZE_REGEX.get_or_init(NormalizationRegexes::new)
}

/// Internal AST analyzer (pure Rust logic)
pub struct AstAnalyzerInternal;

impl AstAnalyzerInternal {
    /// Create a new AST analyzer
    pub fn new() -> Self {
        Self
    }

    /// Analyze a TypeScript/JavaScript file
    pub fn analyze_file(&self, file_path: &str, content: &str) -> AnalysisResult {
        let allocator = Allocator::default();

        // Determine source type from file extension
        let source_type = self.determine_source_type(file_path);

        // Parse the source code
        let parser = Parser::new(&allocator, content, source_type);
        let ParserReturn {
            program,
            errors: parse_errors,
            ..
        } = parser.parse();

        let mut errors = Vec::new();
        for error in parse_errors {
            errors.push(format!("Parse error: {}", error));
        }

        // Visit the AST and extract symbols
        let mut visitor = SymbolExtractor::new(file_path, content);
        visitor.visit_program(&program);

        let mut symbols = visitor.symbols;

        // Normalize signatures
        for symbol in &mut symbols {
            symbol.signature = self.normalize_text(&symbol.signature);
        }

        AnalysisResult { symbols, errors }
    }

    /// Analyze source code directly (without file path context)
    pub fn analyze_code(&self, code: &str) -> AnalysisResult {
        self.analyze_file("inline.ts", code)
    }

    /// Extract signature from a symbol
    pub fn extract_signature(&self, symbol: &SymbolInfo) -> CodeSignature {
        CodeSignature {
            symbol_name: symbol.name.clone(),
            symbol_type: symbol.symbol_type.clone(),
            signature_text: symbol.signature.clone(),
            is_exported: symbol.is_exported,
            hash: None, // Hash will be computed by the NAPI layer
        }
    }

    fn determine_source_type(&self, file_path: &str) -> SourceType {
        let path = Path::new(file_path);
        let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("");

        match extension {
            "ts" => SourceType::ts(),
            "tsx" => SourceType::tsx(),
            "jsx" => SourceType::jsx(),
            "mts" => SourceType::ts().with_module(true),
            "cts" => SourceType::ts().with_module(false),
            _ => SourceType::default(),
        }
    }

    fn normalize_text(&self, text: &str) -> String {
        let regex = get_normalize_regex();
        let text = regex.multi_line_comment.replace_all(text, "");
        let text = regex.single_line_comment.replace_all(&text, "");
        let text = regex.import_paths.replace_all(&text, "");
        let text = regex.whitespace.replace_all(&text, " ");

        // Normalize punctuation spacing
        let text = text
            .replace(" : ", ": ")
            .replace(" (", "(")
            .replace("( ", "(")
            .replace(" )", ")")
            .replace(") ", ")")
            .replace(" [", "[")
            .replace("[ ", "[")
            .replace(" ]", "]")
            .replace("] ", "]")
            .replace(" {", "{")
            .replace("{ ", "{")
            .replace(" }", "}")
            .replace("} ", "}")
            .replace(" ,", ",")
            .replace(" ;", ";")
            .replace(",", ", ")
            .replace(";", "; ");

        text.trim().to_string()
    }
}

impl Default for AstAnalyzerInternal {
    fn default() -> Self {
        Self::new()
    }
}

/// Visitor that extracts symbols from the AST
struct SymbolExtractor<'a> {
    symbols: Vec<SymbolInfo>,
    file_path: String,
    source_text: &'a str,
    current_export: bool,
}

impl<'a> SymbolExtractor<'a> {
    fn new(file_path: &str, source_text: &'a str) -> Self {
        Self {
            symbols: Vec::new(),
            file_path: file_path.to_string(),
            source_text,
            current_export: false,
        }
    }

    fn extract_text(&self, start: u32, end: u32) -> String {
        let start = start as usize;
        let end = end as usize;
        self.source_text.get(start..end)
            .unwrap_or("")
            .to_string()
    }

    fn extract_function_signature(&self, func: &Function, _name: &str) -> String {
        // Find the body start position to extract just the signature
        if let Some(body) = &func.body {
            let signature_end = body.span.start;
            self.extract_text(func.span.start, signature_end)
        } else {
            self.extract_text(func.span.start, func.span.end)
        }
    }

    fn extract_class_signature(&self, class: &Class, class_name: &str) -> String {
        let mut signature = String::from("class ");

        // Add class name
        signature.push_str(class_name);

        // Add type parameters (generics) if present
        if let Some(type_params) = &class.type_parameters {
            let generics = self.extract_text(type_params.span.start, type_params.span.end);
            signature.push_str(&generics);
        }

        signature.push_str(" { ");

        let mut members = Vec::new();

        // Extract class members (properties and methods)
        for element in &class.body.body {
            match element {
                ClassElement::PropertyDefinition(prop) => {
                    if let PropertyKey::StaticIdentifier(ident) = &prop.key {
                        // Skip truly private properties (with # prefix or starting with _)
                        let prop_name = &ident.name;
                        if prop_name.starts_with('_') {
                            continue;
                        }

                        let mut prop_sig = String::new();

                        // Add modifiers
                        if prop.r#static {
                            prop_sig.push_str("static ");
                        }
                        if prop.readonly {
                            prop_sig.push_str("readonly ");
                        }

                        // Add property name
                        prop_sig.push_str(prop_name);

                        // Add type annotation
                        if let Some(type_ann) = &prop.type_annotation {
                            prop_sig.push_str(": ");
                            let type_text = self.extract_text(type_ann.span.start, type_ann.span.end);
                            // Remove ": " prefix if present in extracted text
                            let type_text = type_text.strip_prefix(": ").unwrap_or(&type_text);
                            prop_sig.push_str(type_text);
                        } else {
                            prop_sig.push_str(": any");
                        }

                        members.push(prop_sig);
                    }
                }
                ClassElement::MethodDefinition(method) => {
                    if let PropertyKey::StaticIdentifier(ident) = &method.key {
                        let method_name = &ident.name;
                        // Skip private methods
                        if method_name.starts_with('_') {
                            continue;
                        }

                        // Extract full method signature from source
                        let method_text = self.extract_text(method.span.start, method.span.end);

                        // Extract just the signature (everything before the body)
                        let signature_part = if let Some(body_start) = method_text.find('{') {
                            method_text[..body_start].trim()
                        } else {
                            // Abstract method or declaration
                            method_text.trim()
                        };

                        members.push(signature_part.to_string());
                    }
                }
                _ => {
                    // Handle other elements like accessors, static blocks, etc.
                }
            }
        }

        signature.push_str(&members.join("; "));
        signature.push_str(" }");

        signature
    }
}

impl<'a> Visit<'a> for SymbolExtractor<'a> {
    fn visit_export_named_declaration(&mut self, decl: &ExportNamedDeclaration<'a>) {
        self.current_export = true;
        walk::walk_export_named_declaration(self, decl);
        self.current_export = false;
    }

    fn visit_export_default_declaration(&mut self, decl: &ExportDefaultDeclaration<'a>) {
        self.current_export = true;
        walk::walk_export_default_declaration(self, decl);
        self.current_export = false;
    }

    fn visit_function(&mut self, func: &Function<'a>, flags: ScopeFlags) {
        if let Some(id) = &func.id {
            let is_exported = self.current_export;
            let name = id.name.as_str();
            let signature = self.extract_function_signature(func, name);

            self.symbols.push(SymbolInfo {
                name: name.to_string(),
                symbol_type: SymbolType::Function,
                signature,
                is_exported,
                file_path: self.file_path.clone(),
            });
        }

        walk::walk_function(self, func, flags);
    }

    fn visit_class(&mut self, class: &Class<'a>) {
        if let Some(id) = &class.id {
            let is_exported = self.current_export;
            let name = id.name.as_str();
            let signature = self.extract_class_signature(class, name);

            self.symbols.push(SymbolInfo {
                name: name.to_string(),
                symbol_type: SymbolType::Class,
                signature,
                is_exported,
                file_path: self.file_path.clone(),
            });
        }

        walk::walk_class(self, class);
    }

    fn visit_ts_interface_declaration(&mut self, decl: &TSInterfaceDeclaration<'a>) {
        let is_exported = self.current_export;
        let name = decl.id.name.as_str();
        let signature = self.extract_text(decl.span.start, decl.span.end);

        self.symbols.push(SymbolInfo {
            name: name.to_string(),
            symbol_type: SymbolType::Interface,
            signature,
            is_exported,
            file_path: self.file_path.clone(),
        });

        walk::walk_ts_interface_declaration(self, decl);
    }

    fn visit_ts_type_alias_declaration(&mut self, decl: &TSTypeAliasDeclaration<'a>) {
        let is_exported = self.current_export;
        let name = decl.id.name.as_str();
        let signature = self.extract_text(decl.span.start, decl.span.end);

        self.symbols.push(SymbolInfo {
            name: name.to_string(),
            symbol_type: SymbolType::TypeAlias,
            signature,
            is_exported,
            file_path: self.file_path.clone(),
        });

        walk::walk_ts_type_alias_declaration(self, decl);
    }

    fn visit_ts_enum_declaration(&mut self, decl: &TSEnumDeclaration<'a>) {
        let is_exported = self.current_export;
        let name = decl.id.name.as_str();
        let signature = self.extract_text(decl.span.start, decl.span.end);

        self.symbols.push(SymbolInfo {
            name: name.to_string(),
            symbol_type: SymbolType::Enum,
            signature,
            is_exported,
            file_path: self.file_path.clone(),
        });

        walk::walk_ts_enum_declaration(self, decl);
    }

    fn visit_variable_declaration(&mut self, decl: &VariableDeclaration<'a>) {
        let is_exported = self.current_export;
        let is_const = decl.kind == VariableDeclarationKind::Const;

        for declarator in &decl.declarations {
            if let BindingPatternKind::BindingIdentifier(id) = &declarator.id.kind {
                let name = id.name.as_str();
                let signature = self.extract_text(declarator.span.start, declarator.span.end);

                self.symbols.push(SymbolInfo {
                    name: name.to_string(),
                    symbol_type: if is_const {
                        SymbolType::Const
                    } else {
                        SymbolType::Variable
                    },
                    signature,
                    is_exported,
                    file_path: self.file_path.clone(),
                });
            }
        }

        walk::walk_variable_declaration(self, decl);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyzer_creation() {
        let analyzer = AstAnalyzerInternal::new();
        let result = analyzer.analyze_code("");
        assert_eq!(result.symbols.len(), 0);
    }

    #[test]
    fn test_analyze_function() {
        let analyzer = AstAnalyzerInternal::new();
        let code = "export function hello(name: string): string { return 'Hello ' + name; }";
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "hello");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::Function);
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_analyze_class() {
        let analyzer = AstAnalyzerInternal::new();
        let code = r#"
            export class MyClass {
                public name: string;
                constructor(name: string) {
                    this.name = name;
                }
                greet(): void {
                    console.log('Hello');
                }
            }
        "#;
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "MyClass");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::Class);
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_analyze_interface() {
        let analyzer = AstAnalyzerInternal::new();
        let code = "export interface User { name: string; age: number; }";
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "User");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::Interface);
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_analyze_type_alias() {
        let analyzer = AstAnalyzerInternal::new();
        let code = "export type ID = string | number;";
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "ID");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::TypeAlias);
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_analyze_enum() {
        let analyzer = AstAnalyzerInternal::new();
        let code = "export enum Color { Red, Green, Blue }";
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "Color");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::Enum);
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_analyze_const() {
        let analyzer = AstAnalyzerInternal::new();
        let code = "export const API_KEY = 'secret';";
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "API_KEY");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::Const);
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_class_with_generics() {
        let analyzer = AstAnalyzerInternal::new();
        let code = r#"
            export class Container<T> {
                value: T;
                getValue(): T {
                    return this.value;
                }
            }
        "#;
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "Container");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::Class);
        assert!(result.symbols[0].signature.contains("<T>"));
        assert!(result.symbols[0].is_exported);
    }

    #[test]
    fn test_class_with_readonly_and_static() {
        let analyzer = AstAnalyzerInternal::new();
        let code = r#"
            export class Config {
                readonly apiUrl: string;
                static defaultTimeout: number;

                constructor(apiUrl: string) {
                    this.apiUrl = apiUrl;
                }
            }
        "#;
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        let signature = &result.symbols[0].signature;
        assert!(signature.contains("readonly"));
        assert!(signature.contains("static"));
    }

    #[test]
    fn test_complex_generics() {
        let analyzer = AstAnalyzerInternal::new();
        let code = "export type Response<T> = Array<Record<string, T>>;";
        let result = analyzer.analyze_code(code);

        assert_eq!(result.symbols.len(), 1);
        assert_eq!(result.symbols[0].name, "Response");
        assert_eq!(result.symbols[0].symbol_type, SymbolType::TypeAlias);
        // The signature should include the complex generic type
        assert!(result.symbols[0].signature.contains("Array"));
        assert!(result.symbols[0].signature.contains("Record"));
    }

    #[test]
    fn test_multiple_analyzer_instances() {
        // Test that OnceLock works correctly across multiple instances
        let analyzer1 = AstAnalyzerInternal::new();
        let analyzer2 = AstAnalyzerInternal::new();

        let code = "export function test() {}";

        let result1 = analyzer1.analyze_code(code);
        let result2 = analyzer2.analyze_code(code);

        // Both should produce the same result
        assert_eq!(result1.symbols.len(), result2.symbols.len());
        assert_eq!(result1.symbols[0].signature, result2.symbols[0].signature);
    }
}
