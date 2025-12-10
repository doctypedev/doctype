use petgraph::graph::{DiGraph, NodeIndex};
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct FileNode {
    pub path: PathBuf,
    pub name: String,
}

pub struct ProjectGraph {
    pub graph: DiGraph<FileNode, ()>,
    pub node_map: HashMap<PathBuf, NodeIndex>,
}

impl ProjectGraph {
    pub fn new() -> Self {
        Self {
            graph: DiGraph::new(),
            node_map: HashMap::new(),
        }
    }

    pub fn add_file(&mut self, path: PathBuf) -> NodeIndex {
        if let Some(&idx) = self.node_map.get(&path) {
            return idx;
        }

        let name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();

        let node = self.graph.add_node(FileNode {
            path: path.clone(),
            name,
        });
        self.node_map.insert(path, node);
        node
    }

    pub fn add_dependency(&mut self, from: PathBuf, to: PathBuf) {
        let from_idx = self.add_file(from);
        let to_idx = self.add_file(to);
        self.graph.update_edge(from_idx, to_idx, ());
    }
}

pub fn build_graph(files: &[PathBuf], root: &Path) -> ProjectGraph {
    let mut project_graph = ProjectGraph::new();
    
    // Pre-populate nodes
    for file in files {
        project_graph.add_file(file.clone());
    }

    let import_regex = Regex::new(r#"(?:import\s+(?:[\w\s{},*]+from\s+)?|require\()['"]([^'"]+)['"]"#).unwrap();

    for file_path in files {
        // Only process JS/TS/RS files for now
        let ext = file_path.extension().and_then(|s| s.to_str()).unwrap_or("");
        if !["ts", "tsx", "js", "jsx", "rs"].contains(&ext) {
            continue;
        }

        let full_path = root.join(file_path);
        if let Ok(content) = fs::read_to_string(&full_path) {
            for cap in import_regex.captures_iter(&content) {
                if let Some(import_path) = cap.get(1) {
                    let import_str = import_path.as_str();
                    
                    // Simple resolution logic
                    // 1. Ignore node_modules (non-relative imports) for now, or maybe track them differently?
                    // For now, only track relative imports starting with .
                    if import_str.starts_with('.') {
                        let current_dir = file_path.parent().unwrap_or(Path::new(""));
                        let resolved = current_dir.join(import_str);
                        
                        // Normalize (remove .. and .) - simplified for now
                        // In a real implementation we need canonicalization, but that requires the file to exist.
                        // Since we are working with relative paths inside the project, we can try to match against our file list.
                        
                        // Heuristic: try to find the matching file in our file list
                        // This is O(N^2) effectively if we iterate, but with the map it's fast.
                        // But we need to handle extensions (import './foo' -> './foo.ts')
                        
                        // Let's try to resolve it against known files
                        // This logic needs to be robust.
                         let candidates = vec![
                            resolved.clone(),
                            resolved.with_extension("ts"),
                            resolved.with_extension("tsx"),
                            resolved.with_extension("js"),
                            resolved.with_extension("jsx"),
                            resolved.join("index.ts"),
                            resolved.join("index.js"),
                        ];

                        for candidate in candidates {
                             // "normalize" candidate path to match how we store them (no leading ./ if possible)
                             // Actually, let's just check if it exists in our node_map
                             // We might need a more robust normalization here.
                             if project_graph.node_map.contains_key(&candidate) {
                                 project_graph.add_dependency(file_path.clone(), candidate);
                                 break;
                             }
                        }
                    }
                }
            }
        }
    }

    project_graph
}
