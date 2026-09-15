import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { DEFAULT_AUTHENTICATED_ROUTE } from '../../../../core/auth/auth.config';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: '../../shared/auth-shell.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  /** Drives the in-button spinner — independent of the global page loader. */
  protected readonly isSubmitting = signal(false);
  /** Inline error displayed inside the form (no global toast for credential errors). */
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected isInvalid(field: 'email' | 'password'): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && ctrl.touched;
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.serverError.set(null);
    this.isSubmitting.set(true);

    this.auth.login({ email, password }).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.toast.success(`تم تسجيل الدخول بنجاح، ${user.userName}`);
        this.router.navigateByUrl(this.resolveReturnUrl());
      },
      error: (err: ApiError) => {
        this.isSubmitting.set(false);
        this.serverError.set(err.message);
      },
    });
  }

  private resolveReturnUrl(): string {
    const target = this.route.snapshot.queryParamMap.get('returnUrl');
    if (target && target.startsWith('/') && !target.startsWith('//')) {
      return target;
    }
    return DEFAULT_AUTHENTICATED_ROUTE;
  }
}
