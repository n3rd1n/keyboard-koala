import {
  DEFAULT_THEME_NAME,
  THEME_TOKENS,
  findTheme,
  type ColorScheme,
  type ThemeToken,
  type ThemeTokens,
} from "./themes";

export type ThemeOverrides = Record<string, string>;

export type ResolvedTheme = {
  name: string;
  colorScheme: ColorScheme;
  tokens: ThemeTokens;
};

const TOKEN_BY_NORMALIZED_KEY = new Map<string, ThemeToken>(
  THEME_TOKENS.map((token) => [normalizeKey(token), token]),
);

/** `--bg-elevated`, `bg_elevated`, `Bg Elevated` and `bgElevated` all normalize to `bgelevated`. */
function normalizeKey(key: string): string {
  return key.replace(/^--/, "").replace(/[-_\s]/g, "").toLowerCase();
}

/** Config override key → known token, or `null` for unknown keys. */
export function resolveTokenKey(key: string): ThemeToken | null {
  return TOKEN_BY_NORMALIZED_KEY.get(normalizeKey(key)) ?? null;
}

/** `bgElevated` → `--bg-elevated` */
export function cssVarName(token: ThemeToken): string {
  return `--${token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
}

function isColorScheme(value: string): value is ColorScheme {
  return value === "dark" || value === "light";
}

/** Merge a built-in theme with per-token overrides from the user config. Unknown override keys are ignored. */
export function resolveTheme(
  name: string | undefined | null,
  overrides: ThemeOverrides | undefined | null,
): ResolvedTheme {
  const base = findTheme(name) ?? findTheme(DEFAULT_THEME_NAME)!;
  const tokens: ThemeTokens = { ...base.tokens };
  let colorScheme = base.colorScheme;

  for (const [rawKey, rawValue] of Object.entries(overrides ?? {})) {
    const value = String(rawValue).trim();
    if (!value) {
      continue;
    }
    if (normalizeKey(rawKey) === "colorscheme") {
      if (isColorScheme(value)) {
        colorScheme = value;
      }
      continue;
    }
    const token = resolveTokenKey(rawKey);
    if (token) {
      tokens[token] = value;
    }
  }

  return { name: base.name, colorScheme, tokens };
}

/** Write a resolved theme onto an element (usually `<html>`). */
export function applyTheme(root: HTMLElement, theme: ResolvedTheme): void {
  for (const token of THEME_TOKENS) {
    root.style.setProperty(cssVarName(token), theme.tokens[token]);
  }
  root.style.colorScheme = theme.colorScheme;
  root.dataset.theme = theme.name;
}
