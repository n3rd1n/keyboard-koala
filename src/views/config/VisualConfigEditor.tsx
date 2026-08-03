import { useState } from "react";
import { DEFAULT_THEME_NAME, THEME_LIST } from "../../theme/themes";
import type { CommandJson, ConfigFile } from "../../types/command";
import {
  addCommandAt,
  emptyCommand,
  moveCommand,
  removeCommandAt,
  updateCommandAt,
} from "../../config/editorOps";

type Props = {
  config: ConfigFile;
  onChange: (config: ConfigFile) => void;
};

type FieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function Field({ label, value, placeholder, onChange }: FieldProps) {
  return (
    <label className="visual-field">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type CommandNodeProps = {
  command: CommandJson;
  path: number[];
  onChange: (path: number[], next: CommandJson) => void;
  onRemove: (path: number[]) => void;
  onAddChild: (path: number[]) => void;
  onMove: (path: number[], direction: -1 | 1) => void;
};

function CommandNode({
  command,
  path,
  onChange,
  onRemove,
  onAddChild,
  onMove,
}: CommandNodeProps) {
  // Roots use path=[index] (length 1). Auto-open root nodes that have children.
  const childCount = command.group?.length ?? 0;
  const [open, setOpen] = useState(childCount > 0 && path.length === 1);
  const typeValue = command.type ?? "";

  function patch(partial: Partial<CommandJson>) {
    const next: CommandJson = { ...command, ...partial };
    if (partial.type === "") {
      delete next.type;
    }
    if (partial.key === "") {
      delete next.key;
    }
    if (partial.category === "") {
      delete next.category;
    }
    if (partial.path === "") {
      delete next.path;
    }
    if (partial.url === "") {
      delete next.url;
    }
    onChange(path, next);
  }

  function handleAddChild() {
    setOpen(true);
    onAddChild(path);
  }

  return (
    <div className="command-node" style={{ marginLeft: path.length > 1 ? 12 : 0 }}>
      <div className="command-node-header">
        <button
          type="button"
          className="ghost"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "▾" : "▸"}
        </button>
        <span className="command-node-title">
          {command.key ? `${command.key} · ` : ""}
          {command.name || "Unnamed"}
          {childCount > 0 ? (
            <span className="command-child-count"> · {childCount}</span>
          ) : null}
        </span>
        <div className="command-node-actions">
          <button type="button" className="ghost" onClick={() => onMove(path, -1)}>
            ↑
          </button>
          <button type="button" className="ghost" onClick={() => onMove(path, 1)}>
            ↓
          </button>
          <button type="button" className="ghost" onClick={handleAddChild}>
            +
          </button>
          <button type="button" className="ghost danger" onClick={() => onRemove(path)}>
            ×
          </button>
        </div>
      </div>

      {open ? (
        <div className="command-node-body">
          <div className="visual-grid">
            <Field
              label="Name"
              value={command.name}
              onChange={(name) => patch({ name })}
            />
            <Field
              label="Key"
              value={command.key ?? ""}
              placeholder="optional"
              onChange={(key) => patch({ key })}
            />
            <Field
              label="Category"
              value={command.category ?? ""}
              placeholder="optional"
              onChange={(category) => patch({ category })}
            />
            <label className="visual-field">
              <span>Type</span>
              <select
                value={typeValue}
                onChange={(event) => patch({ type: event.target.value || undefined })}
              >
                <option value="">key / leaf</option>
                <option value="text">text</option>
                <option value="app-launcher">app-launcher</option>
              </select>
            </label>
            <Field
              label="Path"
              value={command.path ?? ""}
              placeholder="App name/path"
              onChange={(pathValue) => patch({ path: pathValue })}
            />
            <Field
              label="URL"
              value={command.url ?? ""}
              placeholder="https://…"
              onChange={(url) => patch({ url })}
            />
          </div>

          {childCount > 0 ? (
            <div className="command-children">
              <div className="command-children-label">Children ({childCount})</div>
              {command.group?.map((child, index) => (
                <CommandNode
                  key={`${path.join("-")}-${index}-${child.name}`}
                  command={child}
                  path={[...path, index]}
                  onChange={onChange}
                  onRemove={onRemove}
                  onAddChild={onAddChild}
                  onMove={onMove}
                />
              ))}
            </div>
          ) : (
            <p className="hint">Keine Children — mit + hinzufügen.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function VisualConfigEditor({ config, onChange }: Props) {
  function setCommands(commands: CommandJson[]) {
    onChange({ ...config, commands });
  }

  return (
    <div className="visual-editor">
      <div className="visual-settings">
        <Field
          label="Hotkey"
          value={config.hotkey ?? ""}
          placeholder="CommandOrControl+Shift+Space"
          onChange={(hotkey) => onChange({ ...config, hotkey })}
        />
        <label className="visual-field">
          <span>Theme</span>
          <select
            value={config.theme ?? DEFAULT_THEME_NAME}
            onChange={(event) => onChange({ ...config, theme: event.target.value })}
          >
            {THEME_LIST.map((theme) => (
              <option key={theme.name} value={theme.name}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="visual-commands-header">
        <strong>Commands</strong>
        <button
          type="button"
          className="ghost"
          onClick={() => setCommands(addCommandAt(config.commands, [], emptyCommand()))}
        >
          + Command
        </button>
      </div>

      <div className="visual-commands">
        {config.commands.map((command, index) => (
          <CommandNode
            key={`root-${index}`}
            command={command}
            path={[index]}
            onChange={(path, next) =>
              setCommands(updateCommandAt(config.commands, path, next))
            }
            onRemove={(path) => setCommands(removeCommandAt(config.commands, path))}
            onAddChild={(path) =>
              setCommands(addCommandAt(config.commands, path, emptyCommand()))
            }
            onMove={(path, direction) =>
              setCommands(moveCommand(config.commands, path, direction))
            }
          />
        ))}
        {config.commands.length === 0 ? (
          <p className="hint">Noch keine Commands — oben hinzufügen.</p>
        ) : null}
      </div>
    </div>
  );
}
