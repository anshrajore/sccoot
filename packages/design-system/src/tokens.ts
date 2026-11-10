/** Stitch Scoot Student Mobility tokens (DESIGN.md). */
export const color = {
  canvas: "#E9E4FA",
  surface: "#FFFFFF",
  surfaceSubtle: "#F3F0FC",
  ink: "#12141A",
  inkSecondary: "#666C7E",
  inverse: "#FFFFFF",
  primary: "#7C5CE6",
  primaryDeep: "#6341CB",
  ochre: "#FFA940",
  sky: "#A8C7FA",
  pink: "#F7B5E6",
  safe: "#22C55E",
  error: "#BA1A1A",
  dock: "#12141A",
  border: "rgba(18, 20, 26, 0.06)",
} as const;

export const space = {
  "2xs": 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  "2xl": 40,
  margin: 20,
  gutter: 12,
  dockClearance: 96,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  sheet: 40,
  pill: 9999,
} as const;

export const type = {
  fontFamily: "PlusJakartaSans",
  headlineLg: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.56 },
  headlineMd: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.2 },
  titleMd: { fontSize: 16, fontWeight: "600" as const },
  bodyMd: { fontSize: 14, fontWeight: "400" as const },
  bodySm: { fontSize: 12, fontWeight: "500" as const },
  currencyLg: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.44 },
  labelMd: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.22 },
};

export const shadow = {
  sheet: "0 12px 32px -8px rgba(124, 92, 230, 0.08)",
  dock: "0 16px 36px rgba(18, 20, 26, 0.18)",
};
