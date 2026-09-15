/**
 * No role/permission gating exists in Rehana's backend or Flutter source
 * (verified: spec §6.4 — every logged-in user sees the identical sidebar).
 * Inventing a gate field here would be a new feature, not a port — if
 * gating is ever wanted, add it back deliberately alongside a real backend
 * contract for it.
 */
export interface MenuItem {
  id: string;
  label: string;
  route: string;
  /** Icon name understood by the app's icon component — see `shared/components/icon`. */
  icon?: string;
  children?: MenuItem[];
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}
