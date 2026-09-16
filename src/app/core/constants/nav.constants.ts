import { MenuSection } from '../models/menu-item.model';

/**
 * Sidebar structure, adapted from `bar_cubit.dart` (spec §6.2). The Flutter
 * source has a separate sidebar entry + screen for every "Add X" flow;
 * this rebuild deliberately does NOT port that as separate routes — every
 * add/edit form opens as a modal over its list screen instead (confirmed
 * UX decision), so only the list screen for each domain gets a nav entry
 * and a route. This is the SINGLE declarative source the sidebar renders
 * from (no `switch` on an in-memory index the way `BottomCubit.currentScreen`
 * does) — every screen gets a real, bookmarkable route (spec §10 issue:
 * "no URL-based routing" in the Flutter app).
 *
 * "الملاك" (villa/apartment residents) is the "Member" backend concept —
 * a DIFFERENT endpoint from Rehana's "Owner" URLs, which are actually the
 * dashboard's own Admin/Account Manager users (system-users feature).
 * These two were confused once already (confirmed + corrected 2026-09-15)
 * — do not merge them or point them at each other's screen again.
 *
 * Render order matches the Flutter shell exactly: الملاك, الأمن,
 * إدارة المستخدمين, إدارة الحساب, الدردشات. Do not add a role/permission
 * gate here — none exists in Rehana's backend (spec §6.4).
 *
 * "إدارة الحساب" originally held 4 placeholder items (سندات القبض/الصرف,
 * مقبوضات, إدارة المصروفات) ported from the Flutter shell sight-unseen —
 * replaced 2026-09-16 with the two real screens confirmed against the live
 * backend's `bonds`/`bulkDisbursement`/`memberReceipt` endpoints (spec: none,
 * this feature didn't exist in the original Flutter source at all).
 */
export const NAV_SECTIONS: MenuSection[] = [
  {
    label: '',
    items: [{ id: 'dashboard-home', label: 'الرئيسية', route: '/dashboard', icon: 'home' }],
  },
  {
    label: 'الملاك',
    items: [{ id: 'members-list', label: 'كل الملاك', route: '/members', icon: 'users' }],
  },
  {
    label: 'الأمن',
    items: [
      { id: 'security-list', label: 'عرض حراس الأمن', route: '/security-guards', icon: 'shield' },
      { id: 'security-guard-invitations', label: 'دعوات حراس الأمن', route: '/security-guard-invitations', icon: 'ticket' },
    ],
  },
  {
    label: 'إدارة المستخدمين',
    items: [{ id: 'system-users-list', label: 'عرض جميع المستخدمين', route: '/system-users', icon: 'user-cog' }],
  },
  {
    label: 'إدارة الحساب',
    items: [
      { id: 'maintenance-differences', label: 'فروق الصيانة', route: '/accounts/maintenance-differences', icon: 'wrench' },
      { id: 'maintenance-payments', label: 'مدفوعات فروق الصيانة', route: '/accounts/maintenance-payments', icon: 'receipt' },
      { id: 'debts-list', label: 'مديونات أخرى', route: '/accounts/debts', icon: 'banknote' },
      { id: 'debt-payments', label: 'مدفوعات المديونيات', route: '/accounts/debt-payments', icon: 'trending-up' },
    ],
  },
  {
    label: '',
    items: [{ id: 'chat', label: 'الدردشات', route: '/chat', icon: 'chat' }],
  },
];
