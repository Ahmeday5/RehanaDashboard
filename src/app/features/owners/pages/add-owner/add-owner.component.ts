import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OwnersService } from '../../data/owners.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

/**
 * Every regex below is verbatim from the Flutter source (spec §7.3) —
 * do not "improve" or generalize them without re-confirming against the
 * live backend, since some of these (e.g. villa number) are deliberately
 * looser than they look because the original numeric check was commented out.
 */
const PHONE_PATTERN = /^\d{10,}$/;
const EMAIL_PATTERN = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$&*~]).{8,}$/;
const AREA_PATTERN = /^\d+(\.\d+)?$/;
const FLOORS_PATTERN = /^\d+$/;

@Component({
  selector: 'app-add-owner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, IconComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './add-owner.component.html',
  styleUrl: './add-owner.component.scss',
})
export class AddOwnerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly owners = inject(OwnersService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
    villaAddress: ['', [Validators.required, Validators.minLength(5)]],
    villaNumber: ['', [Validators.required]],
    villaLocation: ['', [Validators.required, Validators.minLength(5)]],
    villaStreet: ['', [Validators.required, Validators.minLength(3)]],
    villaSpace: ['', [Validators.required, Validators.pattern(AREA_PATTERN)]],
    villaFloorsNumber: ['', [Validators.required, Validators.pattern(FLOORS_PATTERN)]],
  });

  protected onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedImage.set(file);
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
      await this.owners.create({
        name: v.name,
        email: v.email,
        password: v.password,
        phoneNumber: v.phoneNumber,
        villaAddress: v.villaAddress,
        villaLocation: v.villaLocation,
        VillaNumber: v.villaNumber,
        VillaSpace: v.villaSpace,
        villaStreet: v.villaStreet,
        villaFloorsNumber: Number(v.villaFloorsNumber),
        image: this.selectedImage(),
      });
      this.toast.success('تم إضافة المالك بنجاح');
      this.router.navigateByUrl('/owners');
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة المالك'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
