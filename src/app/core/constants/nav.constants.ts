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
 */
export const NAV_SECTIONS: MenuSection[] = [
  {
    label: 'الملاك',
    items: [{ id: 'members-list', label: 'كل الملاك', route: '/members', icon: 'users' }],
  },
  {
    label: 'الأمن',
    items: [{ id: 'security-list', label: 'عرض حراس الأمن', route: '/security-guards', icon: 'shield' }],
  },
  {
    label: 'إدارة المستخدمين',
    items: [{ id: 'system-users-list', label: 'عرض جميع المستخدمين', route: '/system-users', icon: 'user-cog' }],
  },
  {
    label: 'إدارة الحساب',
    items: [
      { id: 'receipts', label: 'سندات القبض', route: '/accounts/receipts', icon: 'wallet' },
      { id: 'collections', label: 'مقبوضات', route: '/collections', icon: 'wallet' },
      { id: 'disbursements', label: 'سندات الصرف', route: '/accounts/disbursements', icon: 'wallet' },
      { id: 'bulk-disbursement', label: 'إدارة المصروفات', route: '/accounts/bulk-disbursement', icon: 'wallet' },
    ],
  },
  {
    label: '',
    items: [{ id: 'chat', label: 'الدردشات', route: '/chat', icon: 'chat' }],
  },
];
