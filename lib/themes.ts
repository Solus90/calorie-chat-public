/**
 * Per-profile color themes. Each palette is four colors mapped to design tokens;
 * components keep using bg-paper, bg-clay, text-accent, etc.
 */
export type ProfileThemeId = "alex" | "partner" | "lily";

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
  id: ProfileThemeId;
  /** Browser chrome / PWA status bar */
  themeColor: string;
  tokens: ThemeTokens;
};

/** Default Enterprise palette — login, select-profile, and fallback */
export const DEFAULT_THEME = {
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
} as const satisfies Omit<ProfileTheme, "id">;

/** Alex — soft dark forest: green-tinted canvas, pine recesses, lifted clay for actions */
const ALEX_THEME: ProfileTheme = {
  id: "alex",
  themeColor: "#1e2320",
  tokens: {
    paper: "#1e2320",
    paperDeep: "#17362b",
    surface: "#2a302c",
    ink: "#e8ebe6",
    inkMuted: "#b5c4ba",
    hairline: "#354840",
    clay: "#2a5c48",
    claySoft: "#347a5a",
    accent: "#ff7300",
    accentSoft: "#e66800",
    olive: "#4f7f2a",
    amber: "#c9922e",
    rust: "#c45c4a",
    ring: "#ff7300",
  },
};

/** Jordan (partner slug) — rose quartz & gold: blush canvas, burgundy-rose structure */
const JORDAN_THEME: ProfileTheme = {
  id: "partner",
  themeColor: "#f5e4eb",
  tokens: {
    paper: "#f5e4eb",
    paperDeep: "#e8c4d2",
    surface: "#fffcfd",
    ink: "#2a1220",
    inkMuted: "#875568",
    hairline: "#d9adbe",
    clay: "#7a3d52",
    claySoft: "#90495f",
    accent: "#b76e79",
    accentSoft: "#a35f6a",
    olive: "#4a6e58",
    amber: "#c48c4a",
    rust: "#bd4656",
    ring: "#b76e79",
    ringWarn: "#d4a068",
    ringOver: "#a84d62",
  },
};

/** Lily — clear sky on lavender: airy canvas, #c7b6e2 + #94bfe9 as structure & action */
const LILY_THEME: ProfileTheme = {
  id: "lily",
  themeColor: "#ebe6f6",
  tokens: {
    paper: "#ebe6f6",
    paperDeep: "#c7b6e2",
    surface: "#fffcf8",
    ink: "#252038",
    inkMuted: "#625c78",
    hairline: "#ddd4ef",
    clay: "#4888c4",
    claySoft: "#3878b5",
    accent: "#4888c4",
    accentSoft: "#3878b5",
    olive: "#3a7348",
    amber: "#b8860b",
    rust: "#b84a62",
    ring: "#4888c4",
    ringWarn: "#94bfe9",
    ringOver: "#eaadd6",
  },
};

const THEMES: Record<ProfileThemeId, ProfileTheme> = {
  alex: ALEX_THEME,
  partner: JORDAN_THEME,
  lily: LILY_THEME,
};

export function getThemeForProfile(
  profileId: string | null | undefined,
): ProfileTheme | typeof DEFAULT_THEME {
  if (profileId === "alex") return ALEX_THEME;
  if (profileId === "partner") return JORDAN_THEME;
  if (profileId === "lily") return LILY_THEME;
  return DEFAULT_THEME;
}

export function isProfileThemeId(id: string): id is ProfileThemeId {
  return id in THEMES;
}

export function getProfileThemeChoices(): ProfileTheme[] {
  return [ALEX_THEME, JORDAN_THEME, LILY_THEME];
}

export function resolveDataTheme(
  profileId: string | null | undefined,
): ProfileThemeId | "default" {
  return profileId && isProfileThemeId(profileId) ? profileId : "default";
}

/**
 * CSS custom properties for the active theme. Applied inline on <html> so
 * profile colors always match lib/themes.ts (avoids stale CSS bundle cache).
 */
export function themeStyleProperties(
  profileId: string | null | undefined,
): Record<string, string> {
  const t = getThemeForProfile(profileId).tokens;
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
    ...("ringWarn" in t && t.ringWarn
      ? { "--ring-warn": t.ringWarn }
      : {}),
    ...("ringOver" in t && t.ringOver
      ? { "--ring-over": t.ringOver }
      : {}),
  };
}

function applyThemeTokens(
  el: HTMLElement,
  profileId: string | null | undefined,
): void {
  const props = themeStyleProperties(profileId);
  for (const [key, value] of Object.entries(props)) {
    el.style.setProperty(key, value);
  }
  // Profile ring zone tokens — remove when switching away so they don't stick.
  for (const key of ["--ring-warn", "--ring-over"] as const) {
    if (!(key in props)) el.style.removeProperty(key);
  }
}

/**
 * Set data-theme, token vars, and theme-color meta immediately (client only).
 * Call right after a profile switch so the UI doesn't wait on router.refresh().
 */
export function applyProfileTheme(profileId: string | null | undefined): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveDataTheme(profileId);
  applyThemeTokens(document.documentElement, profileId);
  const theme = getThemeForProfile(profileId);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.themeColor);
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
