<p align="center">
  <img src="public/koala.png" alt="KeyboardKoala" width="168" />
</p>

<h1 align="center">KeyboardKoala</h1>

<p align="center">
  <strong>Background keyboard launcher</strong> for macOS, Windows, and Linux.<br />
  Built with Tauri&nbsp;2.
</p>

Press a global hotkey, pick a command or app, launch it, and the window hides again. The agent keeps running.

## Features

- Runs as a background agent (no Dock icon on macOS, skipped in taskbar)
- Global hotkey toggle
- Recursive config merge from `~/.config/keyboardkoala`
- Key tree, fuzzy text search, and installed-app launcher (`type: "app-launcher"`)
- In-app editor for the primary config
- Optional start-at-login

## Requirements

- Node.js 20+
- Rust stable via [rustup](https://rustup.rs) (`cargo` and `rustc` must be on your `PATH`)
- Platform webview (WKWebView / WebView2 / WebKitGTK)

If `npm run tauri build` fails with `failed to get cargo metadata`, Rust is missing or not on your `PATH`. Install with rustup, then `source "$HOME/.cargo/env"` (or open a new shell).

## Quick start

```bash
npm install
npm run tauri dev
```

Default hotkey: `CommandOrControl+Shift+Space`

On first launch the app creates `~/.config/keyboardkoala/00-main.json`.

Copy examples:

```bash
mkdir -p ~/.config/keyboardkoala
cp -R examples/config/* ~/.config/keyboardkoala/
```

## Config

All `*.json` files under `~/.config/keyboardkoala` (including subfolders) are loaded and merged in lexicographic path order. The first file is the **primary** config (settings + in-app editing). Later files only add commands whose keys are not already taken.

Object form (primary):

```json
{
  "hotkey": "CommandOrControl+Shift+Space",
  "autostart": false,
  "theme": "dark",
  "themeOverrides": {},
  "commands": []
}
```

Array form (extra packs) is also supported: a JSON array of commands.

## Themes

Built-in themes: `dark` (default), `darcula`, `monokai`, `light`.

```json
{
  "theme": "monokai"
}
```

Single values can be overridden with `themeOverrides`. Anything not listed keeps the
theme's value:

```json
{
  "theme": "monokai",
  "themeOverrides": {
    "accent": "#ff8800",
    "key": "#ffffff",
    "font": "\"JetBrains Mono\", monospace"
  }
}
```

| Token | Used for |
|-------|----------|
| `bg` | Window surface |
| `bgElevated` | Inputs, hover rows, `kbd` |
| `bgSunken` | Editor panes |
| `backdrop` | Body background (any CSS background value) |
| `border` | All borders |
| `text` | Primary text |
| `muted` | Secondary text, labels |
| `accent` | Focus/active color |
| `accentSoft` | Selected row background |
| `accentText` | Text on `accentSoft` |
| `key` | Key badges in the key tree |
| `danger` | Errors, destructive actions |
| `font` / `mono` | Font stacks |
| `colorScheme` | `dark` or `light` (native scrollbars, form controls) |

Token names are case-insensitive and accept `accentSoft`, `accent-soft`, or
`--accent-soft`. Unknown names are ignored.

Theme settings merge across all config files like commands do: **the first file that
sets a value wins**, per token. So a later file can supply tokens the primary config
leaves out — see `examples/config/10-theme.json`.

### Command fields

| Field | Meaning |
|-------|---------|
| `name` | Label |
| `key` | Key in key-tree mode (optional for `type: "text"` leaves) |
| `category` | Column group |
| `type` | `text` or `app-launcher` |
| `path` | App name/path to launch |
| `url` | URL to open |
| `group` | Nested commands |

Hotkey tip: `CommandOrControl+Ö` works on layouts that expose `Ö`. Prefer `CommandOrControl+Shift+Space` for portability.

## Shortcuts (inside window)

| Shortcut | Action |
|----------|--------|
| letter key | Fire command (key mode) |
| `-` / `⌘-` | Back |
| `.` / `⌘.` | Home |
| `Esc` | Hide |
| `⌘,` | Edit primary config |
| `⌘R` | Reload config files |
| `⌘Q` | Quit app |
| `Ctrl+j/k` or arrows | Move selection in search |

## Privacy / open source

- Do not commit personal configs, secrets, or private URLs
- Ship only dummy examples under `examples/config/`
- Bundle id: `dev.keyboardkoala.app`

## Platform notes

- **macOS:** Grant Accessibility (and sometimes Input Monitoring) so the global hotkey works. The app uses `ActivationPolicy::Accessory` (no Dock / App Switcher entry).
- **Windows:** Window uses `skipTaskbar`. Needs WebView2 (usually present on current Windows).
- **Linux:** Window uses `skipTaskbar`. Global shortcuts need a running graphical session (X11; Wayland support depends on the compositor). For builds on Debian/Ubuntu/Kali, install the usual Tauri system deps:

```bash
sudo apt update
sudo apt install -y \
  build-essential curl wget file \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  libgtk-3-dev
```

## Build

```bash
npm install
npm run tauri build
```

## License

MIT
