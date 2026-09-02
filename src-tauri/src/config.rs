use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub const DEFAULT_HOTKEY: &str = "CommandOrControl+Shift+Space";
pub const DEFAULT_THEME: &str = "dark";

/// Per-token theme overrides, e.g. `{"accent": "#ff8800"}`. Token names are validated in the frontend.
pub type ThemeOverrides = BTreeMap<String, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandJson {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "type")]
    pub command_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// Argv to spawn without a shell: `["git", "status"]`. First entry is the program.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<Vec<CommandJson>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigFile {
    #[serde(default)]
    pub hotkey: Option<String>,
    #[serde(default)]
    pub autostart: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme_overrides: Option<ThemeOverrides>,
    #[serde(default)]
    pub commands: Vec<CommandJson>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergedConfig {
    pub hotkey: String,
    pub autostart: bool,
    pub theme: String,
    pub theme_overrides: ThemeOverrides,
    pub commands: Vec<CommandJson>,
    pub primary_path: String,
    pub config_dir: String,
    pub loaded_files: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("home directory not found")]
    NoHome,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

pub fn config_dir() -> Result<PathBuf, ConfigError> {
    let home = dirs::home_dir().ok_or(ConfigError::NoHome)?;
    Ok(home.join(".config").join("keyboardkoala"))
}

pub fn ensure_config_dir() -> Result<PathBuf, ConfigError> {
    let dir = config_dir()?;
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

fn collect_json_files(dir: &Path) -> Vec<PathBuf> {
    if !dir.exists() {
        return Vec::new();
    }

    let mut files: Vec<PathBuf> = WalkDir::new(dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| entry.into_path())
        .filter(|path| {
            path.extension()
                .and_then(|ext| ext.to_str())
                .is_some_and(|ext| ext.eq_ignore_ascii_case("json"))
        })
        .collect();

    files.sort();
    files
}

fn parse_config_value(value: serde_json::Value) -> Result<ConfigFile, ConfigError> {
    match value {
        serde_json::Value::Array(items) => {
            let commands = serde_json::from_value(serde_json::Value::Array(items))?;
            Ok(ConfigFile {
                hotkey: None,
                autostart: None,
                theme: None,
                theme_overrides: None,
                commands,
            })
        }
        other => Ok(serde_json::from_value(other)?),
    }
}

fn read_config_file(path: &Path) -> Result<ConfigFile, ConfigError> {
    let text = fs::read_to_string(path)?;
    let value: serde_json::Value = serde_json::from_str(&text)?;
    parse_config_value(value)
}

fn command_key(command: &CommandJson) -> String {
    if let Some(key) = command.key.as_ref().filter(|key| !key.is_empty()) {
        return format!("key:{key}");
    }
    format!(
        "leaf:{}|{}|{}|{}",
        command.name,
        command.path.clone().unwrap_or_default(),
        command.url.clone().unwrap_or_default(),
        command
            .run
            .as_ref()
            .map(|argv| argv.join("\u{1f}"))
            .unwrap_or_default()
    )
}

/// Fill missing keys for key-tree nodes only; text-search leaves stay without a key.
fn normalize_commands(commands: Vec<CommandJson>) -> Vec<CommandJson> {
    commands
        .into_iter()
        .map(|mut command| {
            if let Some(group) = command.group.take() {
                let is_text = command
                    .command_type
                    .as_deref()
                    .is_some_and(|value| value == "text");
                command.group = Some(if is_text {
                    normalize_text_leaves(group)
                } else {
                    normalize_commands(group)
                });
            }
            command
        })
        .collect()
}

fn normalize_text_leaves(commands: Vec<CommandJson>) -> Vec<CommandJson> {
    commands
        .into_iter()
        .map(|mut command| {
            // Text leaves are selected by search, not by key.
            if command.group.is_none() {
                if command.key.as_ref().is_some_and(|key| key.is_empty()) {
                    command.key = None;
                }
            } else if let Some(group) = command.group.take() {
                command.group = Some(normalize_commands(group));
            }
            command
        })
        .collect()
}

/// First file that names a theme wins (the primary config is read first).
fn merge_theme_name(files: &[ConfigFile]) -> String {
    files
        .iter()
        .find_map(|file| {
            file.theme
                .as_ref()
                .map(|theme| theme.trim())
                .filter(|theme| !theme.is_empty())
                .map(str::to_string)
        })
        .unwrap_or_else(|| DEFAULT_THEME.to_string())
}

/// Overrides from all config files; the first file that sets a token wins.
fn merge_theme_overrides(files: &[ConfigFile]) -> ThemeOverrides {
    let mut merged = ThemeOverrides::new();

    for file in files {
        for (token, value) in file.theme_overrides.iter().flatten() {
            merged
                .entry(token.clone())
                .or_insert_with(|| value.clone());
        }
    }

    merged
}

fn merge_command_lists(lists: &[Vec<CommandJson>]) -> Vec<CommandJson> {
    let mut seen = std::collections::HashSet::new();
    let mut merged = Vec::new();

    for list in lists {
        for command in list {
            let key = command_key(command);
            if seen.insert(key) {
                merged.push(command.clone());
            }
        }
    }

    merged
}

pub fn load_merged_config() -> Result<MergedConfig, ConfigError> {
    let dir = ensure_config_dir()?;
    let files = collect_json_files(&dir);

    if files.is_empty() {
        let primary = dir.join("00-main.json");
        let starter = ConfigFile {
            hotkey: Some(DEFAULT_HOTKEY.to_string()),
            autostart: Some(false),
            theme: Some(DEFAULT_THEME.to_string()),
            theme_overrides: None,
            commands: default_commands(),
        };
        write_primary_config(&primary, &starter)?;
        return Ok(MergedConfig {
            hotkey: DEFAULT_HOTKEY.to_string(),
            autostart: false,
            theme: DEFAULT_THEME.to_string(),
            theme_overrides: ThemeOverrides::new(),
            commands: normalize_commands(starter.commands),
            primary_path: primary.to_string_lossy().to_string(),
            config_dir: dir.to_string_lossy().to_string(),
            loaded_files: vec![primary.to_string_lossy().to_string()],
        });
    }

    let mut parsed = Vec::new();
    let mut loaded_files = Vec::new();

    for path in &files {
        match read_config_file(path) {
            Ok(config) => {
                loaded_files.push(path.to_string_lossy().to_string());
                parsed.push(config);
            }
            Err(err) => {
                eprintln!("Skipping invalid config {}: {err}", path.display());
            }
        }
    }

    if parsed.is_empty() {
        return Ok(MergedConfig {
            hotkey: DEFAULT_HOTKEY.to_string(),
            autostart: false,
            theme: DEFAULT_THEME.to_string(),
            theme_overrides: ThemeOverrides::new(),
            commands: normalize_commands(default_commands()),
            primary_path: files[0].to_string_lossy().to_string(),
            config_dir: dir.to_string_lossy().to_string(),
            loaded_files,
        });
    }

    let primary = &parsed[0];
    let command_lists: Vec<Vec<CommandJson>> = parsed
        .iter()
        .map(|file| normalize_commands(file.commands.clone()))
        .collect();

    Ok(MergedConfig {
        hotkey: primary
            .hotkey
            .clone()
            .unwrap_or_else(|| DEFAULT_HOTKEY.to_string()),
        autostart: primary.autostart.unwrap_or(false),
        theme: merge_theme_name(&parsed),
        theme_overrides: merge_theme_overrides(&parsed),
        commands: merge_command_lists(&command_lists),
        primary_path: files[0].to_string_lossy().to_string(),
        config_dir: dir.to_string_lossy().to_string(),
        loaded_files,
    })
}

pub fn write_primary_config(path: &Path, config: &ConfigFile) -> Result<(), ConfigError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(config)?;
    fs::write(path, text)?;
    Ok(())
}

