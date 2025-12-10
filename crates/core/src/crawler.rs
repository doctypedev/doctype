use ignore::WalkBuilder;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct FileInfo {
    pub path: PathBuf,
    pub extension: Option<String>,
}

pub fn get_project_files(root_path: &str) -> Vec<FileInfo> {
    let mut files = Vec::new();
    let walker = WalkBuilder::new(root_path)
        .hidden(false) // Allow hidden files (like .env), gitignore will still handle .git
        .git_ignore(true)
        .build();

    for result in walker {
        match result {
            Ok(entry) => {
                if entry.file_type().map_or(false, |ft| ft.is_file()) {
                    let path = entry.path();
                    // Get path relative to root if possible
                    let rel_path = match path.strip_prefix(root_path) {
                        Ok(p) => p.to_path_buf(),
                        Err(_) => path.to_path_buf(),
                    };

                    // Skip .git folder explicitly if ignore crate doesn't catch it for some reason
                    // (WalkBuilder usually handles this via git_ignore(true) but being safe)
                    if rel_path.components().any(|c| c.as_os_str() == ".git") {
                        continue;
                    }

                    files.push(FileInfo {
                        path: rel_path.clone(),
                        extension: path.extension().map(|s| s.to_string_lossy().to_string()),
                    });
                }
            }
            Err(err) => eprintln!("Error walking directory: {}", err),
        }
    }

    files
}
