import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemUsersService } from '../../data/system-users.service';
import { SystemUserRole } from '../../data/system-user.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const PHONE_PATTERN = /^\d{10,}$/;
const EMAIL_PATTERN = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$&*~]).{8,}$/;

/** Fixed set — these are the only two roles this backend recognizes for a system user. */
export const SYSTEM_USER_ROLES: SystemUserRole[] = ['Admin', 'Account Manager'];

/** Add System User (Admin / Account Manager) as a modal launched from the list screen. */
@Component({
  selector: 'app-add-system-user-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './add-system-user-modal.component.html',
  styleUrl: './add-system-user-modal.component.scss',
})
export class AddSystemUserModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(SystemUsersService);

  protected readonly roles = SYSTEM_USER_ROLES;

  readonly open = signal(false);
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
    role: ['Admin' as SystemUserRole, [Validators.required]],
  });

  launch(): void {
    this.form.reset({ role: 'Admin' });
    this.serverError.set(null);
    this.open.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.open.set(false);
  }

  protected async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.serverError.set(null);
    this.isSubmitting.set(true);

    try {
      await this.users.create({
        email: v.email,
        password: v.password,
        fullName: v.fullName,
        phoneNumber: v.phoneNumber,
        roles: [v.role],
        deviceToken: '',
      });
      this.open.set(false);
      this.created.emit();
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة المستخدم'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
