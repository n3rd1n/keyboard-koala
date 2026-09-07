import { useEffect, useMemo, useState } from "react";
import type { CommandJson } from "../types/command";
import { commandIdentity } from "../types/command";
import { filterByFuzzyName } from "../commands/fuzzy";
import { useActivationSafeSearch } from "../app/useActivationSafeSearch";

type Props = {
  commands: CommandJson[];
  onFire: (command: CommandJson) => void;
  onBack: () => void;
  onHome: () => void;
  onEscape: () => void;
  focusToken: number;
};

export function TextView({
  commands,
  onFire,
  onBack,
  onHome,
  onEscape,
  focusToken,
}: Props) {
  const [selected, setSelected] = useState(0);
  const { query, inputRef, handleChange } = useActivationSafeSearch(focusToken, commands);

  const filtered = useMemo(
    () => filterByFuzzyName(commands, query),
    [commands, query],
  );

  useEffect(() => {
    setSelected(0);
  }, [query, focusToken, commands]);

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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
      const command = filtered[selected];
      if (command) {
        onFire(command);
      }
    }
  }

  return (
    <div className="view">
      <input
        ref={inputRef}
        className="search-input"
        value={query}
        placeholder="Suchen…"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <ul className="result-list">
        {filtered.map((command, index) => (
          <li key={commandIdentity(command, index)}>
            <button
              type="button"
              className={index === selected ? "result selected" : "result"}
              onClick={() => onFire(command)}
              onMouseEnter={() => setSelected(index)}
            >
              <span>{command.name}</span>
              {command.category ? (
                <span className="meta">{command.category}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
