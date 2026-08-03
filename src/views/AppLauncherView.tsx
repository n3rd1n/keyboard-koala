import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { InstalledApp } from "../types/command";
import { filterByFuzzyName } from "../commands/fuzzy";
import { launchInstalledApp } from "../commands/fire";
import { useActivationSafeSearch } from "../app/useActivationSafeSearch";

type Props = {
  onBack: () => void;
  onHome: () => void;
  onEscape: () => void;
  onLaunched: () => void;
  focusToken: number;
};

export function AppLauncherView({
  onBack,
  onHome,
  onEscape,
  onLaunched,
  focusToken,
}: Props) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { query, inputRef, handleChange, absorbActivationKey } =
    useActivationSafeSearch(focusToken);

  useEffect(() => {
    let active = true;
    invoke<InstalledApp[]>("get_installed_apps")
      .then((result) => {
        if (active) {
          setApps(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(String(err));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => filterByFuzzyName(apps, query),
    [apps, query],
  );

  useEffect(() => {
    setSelected(0);
  }, [query, focusToken]);

  function moveSelection(delta: number) {
    if (filtered.length === 0) {
      return;
    }
    setSelected((current) => {
      const next = current + delta;
      if (next < 0) {
        return filtered.length - 1;
      }
      if (next >= filtered.length) {
        return 0;
      }
      return next;
    });
  }

  async function launch(app: InstalledApp) {
    await launchInstalledApp(app.path);
    onLaunched();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (absorbActivationKey(event)) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key === "." && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onHome();
      return;
    }
    if (event.key === "-" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onBack();
      return;
    }
    if (
      (event.key === "k" && event.ctrlKey) ||
      (event.key === "p" && event.ctrlKey) ||
      event.key === "ArrowUp"
    ) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (
      (event.key === "j" && event.ctrlKey) ||
      (event.key === "n" && event.ctrlKey) ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const app = filtered[selected];
      if (app) {
        void launch(app);
      }
    }
  }

  return (
    <div className="view">
      <input
        ref={inputRef}
        className="search-input"
        value={query}
        placeholder="App suchen…"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {error ? <p className="error">{error}</p> : null}
      <ul className="result-list">
        {filtered.map((app, index) => (
          <li key={app.path}>
            <button
              type="button"
              className={index === selected ? "result selected" : "result"}
              onClick={() => void launch(app)}
              onMouseEnter={() => setSelected(index)}
            >
              <span>{app.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
