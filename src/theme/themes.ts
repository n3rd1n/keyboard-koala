/** Design tokens a theme provides. Each token maps to a CSS custom property (`bgElevated` → `--bg-elevated`). */
export const THEME_TOKENS = [
  "bg",
  "bgElevated",
  "bgSunken",
  "backdrop",
  "border",
  "text",
  "muted",
  "accent",
  "accentSoft",
  "accentText",
  "key",
  "danger",
  "font",
  "mono",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

export type ThemeTokens = Record<ThemeToken, string>;

export type ColorScheme = "dark" | "light";

export type Theme = {
  name: string;
  label: string;
  colorScheme: ColorScheme;
  tokens: ThemeTokens;
};

export const DEFAULT_THEME_NAME = "dark";

const SANS = '"IBM Plex Sans", "Segoe UI", sans-serif';
const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, monospace';

const dark: Theme = {
  name: "dark",
  label: "Dark",
  colorScheme: "dark",
  tokens: {
    bg: "#16181d",
    bgElevated: "#1f232b",
    bgSunken: "#0f1115",
    backdrop: "radial-gradient(circle at top, #222833 0%, #12141a 70%)",
    border: "#2c3340",
    text: "#e8ecf2",
    muted: "#9aa3b2",
    accent: "#3d9a6a",
    accentSoft: "#244a36",
    accentText: "#d9ffe8",
    key: "#7eb6ff",
    danger: "#d96b6b",
    font: SANS,
    mono: MONO,
  },
};

const darcula: Theme = {
  name: "darcula",
  label: "Darcula",
  colorScheme: "dark",
  tokens: {
    bg: "#2b2b2b",
    bgElevated: "#3c3f41",
    bgSunken: "#232525",
    backdrop: "radial-gradient(circle at top, #3c3f41 0%, #212121 70%)",
    border: "#4e5254",
    text: "#a9b7c6",
    muted: "#808080",
    accent: "#cc7832",
    accentSoft: "#4b3a26",
    accentText: "#ffc66d",
    key: "#6897bb",
    danger: "#cc6666",
    font: SANS,
    mono: MONO,
  },
};

const monokai: Theme = {
  name: "monokai",
  label: "Monokai",
  colorScheme: "dark",
  tokens: {
    bg: "#272822",
    bgElevated: "#34352c",
    bgSunken: "#1e1f1c",
    backdrop: "radial-gradient(circle at top, #35362e 0%, #1e1f1c 70%)",
    border: "#49483e",
    text: "#f8f8f2",
    muted: "#8f908a",
    accent: "#a6e22e",
    accentSoft: "#3b471f",
    accentText: "#e6ffb8",
    key: "#66d9ef",
    danger: "#f92672",
    font: SANS,
    mono: MONO,
  },
};

const light: Theme = {
  name: "light",
  label: "Light",
  colorScheme: "light",
  tokens: {
    bg: "#ffffff",
    bgElevated: "#eef1f6",
    bgSunken: "#f7f8fa",
    backdrop: "radial-gradient(circle at top, #ffffff 0%, #dfe3ea 70%)",
    border: "#d3d8e0",
    text: "#1b1f27",
    muted: "#5c6675",
    accent: "#2f7d55",
    accentSoft: "#d7efe1",
    accentText: "#123625",
    key: "#2563b0",
    danger: "#b3403f",
    font: SANS,
    mono: MONO,
  },
};

export const THEMES: Record<string, Theme> = {
  dark,
  darcula,
  monokai,
  light,
};

export const THEME_LIST: Theme[] = [dark, darcula, monokai, light];

/** Built-in theme by name, case-insensitive. `null` when unknown. */
export function findTheme(name: string | undefined | null): Theme | null {
  if (!name) {
    return null;
  }
  return THEMES[name.trim().toLowerCase()] ?? null;
}
