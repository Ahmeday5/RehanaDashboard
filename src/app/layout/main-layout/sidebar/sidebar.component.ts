import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { NAV_SECTIONS } from '../../../core/constants/nav.constants';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { MenuItem } from '../../../core/models/menu-item.model';
import { inject } from '@angular/core';

/**
 * No role/permission gating exists in Rehana (spec §6.4) — every
 * logged-in user sees the identical sidebar, declared once in
 * `nav.constants.ts`. Do not reintroduce a filtering layer here without a
 * confirmed backend contract for it.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly sections = NAV_SECTIONS;

  protected iconName(item: MenuItem): IconName {
    return (item.icon as IconName) ?? 'grid';
  }
}
