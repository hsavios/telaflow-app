//! Estado local do Player (SQLite) — exclusões de sorteio e retomada de cena.

use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection};
use serde::Serialize;

const DB_NAME: &str = "telaflow-player.db";

fn db_path(base_path: &str) -> Result<PathBuf, String> {
    let base = PathBuf::from(base_path.trim());
    let dir = base.join(".telaflow");
    fs::create_dir_all(&dir).map_err(|e| format!("criar .telaflow: {e}"))?;
    Ok(dir.join(DB_NAME))
}

fn open_conn(base_path: &str) -> Result<Connection, String> {
    let p = db_path(base_path)?;
    let conn = Connection::open(&p).map_err(|e| format!("abrir sqlite: {e}"))?;
    conn
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS draw_exclusions (
                export_id TEXT NOT NULL,
                reset_key TEXT NOT NULL,
                winner_number INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (export_id, reset_key, winner_number)
            );
            CREATE INDEX IF NOT EXISTS idx_draw_ex_export ON draw_exclusions(export_id);
            CREATE TABLE IF NOT EXISTS session_checkpoint (
                export_id TEXT NOT NULL,
                pack_root TEXT NOT NULL,
                scene_index INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (export_id, pack_root)
            );",
        )
        .map_err(|e| format!("migração sqlite: {e}"))?;
    Ok(conn)
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawExclusionRow {
    pub reset_key: String,
    pub number: i64,
}

#[tauri::command]
pub fn draw_exclusions_list(base_path: String, export_id: String) -> Result<Vec<DrawExclusionRow>, String> {
    let conn = open_conn(&base_path)?;
    let mut stmt = conn
        .prepare(
            "SELECT reset_key, winner_number FROM draw_exclusions WHERE export_id = ?1 ORDER BY created_at",
        )
        .map_err(|e| format!("{e}"))?;
    let rows = stmt
        .query_map(params![export_id], |r| {
            Ok(DrawExclusionRow {
                reset_key: r.get(0)?,
                number: r.get(1)?,
            })
        })
        .map_err(|e| format!("{e}"))?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("{e}"))?);
    }
    Ok(out)
}

#[tauri::command]
pub fn draw_exclusion_record(
    base_path: String,
    export_id: String,
    reset_key: String,
    number: i64,
) -> Result<(), String> {
    let conn = open_conn(&base_path)?;
    conn.execute(
        "INSERT OR IGNORE INTO draw_exclusions (export_id, reset_key, winner_number, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![export_id, reset_key, number, now_unix()],
    )
    .map_err(|e| format!("{e}"))?;
    Ok(())
}

#[tauri::command]
pub fn session_checkpoint_load(
    base_path: String,
    export_id: String,
    pack_root: String,
) -> Result<Option<i32>, String> {
    let conn = open_conn(&base_path)?;
    let mut stmt = conn
        .prepare(
            "SELECT scene_index FROM session_checkpoint WHERE export_id = ?1 AND pack_root = ?2",
        )
        .map_err(|e| format!("{e}"))?;
    let mut rows = stmt
        .query(params![export_id, pack_root])
        .map_err(|e| format!("{e}"))?;
    if let Some(row) = rows.next().map_err(|e| format!("{e}"))? {
        let v: i32 = row.get(0).map_err(|e| format!("{e}"))?;
        return Ok(Some(v));
    }
    Ok(None)
}

#[tauri::command]
pub fn session_checkpoint_save(
    base_path: String,
    export_id: String,
    pack_root: String,
    scene_index: i32,
) -> Result<(), String> {
    let conn = open_conn(&base_path)?;
    conn.execute(
        "DELETE FROM session_checkpoint WHERE export_id = ?1 AND pack_root = ?2",
        params![export_id, pack_root],
    )
    .map_err(|e| format!("{e}"))?;
    conn.execute(
        "INSERT INTO session_checkpoint (export_id, pack_root, scene_index, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![export_id, pack_root, scene_index, now_unix()],
    )
    .map_err(|e| format!("{e}"))?;
    Ok(())
}

#[tauri::command]
pub fn session_checkpoint_clear(base_path: String, export_id: String, pack_root: String) -> Result<(), String> {
    let conn = open_conn(&base_path)?;
    conn.execute(
        "DELETE FROM session_checkpoint WHERE export_id = ?1 AND pack_root = ?2",
        params![export_id, pack_root],
    )
    .map_err(|e| format!("{e}"))?;
    Ok(())
}
