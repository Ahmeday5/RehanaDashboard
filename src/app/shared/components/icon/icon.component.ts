import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from '@lucide/angular';
import {
  LucideHome,
  LucideUsers,
  LucideSettings,
  LucideFileText,
  LucideBarChart3,
  LucideLayoutGrid,
  LucideBell,
  LucideMenu,
  LucideInbox,
  LucideShieldCheck,
  LucideUserCog,
  LucideWallet,
  LucideMessageCircle,
  LucidePencil,
  LucideTrash2,
  LucideLogOut,
  LucideEye,
  LucideEyeOff,
  LucideMail,
  LucideLock,
} from '@lucide/angular';

/**
 * One professional icon set (Lucide) behind the app's stable `IconName`
 * API — every existing `<app-icon name="...">` call site keeps working
 * unchanged; only the underlying artwork was replaced (hand-drawn inline
 * SVG paths → a maintained, consistent icon library).
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
  | 'lock';

const ICONS: Record<IconName, LucideIconData> = {
  home: LucideHome,
  users: LucideUsers,
  settings: LucideSettings,
  file: LucideFileText,
  chart: LucideBarChart3,
  grid: LucideLayoutGrid,
  bell: LucideBell,
  menu: LucideMenu,
  inbox: LucideInbox,
  shield: LucideShieldCheck,
  'user-cog': LucideUserCog,
  wallet: LucideWallet,
  chat: LucideMessageCircle,
  edit: LucidePencil,
  trash: LucideTrash2,
  logout: LucideLogOut,
  eye: LucideEye,
  'eye-off': LucideEyeOff,
  mail: LucideMail,
  lock: LucideLock,
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `<lucide-angular [img]="icon()" [size]="size()" [strokeWidth]="strokeWidth()" />`,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly strokeWidth = input<number>(1.75);

  protected icon(): LucideIconData {
    return ICONS[this.name()] ?? LucideLayoutGrid;
  }
}