fn default_commands() -> Vec<CommandJson> {
    vec![
        CommandJson {
            name: "Installed Apps".to_string(),
            key: Some("a".to_string()),
            category: Some("System".to_string()),
            command_type: Some("app-launcher".to_string()),
            path: None,
            url: None,
            run: None,
            group: None,
        },
        CommandJson {
            name: "Example Site".to_string(),
            key: Some("e".to_string()),
            category: Some("Web".to_string()),
            command_type: None,
            path: None,
            url: Some("https://example.com".to_string()),
            run: None,
            group: None,
        },
        CommandJson {
            name: "Bookmarks".to_string(),
            key: Some("b".to_string()),
            category: Some("Web".to_string()),
            command_type: Some("text".to_string()),
            path: None,
            url: None,
            run: None,
            group: Some(vec![
                CommandJson {
                    name: "Example".to_string(),
                    key: None,
                    category: None,
                    command_type: None,
                    path: None,
                    url: Some("https://example.com".to_string()),
                    run: None,
                    group: None,
                },
                CommandJson {
                    name: "Tauri".to_string(),
                    key: None,
                    category: None,
                    command_type: None,
                    path: None,
                    url: Some("https://v2.tauri.app".to_string()),
                    run: None,
                    group: None,
                },
            ]),
        },
    ]
}

#[tauri::command]
pub fn get_merged_config() -> Result<MergedConfig, String> {
    load_merged_config().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn read_primary_config() -> Result<ConfigFile, String> {
    let merged = load_merged_config().map_err(|err| err.to_string())?;
    let path = PathBuf::from(&merged.primary_path);
    read_config_file(&path).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_primary_config(config: ConfigFile) -> Result<MergedConfig, String> {
    let merged = load_merged_config().map_err(|err| err.to_string())?;
    let path = PathBuf::from(&merged.primary_path);
    write_primary_config(&path, &config).map_err(|err| err.to_string())?;
    load_merged_config().map_err(|err| err.to_string())
}
