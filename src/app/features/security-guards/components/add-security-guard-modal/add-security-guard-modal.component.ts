import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SecurityGuardsService } from '../../data/security-guards.service';
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
const GATE_NUMBER_PATTERN = /^\d+$/;

/** Add Security Guard as a modal launched from the list screen. */
@Component({
  selector: 'app-add-security-guard-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './add-security-guard-modal.component.html',
  styleUrl: './add-security-guard-modal.component.scss',
})
export class AddSecurityGuardModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly guards = inject(SecurityGuardsService);

  readonly open = signal(false);
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly imagePreviewUrl = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    userName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    gateNumber: ['', [Validators.required, Validators.pattern(GATE_NUMBER_PATTERN)]],
  });

  launch(): void {
    this.form.reset();
    this.serverError.set(null);
    this.clearImage();
    this.open.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.open.set(false);
  }

  protected onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.setImage(file);
  }

  protected onImageDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file?.type.startsWith('image/')) this.setImage(file);
  }

  protected clearImage(): void {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.selectedImage.set(null);
    this.imagePreviewUrl.set(null);
  }

  private setImage(file: File | null): void {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.selectedImage.set(file);
    this.imagePreviewUrl.set(file ? URL.createObjectURL(file) : null);
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
      await this.guards.create({
        UserName: v.userName,
        Email: v.email,
        Password: v.password,
        PhoneNumber: v.phoneNumber,
        Image: this.selectedImage(),
        GateNumber: v.gateNumber,
        DeviceToken: '',
      });
      this.open.set(false);
      this.created.emit();
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة حارس الأمن'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
