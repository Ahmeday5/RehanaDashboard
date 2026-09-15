import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';

const placeholder = () =>
  import('./shared/components/route-placeholder/route-placeholder.component').then(
    (m) => m.RoutePlaceholderComponent,
  );

export const routes: Routes = [
  // Auth area — only reachable when NOT signed in
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layout/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Authenticated app shell — 10 real routes, matching the 10 sidebar-tappable
  // leaf screens confirmed against `bar_cubit.dart` (spec §6.2/§6.5). Each
  // `loadComponent` is swapped from the shared placeholder to its real
  // feature component as that feature's step lands — the route path itself
  // does not change, so this map is final now.
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: 'owners',
        loadComponent: () =>
          import('./features/owners/pages/all-owners/all-owners.component').then(
            (m) => m.AllOwnersComponent,
          ),
      },
      {
        path: 'owners/new',
        loadComponent: () =>
          import('./features/owners/pages/add-owner/add-owner.component').then(
            (m) => m.AddOwnerComponent,
          ),
      },
      { path: 'security-guards', loadComponent: placeholder, data: { title: 'عرض حراس الأمن' } },
      { path: 'security-guards/new', loadComponent: placeholder, data: { title: 'إضافة حارس أمن' } },
      { path: 'system-users', loadComponent: placeholder, data: { title: 'عرض جميع المستخدمين' } },
      { path: 'system-users/new', loadComponent: placeholder, data: { title: 'إضافة مستخدم' } },
      { path: 'accounts/receipts', loadComponent: placeholder, data: { title: 'سندات القبض' } },
      { path: 'accounts/disbursements', loadComponent: placeholder, data: { title: 'سندات الصرف' } },
      { path: 'accounts/bulk-disbursement', loadComponent: placeholder, data: { title: 'إدارة المصروفات' } },
      { path: 'collections', loadComponent: placeholder, data: { title: 'مقبوضات' } },
      { path: 'chat', loadComponent: placeholder, data: { title: 'الدردشات' } },
      { path: '', redirectTo: 'owners', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '/owners' },
];
