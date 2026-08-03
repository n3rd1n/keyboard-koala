use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
}

#[cfg(target_os = "macos")]
pub fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let mut apps = Vec::new();
    let home = dirs::home_dir().ok_or("home directory not found")?;
    let roots = [
        PathBuf::from("/Applications"),
        home.join("Applications"),
        PathBuf::from("/System/Applications"),
    ];

    for root in roots {
        collect_macos_apps(&root, &mut apps);
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    Ok(apps)
}

#[cfg(target_os = "macos")]
fn collect_macos_apps(root: &PathBuf, apps: &mut Vec<InstalledApp>) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("app") {
            continue;
        }
        let Some(name) = path.file_stem().and_then(|stem| stem.to_str()) else {
            continue;
        };
        apps.push(InstalledApp {
            name: name.to_string(),
            path: path.to_string_lossy().to_string(),
        });
    }
}

#[cfg(target_os = "linux")]
pub fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let mut apps = Vec::new();
    let home = dirs::home_dir().ok_or("home directory not found")?;
    let roots = [
        home.join(".local/share/applications"),
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
    ];

    for root in roots {
        collect_desktop_apps(&root, &mut apps);
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    Ok(apps)
}

#[cfg(target_os = "linux")]
fn collect_desktop_apps(root: &PathBuf, apps: &mut Vec<InstalledApp>) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("desktop") {
            continue;
        }
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        if text.contains("NoDisplay=true") {
            continue;
        }
        let name = desktop_field(&text, "Name").unwrap_or_else(|| {
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .unwrap_or("Unknown")
                .to_string()
        });
        apps.push(InstalledApp {
            name,
            path: path.to_string_lossy().to_string(),
        });
    }
}

#[cfg(target_os = "linux")]
fn desktop_field(text: &str, key: &str) -> Option<String> {
    let prefix = format!("{key}=");
    text.lines()
        .find(|line| line.starts_with(&prefix) && !line.starts_with("Name["))
        .map(|line| line[prefix.len()..].trim().to_string())
}

#[cfg(target_os = "windows")]
pub fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let mut apps = Vec::new();
    let home = dirs::home_dir().ok_or("home directory not found")?;
    let roots = [
        home.join(r"AppData\Roaming\Microsoft\Windows\Start Menu\Programs"),
        PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"),
    ];

    for root in roots {
        collect_windows_shortcuts(&root, &mut apps);
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    Ok(apps)
}

#[cfg(target_os = "windows")]
fn collect_windows_shortcuts(root: &PathBuf, apps: &mut Vec<InstalledApp>) {
    use walkdir::WalkDir;

    if !root.exists() {
        return;
    }

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("lnk") {
            continue;
        }
        let Some(name) = path.file_stem().and_then(|stem| stem.to_str()) else {
            continue;
        };
        apps.push(InstalledApp {
            name: name.to_string(),
            path: path.to_string_lossy().to_string(),
        });
    }
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
pub fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    Ok(Vec::new())
}

#[tauri::command]
pub fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    list_installed_apps()
}

pub fn launch_app(path_or_name: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg("-a")
            .arg(path_or_name)
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to open app: {path_or_name}"))
        }
    }

    #[cfg(target_os = "linux")]
    {
        if path_or_name.ends_with(".desktop") {
            let id = std::path::Path::new(path_or_name)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(path_or_name);
            let status = Command::new("gtk-launch")
                .arg(id.trim_end_matches(".desktop"))
                .status();
            if let Ok(status) = status {
                if status.success() {
                    return Ok(());
                }
            }
            let status = Command::new("xdg-open")
                .arg(path_or_name)
                .status()
                .map_err(|err| err.to_string())?;
            return if status.success() {
                Ok(())
            } else {
                Err(format!("failed to open desktop entry: {path_or_name}"))
            };
        }

        let status = Command::new("xdg-open")
            .arg(path_or_name)
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to open: {path_or_name}"))
        }
    }

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("cmd")
            .args(["/C", "start", "", path_or_name])
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to start: {path_or_name}"))
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Err("unsupported platform".to_string())
    }
}

pub fn launch_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg(url)
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to open url: {url}"))
        }
    }

    #[cfg(target_os = "linux")]
    {
        let status = Command::new("xdg-open")
            .arg(url)
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to open url: {url}"))
        }
    }

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("cmd")
            .args(["/C", "start", "", url])
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to open url: {url}"))
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Err("unsupported platform".to_string())
    }
}

pub fn launch_app_with_url(app: &str, url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .args(["-a", app, url])
            .status()
            .map_err(|err| err.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("failed to open {url} with {app}"))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        launch_url(url)
    }
}

#[tauri::command]
pub fn launch_target(
    path: Option<String>,
    url: Option<String>,
) -> Result<(), String> {
    match (path.as_deref(), url.as_deref()) {
        (Some(app), Some(link)) => launch_app_with_url(app, link),
        (Some(app), None) => launch_app(app),
        (None, Some(link)) => launch_url(link),
        (None, None) => Err("path or url required".to_string()),
    }
}
