use napi_derive::napi;
use swc_core::common::{sync::Lrc, SourceMap, FileName, FilePathMapping, BytePos, Spanned};
use swc_core::ecma::parser::{Parser, StringInput, Syntax, TsSyntax, lexer::Lexer};
use swc_core::ecma::visit::{Visit, VisitWith};
use swc_core::ecma::ast::*;
use napi::bindgen_prelude::*;
use regex::Regex;
use std::sync::OnceLock;

// Static Regexes (compiled once)
static REGEX_MULTI_COMMENT: OnceLock<Regex> = OnceLock::new();
static REGEX_SINGLE_COMMENT: OnceLock<Regex> = OnceLock::new();
static REGEX_IMPORT: OnceLock<Regex> = OnceLock::new();
static REGEX_WHITESPACE: OnceLock<Regex> = OnceLock::new();
static REGEX_PUNCTUATION: OnceLock<Regex> = OnceLock::new();
static REGEX_COLON: OnceLock<Regex> = OnceLock::new();
static REGEX_COMMA: OnceLock<Regex> = OnceLock::new();

#[napi(string_enum)]
pub enum SymbolType {
    #[napi(value = "function")]
    Function,
    #[napi(value = "class")]
    Class,
    #[napi(value = "interface")]
    Interface,
    #[napi(value = "type")]
    TypeAlias,
    #[napi(value = "enum")]
    Enum,
    #[napi(value = "variable")]
    Variable,
    #[napi(value = "const")]
    Const,
}

#[napi(object)]
#[derive(Clone)]
pub struct CodeSignature {
    pub symbol_name: String,
    pub symbol_type: SymbolType,
    pub signature_text: String,
    pub is_exported: bool,
}

#[napi]
pub struct AstAnalyzer {
    source_map: Lrc<SourceMap>,
}

#[napi]
impl AstAnalyzer {
    #[napi(constructor)]
    pub fn new() -> Self {
        let cm = Lrc::new(SourceMap::new(FilePathMapping::empty()));
        Self { source_map: cm }
    }

    #[napi]
    pub fn analyze_code(&self, code: String) -> Result<Vec<CodeSignature>> {
        let fm = self.source_map.new_source_file(FileName::Anon.into(), code.clone());

        let config = TsSyntax {
            tsx: true,
            decorators: true,
            ..Default::default()
        };

        let syntax = Syntax::Typescript(config);

        let lexer = Lexer::new(
            syntax,
            Default::default(),
            StringInput::from(&*fm),
            None,
        );

        let mut parser = Parser::new_from(lexer);

        let module = parser
            .parse_module()
            .map_err(|e| napi::Error::from_reason(format!("Parse Error: {:?}", e)))?;

        let mut collector = SignatureCollector {
            signatures: vec![],
            source_map: self.source_map.clone(),
            is_inside_export: false,
        };

        module.visit_with(&mut collector);

        Ok(collector.signatures)
    }
}

struct SignatureCollector {
    signatures: Vec<CodeSignature>,
    source_map: Lrc<SourceMap>,
    is_inside_export: bool,
}

impl SignatureCollector {
    fn get_text(&self, lo: BytePos, hi: BytePos) -> String {
        let lo_off = self.source_map.lookup_byte_offset(lo);
        let hi_off = self.source_map.lookup_byte_offset(hi);
        
        if lo_off.pos.0 > hi_off.pos.0 {
            return String::new();
        }

        let src = lo_off.sf.src.as_ref(); 
        let src_str = src.as_str();

        let start = lo_off.pos.0 as usize;
        let end = hi_off.pos.0 as usize;
        
        // Ensure start and end are valid char boundaries to avoid panic
        if start >= src_str.len() || end > src_str.len() {
             return String::new();
        }
        
        if !src_str.is_char_boundary(start) || !src_str.is_char_boundary(end) {
             // If SWC gives us invalid boundaries for UTF-8, return empty safely.
             return String::new();
        }

        src_str[start..end].to_string()
    }

