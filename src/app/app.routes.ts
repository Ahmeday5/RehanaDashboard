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

  // Authenticated app shell — one route per list screen. "Add X" flows are
  // modals launched from their list screen, not separate routes (confirmed
  // UX decision) — see nav.constants.ts for the full rationale. Each
  // `loadComponent` is swapped from the shared placeholder to its real
  // feature component as that feature's step lands.
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
        path: 'members',
        loadComponent: () =>
          import('./features/members/pages/all-members/all-members.component').then(
            (m) => m.AllMembersComponent,
          ),
      },
      {
        path: 'system-users',
        loadComponent: () =>
          import('./features/system-users/pages/all-system-users/all-system-users.component').then(
            (m) => m.AllSystemUsersComponent,
          ),
      },
      {
        path: 'security-guards',
        loadComponent: () =>
          import('./features/security-guards/pages/all-security-guards/all-security-guards.component').then(
            (m) => m.AllSecurityGuardsComponent,
          ),
      },
      { path: 'accounts/receipts', loadComponent: placeholder, data: { title: 'سندات القبض' } },
      { path: 'accounts/disbursements', loadComponent: placeholder, data: { title: 'سندات الصرف' } },
      { path: 'accounts/bulk-disbursement', loadComponent: placeholder, data: { title: 'إدارة المصروفات' } },
      { path: 'collections', loadComponent: placeholder, data: { title: 'مقبوضات' } },
      {
        path: 'chat',
        data: { title: 'الدردشات' },
        loadComponent: () =>
          import('./features/chat/pages/chat-shell/chat-shell.component').then(
            (m) => m.ChatShellComponent,
          ),
      },
      {
        path: 'chat/:contactId',
        data: { title: 'الدردشات' },
        loadComponent: () =>
          import('./features/chat/pages/chat-shell/chat-shell.component').then(
            (m) => m.ChatShellComponent,
          ),
      },
      { path: '', redirectTo: 'members', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '/members' },
];
