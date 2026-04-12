//! Workspace local: ler/gravar bindings e verificar ficheiros sob a raiz.
//! Caminhos guardados são relativos; valida `..` e absolutos.

use std::fs;
use std::path::{Component, Path, PathBuf};

const BINDINGS_REL: &str = ".telaflow/media-bindings.json";
const EXEC_JSONL_REL: &str = ".telaflow/execution-log.jsonl";

fn bindings_path(workspace: &Path) -> PathBuf {
    workspace.join(BINDINGS_REL)
}

fn assert_safe_relative(rel: &str) -> Result<(), String> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err("caminho relativo não pode ser absoluto".to_string());
    }
    for c in rel_path.components() {
        match c {
            Component::ParentDir => {
                return Err("caminho relativo não pode conter '..'".to_string());
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("caminho relativo inválido".to_string());
            }
            Component::CurDir | Component::Normal(_) => {}
        }
    }
    Ok(())
}

/// Caminho relativo POSIX de `absolute_file` para `workspace_path`.
#[tauri::command]
pub fn normalize_media_binding_relative(
    workspace_path: String,
    absolute_file: String,
) -> Result<String, String> {
    let workspace = PathBuf::from(workspace_path.trim());
    let file = PathBuf::from(absolute_file.trim());
    let base = workspace
        .canonicalize()
        .map_err(|e| format!("workspace inválido ou inacessível: {e}"))?;
    let target = file
        .canonicalize()
        .map_err(|e| format!("ficheiro selecionado inválido ou inacessível: {e}"))?;
    let rel = target
        .strip_prefix(&base)
        .map_err(|_| "o ficheiro selecionado não está dentro do workspace".to_string())?;
    for c in rel.components() {
        match c {
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("caminho relativo inválido após normalização".to_string());
            }
            _ => {}
        }
    }
    let s = rel.to_string_lossy().replace('\\', "/");
    if s.is_empty() {
        return Err("caminho relativo vazio".to_string());
    }
    Ok(s)
}

#[tauri::command]
pub fn file_exists_under_workspace(
    workspace_path: String,
    relative: String,
) -> Result<bool, String> {
    let workspace = PathBuf::from(workspace_path.trim());
    if !workspace.is_dir() {
        return Err("workspace não é um diretório".to_string());
    }
    assert_safe_relative(&relative)?;
    let full = workspace.join(relative.trim());
    Ok(full.is_file())
}

/// Caminho absoluto canónico de `relative` sob `workspace_path` (para `convertFileSrc` no frontend).
#[tauri::command]
pub fn resolve_workspace_file_path(
    workspace_path: String,
    relative: String,
) -> Result<String, String> {
    let workspace = PathBuf::from(workspace_path.trim());
    if !workspace.is_dir() {
        return Err("workspace não é um diretório".to_string());
    }
    assert_safe_relative(&relative)?;
    let full = workspace.join(relative.trim());
    let canon = full
        .canonicalize()
        .map_err(|e| format!("ficheiro inacessível ou inexistente: {e}"))?;
    if !canon.is_file() {
        return Err("caminho não é um ficheiro".to_string());
    }
    Ok(canon.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_media_bindings_file(workspace_path: String) -> Result<Option<String>, String> {
    let workspace = PathBuf::from(workspace_path.trim());
    let p = bindings_path(&workspace);
    if !p.is_file() {
        return Ok(None);
    }
    let txt =
        fs::read_to_string(&p).map_err(|e| format!("falha ao ler {}: {e}", p.display()))?;
    Ok(Some(txt))
}

#[tauri::command]
pub fn save_media_bindings_file(workspace_path: String, content: String) -> Result<(), String> {
    let workspace = PathBuf::from(workspace_path.trim());
    if !workspace.is_dir() {
        return Err("workspace não é um diretório".to_string());
    }
    let p = bindings_path(&workspace);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            format!(
                "falha ao criar diretório {}: {e}",
                parent.display()
            )
        })?;
    }
    fs::write(&p, content).map_err(|e| format!("falha ao gravar {}: {e}", p.display()))?;
    Ok(())
}

/// Anexa uma linha (JSON) ao ficheiro `.telaflow/execution-log.jsonl` sob `base_path`.
#[tauri::command]
pub fn append_execution_jsonl(base_path: String, line: String) -> Result<(), String> {
    let root = PathBuf::from(base_path.trim());
    if !root.is_dir() {
        return Err("base_path não é um diretório".to_string());
    }
    let p = root.join(EXEC_JSONL_REL);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            format!(
                "falha ao criar diretório {}: {e}",
                parent.display()
            )
        })?;
    }
    use std::io::Write;
    let mut f = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&p)
        .map_err(|e| format!("falha ao abrir {}: {e}", p.display()))?;
    let mut l = line;
    if !l.ends_with('\n') {
        l.push('\n');
    }
    f.write_all(l.as_bytes())
        .map_err(|e| format!("falha ao escrever {}: {e}", p.display()))?;
    Ok(())
}
