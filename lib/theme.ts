// These must stay in sync with the CSS custom properties in app/globals.css.
// They exist because "var(--x)" + "55" is invalid CSS — alpha-suffix hex
// tricks (e.g. "#5fbe8a" + "55") only work on a literal hex string, so any
// component that builds a translucent variant at runtime needs the literal
// value, not the CSS variable reference.
export const STATUS_HEX = {
  idle: "#4b5567",
  active: "#4fd8ff",
  success: "#34e3a1",
  warning: "#ffc857",
  error: "#ff6b81",
} as const;
