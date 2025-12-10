use crate::crawler::get_project_files;
use crate::graph::build_graph;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageJson {
    pub name: Option<String>,
    pub version: Option<String>,
    pub dependencies: Option<HashMap<String, String>>,
    pub dev_dependencies: Option<HashMap<String, String>>,
    pub scripts: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
pub struct FileContext {
    pub path: String,
    pub extension: Option<String>,
    pub imports: Vec<String>,
    pub imported_by: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ProjectContext {
    pub files: Vec<FileContext>,
    pub package_json: Option<PackageJson>,
    // In the future: main_files, project_type, etc.
}

pub fn get_project_context(root_path: &str) -> ProjectContext {
    let files = get_project_files(root_path);
    let file_paths: Vec<_> = files.iter().map(|f| f.path.clone()).collect();
    let root = Path::new(root_path);
    
    let graph = build_graph(&file_paths, root);
    
    // Parse package.json
    let package_json_path = root.join("package.json");
    let package_json = if package_json_path.exists() {
        let content = fs::read_to_string(package_json_path).unwrap_or_default();
        serde_json::from_str(&content).ok()
    } else {
        None
    };

    // Convert graph to serializable context
    let mut file_contexts = Vec::new();
    
    for file in &files {
        let path_str = file.path.to_string_lossy().to_string();
        
        let mut imports = Vec::new();
        let mut imported_by = Vec::new();

        if let Some(idx) = graph.node_map.get(&file.path) {
            // Outgoing edges (imports)
            for neighbor in graph.graph.neighbors_directed(*idx, petgraph::Direction::Outgoing) {
                if let Some(node) = graph.graph.node_weight(neighbor) {
                     imports.push(node.path.to_string_lossy().to_string());
                }
            }
             // Incoming edges (imported by)
            for neighbor in graph.graph.neighbors_directed(*idx, petgraph::Direction::Incoming) {
                if let Some(node) = graph.graph.node_weight(neighbor) {
                     imported_by.push(node.path.to_string_lossy().to_string());
                }
            }
        }

        file_contexts.push(FileContext {
            path: path_str,
            extension: file.extension.clone(),
            imports,
            imported_by,
        });
    }

    ProjectContext {
        files: file_contexts,
        package_json,
    }
}
