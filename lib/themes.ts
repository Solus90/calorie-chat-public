/**
 * Color theme system. All profiles use the single DEFAULT_THEME.
 * To add per-profile themes, wire them into getThemeForProfile / isProfileThemeId
 * and add matching [data-theme="id"] blocks in app/globals.css.
 */
export type ProfileThemeId = never;

export type ThemeTokens = {
  paper: string;
  paperDeep: string;
  surface: string;
  ink: string;
  inkMuted: string;
  hairline: string;
  clay: string;
  claySoft: string;
  accent: string;
  accentSoft: string;
  olive: string;
  amber: string;
  rust: string;
  /** Calorie ring progress (under 80%) */
  ring: string;
  /** Optional ring colors for 80%+ and over-budget (profile-specific; others use --amber/--rust) */
  ringWarn?: string;
  ringOver?: string;
};

export type ProfileTheme = {
  /** Browser chrome / PWA status bar */
  themeColor: string;
  tokens: ThemeTokens;
};

/** Default Enterprise palette — used for all profiles */
export const DEFAULT_THEME: ProfileTheme = {
  themeColor: "#edeade",
  tokens: {
    paper: "#edeade",
    paperDeep: "#e3dfd0",
    surface: "#ffffff",
    ink: "#111827",
    inkMuted: "#4b5563",
    hairline: "#d3cfc0",
    clay: "#072c2c",
    claySoft: "#0e4140",
    accent: "#ff7300",
    accentSoft: "#e66800",
    olive: "#16a34a",
    amber: "#d97706",
    rust: "#dc2626",
    ring: "#ff7300",
  },
};

export function getThemeForProfile(_profileId?: string | null): ProfileTheme {
  return DEFAULT_THEME;
}

export function isProfileThemeId(_id: string): _id is ProfileThemeId {
  return false;
}

export function getProfileThemeChoices(): ProfileTheme[] {
  return [];
}

export function resolveDataTheme(
  _profileId?: string | null,
): "default" {
  return "default";
}

/**
 * CSS custom properties for the active theme. Applied inline on <html> so
 * profile colors always match lib/themes.ts (avoids stale CSS bundle cache).
 */
export function themeStyleProperties(
  _profileId?: string | null,
): Record<string, string> {
  const t = DEFAULT_THEME.tokens;
  return {
    "--paper": t.paper,
    "--paper-deep": t.paperDeep,
    "--surface": t.surface,
    "--ink": t.ink,
    "--ink-muted": t.inkMuted,
    "--hairline": t.hairline,
    "--clay": t.clay,
    "--clay-soft": t.claySoft,
    "--accent": t.accent,
    "--accent-soft": t.accentSoft,
    "--olive": t.olive,
    "--amber": t.amber,
    "--rust": t.rust,
    "--ring": t.ring,
  };
}

function applyThemeTokens(el: HTMLElement): void {
  const props = themeStyleProperties();
  for (const [key, value] of Object.entries(props)) {
    el.style.setProperty(key, value);
  }
  for (const key of ["--ring-warn", "--ring-over"] as const) {
    el.style.removeProperty(key);
  }
}

/**
 * Set data-theme, token vars, and theme-color meta immediately (client only).
 * Call right after a profile switch so the UI doesn't wait on router.refresh().
 */
export function applyProfileTheme(_profileId?: string | null): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = "default";
  applyThemeTokens(document.documentElement);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", DEFAULT_THEME.themeColor);
}

/** CSS custom properties for injecting on :root / [data-theme] */
export function themeToCssVars(theme: ProfileTheme): string {
  const t = theme.tokens;
  return `
    --paper: ${t.paper};
    --paper-deep: ${t.paperDeep};
    --surface: ${t.surface};
    --ink: ${t.ink};
    --ink-muted: ${t.inkMuted};
    --hairline: ${t.hairline};
    --clay: ${t.clay};
    --clay-soft: ${t.claySoft};
    --accent: ${t.accent};
    --accent-soft: ${t.accentSoft};
    --olive: ${t.olive};
    --amber: ${t.amber};
    --rust: ${t.rust};
    --ring: ${t.ring};
  `.trim();
}
