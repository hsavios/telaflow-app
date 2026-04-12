mod pack_io;
mod workspace_bindings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            pack_io::load_pack_from_directory,
            workspace_bindings::normalize_media_binding_relative,
            workspace_bindings::file_exists_under_workspace,
            workspace_bindings::load_media_bindings_file,
            workspace_bindings::save_media_bindings_file,
            workspace_bindings::append_execution_jsonl,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
