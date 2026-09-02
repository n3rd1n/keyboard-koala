export type CommandType = "text" | "app-launcher" | "run";

/** Config command. `key` is required for key-tree navigation; optional for text-search leaves. */
export type CommandJson = {
  name: string;
  key?: string;
  category?: string;
  type?: CommandType | string;
  path?: string;
  url?: string;
  /** Argv spawned without a shell: `["git", "status"]`. First entry is the program. */
  run?: string[];
  group?: CommandJson[];
};

export type ConfigFile = {
  hotkey?: string;
  autostart?: boolean;
  /** Built-in theme name, e.g. `dark`, `darcula`, `monokai`, `light`. */
  theme?: string;
  /** Per-token overrides applied on top of the theme, e.g. `{ "accent": "#ff8800" }`. */
  themeOverrides?: Record<string, string>;
  commands: CommandJson[];
};

export type MergedConfig = {
  hotkey: string;
  autostart: boolean;
  theme: string;
  themeOverrides: Record<string, string>;
  commands: CommandJson[];
  primaryPath: string;
  configDir: string;
  loadedFiles: string[];
};

export type InstalledApp = {
  name: string;
  path: string;
};

export type LauncherMode = "key" | "text" | "app-launcher" | "editor";

/** Stable list identity when `key` is missing (e.g. text-search leaves). */
export function commandIdentity(command: CommandJson, index: number): string {
  if (command.key) {
    return `key:${command.key}:${command.name}`;
  }
  const run = command.run?.join("\u0001") ?? "";
  return `row:${index}:${command.name}:${command.path ?? ""}:${command.url ?? ""}:${run}`;
}
