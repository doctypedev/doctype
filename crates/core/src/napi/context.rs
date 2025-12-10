use napi_derive::napi;
use std::collections::HashMap;

#[napi(object)]
pub struct PackageJson {
    pub name: Option<String>,
    pub version: Option<String>,
    pub dependencies: Option<HashMap<String, String>>,
    pub dev_dependencies: Option<HashMap<String, String>>,
    pub scripts: Option<HashMap<String, String>>,
}

#[napi(object)]
pub struct FileContext {
    pub path: String,
    pub extension: Option<String>,
    pub imports: Vec<String>,
    pub imported_by: Vec<String>,
}

#[napi(object)]
pub struct ProjectContext {
    pub files: Vec<FileContext>,
    pub package_json: Option<PackageJson>,
}

#[napi]
pub fn get_project_context(root_path: String) -> ProjectContext {
    let context = crate::context::get_project_context(&root_path);

    let napi_files = context.files.into_iter().map(|f| FileContext {
        path: f.path,
        extension: f.extension,
        imports: f.imports,
        imported_by: f.imported_by,
    }).collect();

    let napi_package_json = context.package_json.map(|p| PackageJson {
        name: p.name,
        version: p.version,
        dependencies: p.dependencies,
        dev_dependencies: p.dev_dependencies,
        scripts: p.scripts,
    });

    ProjectContext {
        files: napi_files,
        package_json: napi_package_json,
    }
}
