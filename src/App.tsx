import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { fireCommand } from "./commands/fire";
import {
  createNavState,
  enterGroup,
  goBack,
  resetNav,
  type NavState,
} from "./commands/navigation";
import { loadMergedConfig } from "./config/api";
import { applyTheme, resolveTheme } from "./theme/apply";
import type { CommandJson, LauncherMode, MergedConfig } from "./types/command";
import { AppLauncherView } from "./views/AppLauncherView";
import { ConfigEditor } from "./views/ConfigEditor";
import { KeyView } from "./views/KeyView";
import { TextView } from "./views/TextView";
import "./styles/main.css";

function App() {
  const [config, setConfig] = useState<MergedConfig | null>(null);
  const [nav, setNav] = useState<NavState | null>(null);
  const [mode, setMode] = useState<LauncherMode>("key");
  const [focusToken, setFocusToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = useCallback(async () => {
    const merged = await loadMergedConfig();
    applyTheme(
      document.documentElement,
      resolveTheme(merged.theme, merged.themeOverrides),
    );
    setConfig(merged);
    setNav(createNavState(merged.commands));
    setMode("key");
    setError(null);
    if (merged.hotkey) {
      await invoke("update_hotkey", { hotkey: merged.hotkey });
    }
    setFocusToken((token) => token + 1);
    return merged;
  }, []);

  useEffect(() => {
    void refreshConfig().catch((err: unknown) => setError(String(err)));
  }, [refreshConfig]);

  useEffect(() => {
    function handleAppShortcuts(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) {
        return;
      }

      if (event.key === "q" || event.key === "Q") {
        event.preventDefault();
        void invoke("quit_app");
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        void refreshConfig().catch((err: unknown) => setError(String(err)));
      }
    }

    window.addEventListener("keydown", handleAppShortcuts);
    return () => window.removeEventListener("keydown", handleAppShortcuts);
  }, [refreshConfig]);

  useEffect(() => {
    let unlistenShown: (() => void) | undefined;
    let unlistenHidden: (() => void) | undefined;

    void (async () => {
      unlistenShown = await listen("launcher-shown", () => {
        if (config) {
          setNav(resetNav(config.commands));
          setMode("key");
        }
        setFocusToken((token) => token + 1);
      });
      unlistenHidden = await listen("launcher-hidden", () => {
        if (config) {
          setNav(resetNav(config.commands));
          setMode("key");
        }
      });
    })();

    return () => {
      unlistenShown?.();
      unlistenHidden?.();
    };
  }, [config]);

  async function hideWindow() {
    await invoke("hide_window");
  }

  async function handleFire(command: CommandJson) {
    if (!nav || !config) {
      return;
    }

    const result = await fireCommand(command);
    switch (result.kind) {
      case "launched":
        setNav(resetNav(config.commands));
        setMode("key");
        await hideWindow();
        break;
      case "enter-group":
        setNav(enterGroup(nav, command, result.commands));
        setMode("key");
        setFocusToken((token) => token + 1);
        break;
      case "enter-text":
        setNav(enterGroup(nav, command, result.commands));
        setMode("text");
        setFocusToken((token) => token + 1);
        break;
      case "enter-app-launcher":
        setNav(enterGroup(nav, command, []));
        setMode("app-launcher");
        setFocusToken((token) => token + 1);
        break;
    }
  }

  function handleBack() {
    if (!nav || !config) {
      return;
    }
    if (nav.history.length === 0) {
      void hideWindow();
      return;
    }
    const next = goBack(nav);
    setNav(next);
    setMode(next.active?.type === "text" ? "text" : "key");
    setFocusToken((token) => token + 1);
  }

  function handleHome() {
    if (!config) {
      return;
    }
    setNav(resetNav(config.commands));
    setMode("key");
    setFocusToken((token) => token + 1);
  }

  async function handleEscape() {
    if (mode === "editor") {
      setMode("key");
      return;
    }
    if (config) {
      setNav(resetNav(config.commands));
      setMode("key");
    }
    await hideWindow();
  }

  if (error) {
    return (
      <div className="app-shell">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!config || !nav) {
    return (
      <div className="app-shell">
        <p className="loading">Laden…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="brand-row">
        <div className="brand-mark">
          <img className="brand-icon" src="/koala.png" alt="" width={18} height={14} />
          <h1 className="brand">KeyboardKoala</h1>
        </div>
        <p className="breadcrumb">{nav.path.join(" › ")}</p>
      </div>

      {mode === "key" ? (
        <KeyView
          commands={nav.current}
          onFire={(command) => void handleFire(command)}
          onBack={handleBack}
          onHome={handleHome}
          onEscape={() => void handleEscape()}
          onOpenEditor={() => setMode("editor")}
          focusToken={focusToken}
        />
      ) : null}

      {mode === "text" ? (
        <TextView
          commands={nav.current}
          onFire={(command) => void handleFire(command)}
          onBack={handleBack}
          onHome={handleHome}
          onEscape={() => void handleEscape()}
          focusToken={focusToken}
        />
      ) : null}

      {mode === "app-launcher" ? (
        <AppLauncherView
          onBack={handleBack}
          onHome={handleHome}
          onEscape={() => void handleEscape()}
          onLaunched={() => {
            setNav(resetNav(config.commands));
            setMode("key");
            void hideWindow();
          }}
          focusToken={focusToken}
        />
      ) : null}

      {mode === "editor" ? (
        <ConfigEditor
          onCancel={() => setMode("key")}
          onSaved={() => {
            void refreshConfig().then(() => setMode("key"));
          }}
        />
      ) : null}

      <div className="status-bar">
        <span>
          Hotkey: {config.hotkey} · {config.loadedFiles.length} config
          {config.loadedFiles.length === 1 ? "" : "s"}
        </span>
        <button type="button" onClick={() => setMode("editor")}>
          Config
        </button>
      </div>
    </div>
  );
}

export default App;
