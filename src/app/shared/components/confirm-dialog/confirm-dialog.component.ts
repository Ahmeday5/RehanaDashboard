import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent, ButtonVariant } from '../button/button.component';

const TYPE_CLASSES = {
  danger: { title: 'cd-title-danger', confirm: 'danger' as ButtonVariant },
  warning: { title: 'cd-title-warning', confirm: 'primary' as ButtonVariant },
  info: { title: 'cd-title-info', confirm: 'primary' as ButtonVariant },
} as const;

/**
 * Mount once near the app root (e.g. in the main layout) alongside
 * `DialogService`. This is the shared delete-confirmation gate the Flutter
 * app never had (spec §10 issue 4: owner/security-guard deletes fire
 * immediately with no confirmation) — every destructive action in this
 * rebuild routes through `DialogService.confirm()` in front of it.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(DialogService);

  protected readonly state = this.dialog.state;
  protected readonly isOpen = computed(() => this.state().isOpen);
  protected readonly config = computed(() => this.state().config);

  protected readonly titleClass = computed(
    () => TYPE_CLASSES[this.config().type ?? 'danger'].title,
  );
  protected readonly confirmVariant = computed(
    () => TYPE_CLASSES[this.config().type ?? 'danger'].confirm,
  );

  confirm(): void {
    this.dialog.handleResponse(true);
  }

  cancel(): void {
    this.dialog.handleResponse(false);
  }
}
