import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemUsersService } from '../../data/system-users.service';
import { SystemUser } from '../../data/system-user.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$&*~]).{8,}$/;

/**
 * Password change as its own small modal, launched from a system user's
 * row — `PUT /Dashboard/updateOwnerPassword` is a dedicated endpoint
 * (confirmed 2026-09-16), mirroring Members/Security Guards, separate from
 * the general `updateOwner` payload.
 */
@Component({
  selector: 'app-change-system-user-password-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './change-system-user-password-modal.component.html',
  styleUrl: './change-system-user-password-modal.component.scss',
})
export class ChangeSystemUserPasswordModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(SystemUsersService);
  private readonly toast = inject(ToastService);

  readonly open = signal(false);
  protected readonly target = signal<SystemUser | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
  });

  launch(user: SystemUser): void {
    this.target.set(user);
    this.form.reset();
    this.serverError.set(null);
    this.open.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.open.set(false);
  }

  protected async onSubmit(): Promise<void> {
    const user = this.target();
    if (!user || this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.isSubmitting.set(true);
    try {
      await this.users.updatePassword({
        ownerId: user.id,
        newPassword: this.form.getRawValue().newPassword,
      });
      this.open.set(false);
      this.toast.success('تم تغيير كلمة السر بنجاح');
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر تغيير كلمة السر'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
