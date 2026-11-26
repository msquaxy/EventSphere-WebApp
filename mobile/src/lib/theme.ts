// Brand tokens copied from the website's index.css so the app matches it.
export const colors = {
  ink: "#173f35",
  inkDark: "#102e27",
  inkSoft: "#285649",
  lime: "#d8f36a",
  limeSoft: "#eff9cc",
  cream: "#f5f6ed",
  paper: "#ffffff",
  background: "#fbfcf8",
  text: "#202a25",
  muted: "#707b74",
  border: "#dfe5dc",
  borderDark: "#cbd5c8",
  coral: "#f47b5b",
  danger: "#b44336",
  dangerSoft: "#fbe9e6",
  success: "#267052",
  successSoft: "#e3f3ea",
  infoSoft: "#e8f0ef",
  warnSoft: "#fdf1d6",
  warn: "#8a6a12",
};

export const fonts = {
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
  heading: "Manrope_700Bold",
  headingXL: "Manrope_800ExtraBold",
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 };

export const shadow = {
  shadowColor: "#102e27",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
