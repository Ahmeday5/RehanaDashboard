/**
 * Single source of truth for design values that need to be read from
 * TypeScript (breakpoint checks, chart colors, etc). Visual styling itself
 * should read the CSS custom properties in `styles.scss` — this file exists
 * so component/service code never hardcodes the same numbers a second time.
 *
 * Resolves spec §1.5 row 4 (five competing "brand green" hex values) and
 * row 5 (breakpoint checks re-implemented per screen) — see FRONTEND_SPEC.md.
 */

/** Matches the Flutter app's SizeConfig.tablet/.desktop (spec §5.4) — one definition, shared everywhere. */
export const BREAKPOINTS = {
  mobile: 800,
  desktop: 1200,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Chosen primary green (spec §5.1 flagged five candidates: #ABBD66, #99B336,
 * #9DC183, #AECB70, #B5CC6D — this is a placeholder pick pending design
 * sign-off, matching the reference login screen's sidebar panel).
 */
export const COLOR_PRIMARY = '#ABBD66';
export const COLOR_DANGER = '#E74A3B';
