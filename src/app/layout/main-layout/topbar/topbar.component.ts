import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { DialogService } from '../../../core/services/dialog.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);
  protected readonly layout = inject(LayoutService);
  protected readonly dialog = inject(DialogService);

  protected readonly currentUser = this.authService.currentUser;

  protected readonly initials = computed(() => {
    const name = this.currentUser()?.userName?.trim();
    if (!name) return '؟';
    return name.charAt(0).toUpperCase();
  });

  logout(): void {
    this.dialog
      .confirm({
        title: 'تسجيل الخروج',
        message: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
        type: 'warning',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.authService.logout();
          this.layout.closeMobile();
        }
      });
  }
}
