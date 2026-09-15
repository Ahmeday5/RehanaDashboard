import { MenuSection } from '../models/menu-item.model';

/**
 * Sidebar structure, verified against `bar_cubit.dart` (spec §6.2) —
 * 4 expandable groups + 1 leaf, 10 sidebar-tappable leaf screens total.
 * This is the SINGLE declarative source the sidebar renders from (no
 * `switch` on an in-memory index the way `BottomCubit.currentScreen` does)
 * — every screen gets a real, bookmarkable route (spec §10 issue: "no
 * URL-based routing" in the Flutter app).
 *
 * Render order matches the Flutter shell exactly: الملاك, الأمن,
 * إدارة المستخدمين, إدارة الحساب, الدردشات. Do not add a role/permission
 * gate here — none exists in Rehana's backend (spec §6.4).
 */
export const NAV_SECTIONS: MenuSection[] = [
  {
    label: 'الملاك',
    items: [
      { id: 'owners-new', label: 'اضافة مالك', route: '/owners/new', icon: 'users' },
      { id: 'owners-list', label: 'كل الملاك', route: '/owners', icon: 'users' },
    ],
  },
  {
    label: 'الأمن',
    items: [
      { id: 'security-new', label: 'إضافة حارس أمن', route: '/security-guards/new', icon: 'shield' },
      { id: 'security-list', label: 'عرض حراس الأمن', route: '/security-guards', icon: 'shield' },
    ],
  },
  {
    label: 'إدارة المستخدمين',
    items: [
      { id: 'system-users-new', label: 'إضافة مستخدم', route: '/system-users/new', icon: 'user-cog' },
      { id: 'system-users-list', label: 'عرض جميع المستخدمين', route: '/system-users', icon: 'user-cog' },
    ],
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
