import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { loadPrimaryConfig, savePrimaryConfig } from "../config/api";
import {
  parseConfigText,
  stringifyConfig,
} from "../config/editorOps";
import type { ConfigFile } from "../types/command";
import { VisualConfigEditor } from "./config/VisualConfigEditor";

type Props = {
  onSaved: () => void;
  onCancel: () => void;
};

type Tab = "visual" | "text";

const emptyConfig = (): ConfigFile => ({
  hotkey: "CommandOrControl+Shift+Space",
  autostart: false,
  commands: [],
});

export function ConfigEditor({ onSaved, onCancel }: Props) {
  const [tab, setTab] = useState<Tab>("visual");
  const [text, setText] = useState("");
  const [config, setConfig] = useState<ConfigFile>(emptyConfig);
  const [autostart, setAutostart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadPrimaryConfig();
        setConfig(loaded);
        setText(stringifyConfig(loaded));
        setAutostart(await isEnabled());
      } catch (err) {
        setError(String(err));
      }
    })();
  }, []);

  function switchTab(next: Tab) {
    setError(null);
    if (next === tab) {
      return;
    }

    if (tab === "text" && next === "visual") {
      try {
        const parsed = parseConfigText(text);
        setConfig(parsed);
        setTab("visual");
      } catch (err) {
        setError(`JSON ungültig — Tab nicht gewechselt: ${String(err)}`);
      }
      return;
    }

    if (tab === "visual" && next === "text") {
      setText(stringifyConfig(config));
      setTab("text");
    }
  }

  function currentConfig(): ConfigFile {
    if (tab === "text") {
      return parseConfigText(text);
    }
    return config;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const parsed = currentConfig();
      const merged = await savePrimaryConfig(parsed);
      setConfig(parsed);
      setText(stringifyConfig(parsed));
      if (merged.hotkey) {
        await invoke("update_hotkey", { hotkey: merged.hotkey });
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutostart() {
    try {
      if (autostart) {
        await disable();
        setAutostart(false);
      } else {
        await enable();
        setAutostart(true);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="view editor">
      <div className="editor-toolbar">
        <strong>Primär-Config</strong>
        <label className="autostart">
          <input
            type="checkbox"
            checked={autostart}
            onChange={() => void toggleAutostart()}
          />
          Start at login
        </label>
      </div>

      <div className="editor-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "visual"}
          className={tab === "visual" ? "tab active" : "tab"}
          onClick={() => switchTab("visual")}
        >
          Visuell
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "text"}
          className={tab === "text" ? "tab active" : "tab"}
          onClick={() => switchTab("text")}
        >
          Text
        </button>
      </div>

      {tab === "text" ? (
        <textarea
          className="editor-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <VisualConfigEditor config={config} onChange={setConfig} />
      )}

      {error ? <p className="error">{error}</p> : null}
      <div className="editor-actions">
        <button type="button" onClick={onCancel}>
          Abbrechen
        </button>
        <button
          type="button"
          className="primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
