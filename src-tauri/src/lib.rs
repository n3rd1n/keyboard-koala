mod apps;
mod config;
mod hotkey;
mod window;

use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(hotkey::plugin())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            if let Err(err) = hotkey::register_default_hotkey(app.handle()) {
                eprintln!("hotkey registration failed: {err}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            config::get_merged_config,
            config::read_primary_config,
            config::save_primary_config,
            apps::get_installed_apps,
            apps::launch_target,
            apps::run_command,
            window::show_window,
            window::hide_window,
            window::quit_app,
            hotkey::update_hotkey,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KeyboardKoala");
}
