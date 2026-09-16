import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SecurityGuardsService } from '../../data/security-guards.service';
import { SecurityGuard } from '../../data/security-guard.model';
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
 * Password change as its own small modal, launched from a guard's row —
 * `PUT /Dashboard/updateSecurityGuardPassword` is a dedicated endpoint
 * (confirmed 2026-09-16), mirroring Members, separate from the general
 * `updateSecurityGuard` payload.
 */
@Component({
  selector: 'app-change-security-guard-password-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './change-security-guard-password-modal.component.html',
  styleUrl: './change-security-guard-password-modal.component.scss',
})
export class ChangeSecurityGuardPasswordModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly guards = inject(SecurityGuardsService);
  private readonly toast = inject(ToastService);

  readonly open = signal(false);
  protected readonly target = signal<SecurityGuard | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
  });

  launch(guard: SecurityGuard): void {
    this.target.set(guard);
    this.form.reset();
    this.serverError.set(null);
    this.open.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.open.set(false);
  }

  protected async onSubmit(): Promise<void> {
    const guard = this.target();
    if (!guard || this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.isSubmitting.set(true);
    try {
      await this.guards.updatePassword({
        securityGuardId: guard.id,
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
