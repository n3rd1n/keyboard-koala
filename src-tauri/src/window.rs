use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

pub fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

pub fn show_launcher(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app).ok_or("main window missing")?;
    let _ = window.center();
    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())?;
    let _ = app.emit("launcher-shown", ());
    Ok(())
}

pub fn hide_launcher(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app).ok_or("main window missing")?;
    window.hide().map_err(|err| err.to_string())?;
    let _ = app.emit("launcher-hidden", ());
    Ok(())
}

pub fn toggle_launcher(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app).ok_or("main window missing")?;
    if window.is_visible().unwrap_or(false) {
        hide_launcher(app)
    } else {
        show_launcher(app)
    }
}

#[tauri::command]
pub fn show_window(app: AppHandle) -> Result<(), String> {
    show_launcher(&app)
}

#[tauri::command]
pub fn hide_window(app: AppHandle) -> Result<(), String> {
    hide_launcher(&app)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
