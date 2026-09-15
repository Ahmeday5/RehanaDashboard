import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { matchFieldsValidator } from '../../../../shared/validators/form-validation.util';
import { LOGIN_ROUTE } from '../../../../core/auth/auth.config';

/** Verbatim from the Flutter source (spec §7.2): ≥1 lowercase, ≥1 uppercase, ≥1 digit, ≥1 special, min length 8. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$&*~%^_])[A-Za-z\d!@#$&*~%^_]{8,}$/;

/**
 * Expects `email` and `token` as query params — the exact link shape your
 * backend emails to the user. Adjust `resolveParams()` if yours differs.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormErrorComponent,
    PasswordInputComponent,
    ButtonComponent,
    IconComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: '../../shared/auth-shell.scss',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFieldsValidator('newPassword', 'confirmPassword') },
  );

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, token } = this.resolveParams();
    if (!email || !token) {
      this.serverError.set('رابط إعادة التعيين غير صالح أو منتهي الصلاحية.');
      return;
    }

    this.serverError.set(null);
    this.isSubmitting.set(true);

    this.auth
      .resetPassword({ email, token, newPassword: this.form.getRawValue().newPassword })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('تم تغيير كلمة السر بنجاح، يمكنك تسجيل الدخول الآن');
          this.router.navigateByUrl(LOGIN_ROUTE);
        },
        error: (err: ApiError) => {
          this.isSubmitting.set(false);
          this.serverError.set(err.message);
        },
      });
  }

  private resolveParams(): { email: string | null; token: string | null } {
    const params = this.route.snapshot.queryParamMap;
    return { email: params.get('email'), token: params.get('token') };
  }
}
