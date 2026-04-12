//! Leitura mínima de pack em diretório (MVP) — sem rede, sem mídia binária.
//! Caminhos vindos do manifest são validados contra path traversal.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};

const ROLES_OBRIGATORIOS: &[&str] = &[
    "event_snapshot",
    "draw_configs",
    "media_manifest",
    "branding",
    "license",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedPackPayload {
    pub root_path: String,
    pub manifest: Value,
    pub event: Value,
    pub draw_configs: Value,
    pub media_manifest: Value,
    pub branding: Value,
    pub license: Value,
}

fn caminho_seguro_sob_raiz(raiz: &Path, rel: &str) -> Result<PathBuf, String> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err("caminho absoluto não permitido no manifest".to_string());
    }
    for c in rel_path.components() {
        match c {
            Component::ParentDir => {
                return Err("componente '..' não permitido nos caminhos do manifest".to_string());
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("caminho inválido no manifest".to_string());
            }
            Component::CurDir | Component::Normal(_) => {}
        }
    }
    Ok(raiz.join(rel_path))
}

fn mapa_role_para_caminho(manifest: &Value) -> Result<HashMap<String, String>, String> {
    let arts = manifest
        .get("artifacts")
        .and_then(|a| a.as_array())
        .ok_or_else(|| "manifest.json: campo 'artifacts' ausente ou inválido".to_string())?;
    let mut mapa: HashMap<String, String> = HashMap::new();
    for item in arts {
        let role = item
            .get("role")
            .and_then(|r| r.as_str())
            .ok_or_else(|| "manifest.json: item sem 'role'".to_string())?;
        let path = item
            .get("path")
            .and_then(|p| p.as_str())
            .ok_or_else(|| "manifest.json: item sem 'path'".to_string())?;
        mapa.insert(role.to_string(), path.to_string());
    }
    for r in ROLES_OBRIGATORIOS {
        if !mapa.contains_key(*r) {
            return Err(format!(
                "manifest.json: falta artefato com role obrigatória '{r}'"
            ));
        }
    }
    Ok(mapa)
}

fn ler_json_arquivo(p: &Path) -> Result<Value, String> {
    let txt = fs::read_to_string(p).map_err(|e| format!("falha ao ler {}: {e}", p.display()))?;
    serde_json::from_str(&txt).map_err(|e| format!("JSON inválido em {}: {e}", p.display()))
}

/// Lê `manifest.json` e os artefatos referenciados (caminhos relativos ao diretório escolhido).
#[tauri::command]
pub fn load_pack_from_directory(path: String) -> Result<LoadedPackPayload, String> {
    let raiz = PathBuf::from(path.trim());
    if !raiz.is_dir() {
        return Err("o caminho não é um diretório existente".to_string());
    }
    let manifest_path = raiz.join("manifest.json");
    let manifest = ler_json_arquivo(&manifest_path)?;
    let mapa = mapa_role_para_caminho(&manifest)?;

    let p_evento = caminho_seguro_sob_raiz(
        &raiz,
        mapa.get("event_snapshot").ok_or_else(|| {
            "manifest: role interna 'event_snapshot' ausente (invariante)".to_string()
        })?,
    )?;
    let p_draws = caminho_seguro_sob_raiz(
        &raiz,
        mapa.get("draw_configs").ok_or_else(|| {
            "manifest: role interna 'draw_configs' ausente (invariante)".to_string()
        })?,
    )?;
    let p_media = caminho_seguro_sob_raiz(
        &raiz,
        mapa.get("media_manifest").ok_or_else(|| {
            "manifest: role interna 'media_manifest' ausente (invariante)".to_string()
        })?,
    )?;
    let p_branding = caminho_seguro_sob_raiz(
        &raiz,
        mapa.get("branding").ok_or_else(|| {
            "manifest: role interna 'branding' ausente (invariante)".to_string()
        })?,
    )?;
    let p_license = caminho_seguro_sob_raiz(
        &raiz,
        mapa.get("license").ok_or_else(|| {
            "manifest: role interna 'license' ausente (invariante)".to_string()
        })?,
    )?;

    Ok(LoadedPackPayload {
        root_path: raiz.to_string_lossy().to_string(),
        manifest,
        event: ler_json_arquivo(&p_evento)?,
        draw_configs: ler_json_arquivo(&p_draws)?,
        media_manifest: ler_json_arquivo(&p_media)?,
        branding: ler_json_arquivo(&p_branding)?,
        license: ler_json_arquivo(&p_license)?,
    })
}
