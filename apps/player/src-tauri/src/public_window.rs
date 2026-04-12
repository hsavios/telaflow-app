//! Janela webview secundária para saída pública (dual-screen real MVP).
//! Uma única etiqueta `public` — sem múltiplas janelas públicas neste MVP.

use tauri::{AppHandle, Manager, WebviewUrl};
use tauri::webview::WebviewWindowBuilder;

#[tauri::command]
pub fn public_window_open(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("public") {
        w.show().map_err(|e| e.to_string())?;
        let _ = w.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "public", WebviewUrl::App("public-panel.html".into()))
        .title("TelaFlow — Telão (somente leitura)")
        .inner_size(1280.0, 720.0)
        .min_inner_size(640.0, 360.0)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
