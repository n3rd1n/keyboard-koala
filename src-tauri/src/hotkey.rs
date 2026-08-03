use crate::config::{load_merged_config, DEFAULT_HOTKEY};
use crate::window::toggle_launcher;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Builder, GlobalShortcutExt, Shortcut, ShortcutState};

pub fn register_default_hotkey(app: &AppHandle) -> Result<(), String> {
    let hotkey = load_merged_config()
        .map(|config| config.hotkey)
        .unwrap_or_else(|_| DEFAULT_HOTKEY.to_string());
    register_hotkey(app, &hotkey)
}

pub fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let shortcut: Shortcut = hotkey
        .parse()
        .map_err(|err| format!("invalid hotkey '{hotkey}': {err}"))?;

    let _ = app.global_shortcut().unregister_all();

    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = toggle_launcher(app);
            }
        })
        .map_err(|err| err.to_string())?;

    Ok(())
}

pub fn plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    Builder::new().build()
}

#[tauri::command]
pub fn update_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    register_hotkey(&app, &hotkey)
}
