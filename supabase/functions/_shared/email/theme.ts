// Theme tokens for transactional emails. Solid hex everywhere — no rgba(),
// because rgba borders/backgrounds disappear under iOS Mail force-invert.

export const PALETTE = {
  light: {
    pageBg: "#f4f6fb",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    divider: "#eef2f7",
    soft: "#f8fafc",
    text: "#0f172a",
    body: "#334155",
    muted: "#64748b",
    subtle: "#94a3b8",
    link: "#2563eb",
    linkVisited: "#1d4ed8",
  },
  dark: {
    pageBg: "#0a1024",
    cardBg: "#0d1428",
    border: "#1e293b",
    divider: "#1a2236",
    soft: "#0a1838",
    text: "#f8fafc",
    body: "#cbd5e1",
    muted: "#94a3b8",
    subtle: "#64748b",
    link: "#60a5fa",
    linkVisited: "#93c5fd",
  },
} as const;

export type StatusKey = "info" | "success" | "warning" | "danger";

// Each status has: pill text/bg/border colors for both modes, plus a "border"
// hex that's also used as the CTA button background.
export const STATUS_COLORS: Record<StatusKey, {
  textLight: string; textDark: string;
  pillBgLight: string; pillBgDark: string;
  border: string;       // accent — used for CTA bg + pill border
  iconCircleBgLight: string; iconCircleBgDark: string;
}> = {
  info: {
    textLight: "#1d4ed8", textDark: "#60a5fa",
    pillBgLight: "#eff6ff", pillBgDark: "#0a1838",
    border: "#3b82f6",
    iconCircleBgLight: "#eff6ff", iconCircleBgDark: "#0a1838",
  },
  success: {
    textLight: "#047857", textDark: "#34d399",
    pillBgLight: "#ecfdf5", pillBgDark: "#022c22",
    border: "#10b981",
    iconCircleBgLight: "#ecfdf5", iconCircleBgDark: "#022c22",
  },
  warning: {
    textLight: "#b45309", textDark: "#fbbf24",
    pillBgLight: "#fffbeb", pillBgDark: "#2a1d05",
    border: "#f59e0b",
    iconCircleBgLight: "#fffbeb", iconCircleBgDark: "#2a1d05",
  },
  danger: {
    textLight: "#b91c1c", textDark: "#f87171",
    pillBgLight: "#fef2f2", pillBgDark: "#2c0a0a",
    border: "#ef4444",
    iconCircleBgLight: "#fef2f2", iconCircleBgDark: "#2c0a0a",
  },
};

// Diff colours for old (struck-through) vs new values.
export const DIFF_COLORS = {
  oldLight: "#b91c1c",
  newLight: "#047857",
  oldDark: "#fca5a5",
  newDark: "#86efac",
} as const;

export const FONT_STACK =
  "'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif";

export const RADII = {
  card: "16px",
  control: "12px",
  pill: "999px",
  icon: "14px",
};

export const SIZES = {
  h1: "22px",
  h2: "16px",
  body: "14px",
  small: "12px",
  tiny: "11px",
};

export const SPACING = {
  cardPadX: "32px",
  cardPadY: "32px",
  sectionGap: "20px",
};

const DEFAULT_BUCKET_BASE =
  "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets";

export function logoUrls() {
  // SAFE_DENO_GLOBAL: This file is consumed by Deno edge functions.
  // We use a dynamic env reader so the same module is also importable from
  // Node-based preview tooling (where Deno is undefined).
  const env = (typeof Deno !== "undefined" && (Deno as any).env)
    ? (key: string) => (Deno as any).env.get(key) as string | undefined
    : (_key: string) => undefined;
  return {
    light: env("EMAIL_LOGO_LIGHT_URL") || `${DEFAULT_BUCKET_BASE}/logo-on-white.png`,
    light2x: env("EMAIL_LOGO_LIGHT_2X_URL") || `${DEFAULT_BUCKET_BASE}/logo-on-white@2x.png`,
    dark: env("EMAIL_LOGO_DARK_URL") || `${DEFAULT_BUCKET_BASE}/logo-on-dark.png`,
    dark2x: env("EMAIL_LOGO_DARK_2X_URL") || `${DEFAULT_BUCKET_BASE}/logo-on-dark@2x.png`,
  };
}

// Default app base URL (used in footer links + CTA fallbacks).
export function appBaseUrl(): string {
  const env = (typeof Deno !== "undefined" && (Deno as any).env)
    ? (key: string) => (Deno as any).env.get(key) as string | undefined
    : (_key: string) => undefined;
  return env("APP_BASE_URL") || "https://halflensksa.com";
}

// declare const Deno so this file type-checks in Node tooling too.
// (No-op for the Deno runtime — it owns this global natively.)
// deno-lint-ignore no-explicit-any
declare const Deno: any;