    fn normalize_text(&self, text: &str) -> String {
        let re_multi = REGEX_MULTI_COMMENT.get_or_init(|| Regex::new(r"/\*[\s\S]*?\*/").unwrap());
        let re_single = REGEX_SINGLE_COMMENT.get_or_init(|| Regex::new(r"//.*").unwrap());
        let re_import = REGEX_IMPORT.get_or_init(|| Regex::new(r#"import\(".*?"\)\."#).unwrap());
        let re_whitespace = REGEX_WHITESPACE.get_or_init(|| Regex::new(r"\s+").unwrap());
        let re_punctuation = REGEX_PUNCTUATION.get_or_init(|| Regex::new(r"\s*([:()\[\]{},;])\s*").unwrap());
        let re_colon = REGEX_COLON.get_or_init(|| Regex::new(r"\s*:\s*").unwrap());
        let re_comma = REGEX_COMMA.get_or_init(|| Regex::new(r",\s*").unwrap());
        
        let text = re_multi.replace_all(text, "");
        let text = re_single.replace_all(&text, "");
        let text = re_import.replace_all(&text, "");
        let text = re_whitespace.replace_all(&text, " ");
        let text = re_punctuation.replace_all(&text, "$1");
        let text = re_colon.replace_all(&text, ": ");
        let text = re_comma.replace_all(&text, ", ");
        
        text.trim().to_string()
    }
    
    fn is_member_private(&self, accessibility: Option<Accessibility>) -> bool {
        matches!(accessibility, Some(Accessibility::Private))
    }

    fn extract_class_signature(&mut self, class: &Class, name: String, is_exported: bool) {
        // If not exported and not inside an export block, skip
        if !is_exported && !self.is_inside_export {
            return;
        }

        let mut properties = Vec::new();
        let mut methods = Vec::new();

        for member in &class.body {
            match member {
                ClassMember::Method(m) => {
                     if !self.is_member_private(m.accessibility) {
                         let method_name = m.key.as_ident().map(|i| i.sym.to_string())
                            .or_else(|| m.key.as_str().map(|s| s.value.to_string()))
                            .unwrap_or_else(|| "<computed>".to_string());
                         
                         let params_text = m.function.params.iter().map(|p| {
                             let pat = &p.pat;
                             self.get_text(pat.span().lo, pat.span().hi)
                         }).collect::<Vec<_>>().join(", ");
                         
                         let return_type = if let Some(ret) = &m.function.return_type {
                             self.get_text(ret.span.lo, ret.span.hi)
                         } else {
                             "".to_string()
                         };
                         
                         methods.push(format!("{}({}): {}", method_name, params_text, return_type));
                     }
                },
                ClassMember::ClassProp(p) => {
                    if !self.is_member_private(p.accessibility) {
                        let prop_name = p.key.as_ident().map(|i| i.sym.to_string())
                             .or_else(|| p.key.as_str().map(|s| s.value.to_string()))
                             .unwrap_or_else(|| "<computed>".to_string());
                        
                        let type_ann = if let Some(ann) = &p.type_ann {
                            self.get_text(ann.span.lo, ann.span.hi)
                        } else {
                             "".to_string()
                        };
                        properties.push(format!("{}: {}", prop_name, type_ann));
                    }
                },
                _ => {}
            }
        }
        
        let signature = format!("class {} {{ {}; {} }}", 
            name, 
            properties.join("; "), 
            methods.join("; ")
        );

        self.signatures.push(CodeSignature {
            symbol_name: name,
            symbol_type: SymbolType::Class,
            signature_text: self.normalize_text(&signature),
            is_exported,
        });
    }
}

impl Visit for SignatureCollector {
    fn visit_fn_decl(&mut self, n: &FnDecl) {
        // Filter: Only process if exported
        if !self.is_inside_export {
             n.function.visit_children_with(self);
             return;
        }

        let name = n.ident.sym.to_string();

        let end_pos = if let Some(body) = &n.function.body {
            body.span().lo
        } else {
            n.function.span().hi
        };

        let signature_text = self.get_text(n.function.span().lo, end_pos);

        self.signatures.push(CodeSignature {
            symbol_name: name,
            symbol_type: SymbolType::Function,
            signature_text: self.normalize_text(&signature_text),
            is_exported: self.is_inside_export,
        });
        
        n.function.visit_children_with(self);
    }

    fn visit_class_decl(&mut self, n: &ClassDecl) {
        let name = n.ident.sym.to_string();
        // Pass is_inside_export status. If false, helper will return early.
        self.extract_class_signature(&n.class, name, self.is_inside_export);
        n.class.visit_children_with(self);
    }

    fn visit_ts_interface_decl(&mut self, n: &TsInterfaceDecl) {
        if !self.is_inside_export {
            return;
        }
        
        let name = n.id.sym.to_string();
        let text = self.get_text(n.span().lo, n.span().hi);
        
        self.signatures.push(CodeSignature {
            symbol_name: name,
            symbol_type: SymbolType::Interface,
            signature_text: self.normalize_text(&text),
            is_exported: self.is_inside_export,
        });
    }

    fn visit_ts_type_alias_decl(&mut self, n: &TsTypeAliasDecl) {
        if !self.is_inside_export {
            return;
        }

        let name = n.id.sym.to_string();
        let text = self.get_text(n.span().lo, n.span().hi);

        self.signatures.push(CodeSignature {
            symbol_name: name,
            symbol_type: SymbolType::TypeAlias,
            signature_text: self.normalize_text(&text),
            is_exported: self.is_inside_export,
        });
    }

    fn visit_ts_enum_decl(&mut self, n: &TsEnumDecl) {
        if !self.is_inside_export {
            return;
        }

        let name = n.id.sym.to_string();
        let text = self.get_text(n.span().lo, n.span().hi);

        self.signatures.push(CodeSignature {
            symbol_name: name,
            symbol_type: SymbolType::Enum,
            signature_text: self.normalize_text(&text),
            is_exported: self.is_inside_export,
        });
    }

    fn visit_var_decl(&mut self, n: &VarDecl) {
        if !self.is_inside_export {
            return;
        }

        let symbol_type = if n.kind == VarDeclKind::Const {
            SymbolType::Const
        } else {
            SymbolType::Variable
        };

        for decl in &n.decls {
             if let Pat::Ident(ident) = &decl.name {
                 let name = ident.sym.to_string();
                 let text = self.get_text(decl.span().lo, decl.span().hi);
                 
                 self.signatures.push(CodeSignature {
                     symbol_name: name,
                     symbol_type: symbol_type.clone(),
                     signature_text: self.normalize_text(&text),
                     is_exported: true,
                 });
             }
        }
    }

    fn visit_export_decl(&mut self, n: &ExportDecl) {
        let old_export = self.is_inside_export;
        self.is_inside_export = true;
        n.visit_children_with(self);
        self.is_inside_export = old_export;
    }

    fn visit_export_default_decl(&mut self, n: &ExportDefaultDecl) {
        let old_export = self.is_inside_export;
        self.is_inside_export = true;

        match &n.decl {
             DefaultDecl::Fn(f) => {
                 let name = f.ident.as_ref().map(|i| i.sym.to_string()).unwrap_or_else(|| "default".to_string());
                 
                 let end_pos = if let Some(body) = &f.function.body {
                    body.span().lo
                 } else {
                    f.function.span().hi
                 };

                 let signature_text = self.get_text(f.function.span().lo, end_pos);
                 
                 self.signatures.push(CodeSignature {
                    symbol_name: name,
                    symbol_type: SymbolType::Function,
                    signature_text: self.normalize_text(&signature_text),
                    is_exported: true,
                 });
                 
                 f.function.visit_children_with(self);
             },
             DefaultDecl::Class(c) => {
                 let name = c.ident.as_ref().map(|i| i.sym.to_string()).unwrap_or_else(|| "default".to_string());
                 self.extract_class_signature(&c.class, name, true);
                 c.class.visit_children_with(self);
             },
             DefaultDecl::TsInterfaceDecl(i) => {
                  let name = i.id.sym.to_string();
                  let text = self.get_text(i.span().lo, i.span().hi);
                  self.signatures.push(CodeSignature {
                        symbol_name: name,
                        symbol_type: SymbolType::Interface,
                        signature_text: self.normalize_text(&text),
                        is_exported: true,
                  });
             },
             _ => {}
        }
        
        self.is_inside_export = old_export;
    }
}