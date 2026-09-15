import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Professional icon set — path data sourced from Lucide (lucide.dev, ISC
 * license), embedded directly rather than pulled in via the `@lucide/angular`
 * npm package. That package's per-icon components didn't tree-shake in this
 * build (importing ~20 icons pulled in the entire 2,100+ icon library as one
 * ~15MB lazy chunk); embedding just the path data we use keeps the same
 * professional artwork at effectively zero bundle cost, matching the
 * original hand-drawn component's footprint.
 *
 * All icons share Lucide's standard conventions: 24×24 viewBox, 2px stroke,
 * round caps/joins, no fill — so mixing them always looks visually consistent.
 */
export type IconName =
  | 'home'
  | 'users'
  | 'settings'
  | 'file'
  | 'chart'
  | 'grid'
  | 'bell'
  | 'menu'
  | 'inbox'
  | 'shield'
  | 'user-cog'
  | 'wallet'
  | 'chat'
  | 'edit'
  | 'trash'
  | 'logout'
  | 'eye'
  | 'eye-off'
  | 'mail'
  | 'lock'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'search'
  | 'plus'
  | 'x'
  | 'check'
  | 'filter'
  | 'calendar'
  | 'image'
  | 'more-vertical'
  | 'log-out'
  | 'send';

const PATHS: Record<IconName, string> = {
  home: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8|M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M8.5 3.5a4 4 0 1 1 0 7.9M22 21v-2a4 4 0 0 0-3-3.87|M4 3.5a4 4 0 0 1 5.9 0',
  settings:
    'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z|M14 2v4a2 2 0 0 0 2 2h4',
  chart: 'M3 3v16a2 2 0 0 0 2 2h16|M18 17V9|M13 17V5|M8 17v-3',
  grid: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z',
  bell: 'M10.268 21a2 2 0 0 0 3.464 0|M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326',
  menu: 'M4 5h16|M4 12h16|M4 19h16',
  inbox:
    'M22 12h-6l-2 3h-4l-2-3H2|M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11',
  shield:
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
  'user-cog':
    'M10 15H6a4 4 0 0 0-4 4v2|M10.3 21a1.94 1.94 0 0 1 0-2 1.94 1.94 0 0 1 1.9-3.4 1.94 1.94 0 0 1 1.9 3.4 1.94 1.94 0 0 1 0 2 1.94 1.94 0 0 1-3.8 0|m14.305 16.53.923-.382|m15.228 19.852-.923-.383|m16.852 15.228-.383.923|m16.852 20.772-.383-.924|m19.148 16.852.923.383|m20.078 19.852-.923.383|m19.772 17.772-.924-.383|m19.772 18.228-.924.383',
  wallet:
    'M17 14h.01|M7 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V4a1 1 0 0 1 1.243-.97L18 5.5',
  chat: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  edit: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  trash:
    'M3 6h18|M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2|M10 11v6|M14 11v6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9',
  eye: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  'eye-off':
    'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49|M14.084 14.158a3 3 0 0 1-4.242-4.242|M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143|m2 2 20 20',
  mail: 'M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9|m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7|M16 19h6|M19 16v6',
  lock: 'M12 17v.01|M7 11V7a5 5 0 0 1 10 0v4|M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  search: 'm21 21-4.34-4.34|M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
  plus: 'M5 12h14|M12 5v14',
  x: 'M18 6 6 18|m6 6 12 12',
  check: 'M20 6 9 17l-5-5',
  filter: 'M3 6h18|M7 12h10|M10 18h4',
  calendar: 'M8 2v4|M16 2v4|M3 10h18|M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  image: 'M3 3h18v18H3z|m3 16 5-5c.928-.893 2.072-.893 3 0l5 5|m14 14 1-1c.928-.893 2.072-.893 3 0l3 3|M11 8h.01|M14 3h7a1 1 0 0 1 1 1v14',
  'more-vertical': 'M12 12h.01|M12 5h.01|M12 19h.01',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9',
  send: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z|m21.854 2.147-10.94 10.939',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @for (d of segments(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: [':host { display: inline-flex; line-height: 0; } svg { display: block; }'],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly strokeWidth = input<number>(2);

  protected segments(): string[] {
    return (PATHS[this.name()] ?? PATHS['grid']).split('|');
  }
}
