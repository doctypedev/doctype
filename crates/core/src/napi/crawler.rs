use napi_derive::napi;

#[napi(object)]
pub struct NapiFileInfo {
    pub path: String,
    pub extension: Option<String>,
}

#[napi]
pub fn get_project_files(root_path: String) -> Vec<NapiFileInfo> {
    let files = crate::crawler::get_project_files(&root_path);
    files
        .into_iter()
        .map(|f| NapiFileInfo {
            path: f.path.to_string_lossy().to_string(),
            extension: f.extension,
        })
        .collect()
}
