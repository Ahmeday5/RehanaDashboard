import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MembersService } from '../../data/members.service';
import { MemberType, VillaType } from '../../data/member.model';
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

/** Fixed sets, confirmed with the user (2026-09-15) — not free text. */
export const MEMBER_TYPES: MemberType[] = ['مالك', 'مستأجر', 'مفوض'];
export const VILLA_TYPES: VillaType[] = ['مشطبة', 'غير مشطبة'];

/** Add Member (villa/apartment resident) as a modal launched from the list screen. */
@Component({
  selector: 'app-add-member-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './add-member-modal.component.html',
  styleUrl: './add-member-modal.component.scss',
})
export class AddMemberModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly members = inject(MembersService);

  protected readonly memberTypes = MEMBER_TYPES;
  protected readonly villaTypes = VILLA_TYPES;

  readonly open = signal(false);
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly imagePreviewUrl = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    villaAddress: ['', [Validators.required, Validators.minLength(5)]],
    villaNumber: ['', [Validators.required]],
    villaLocation: ['', [Validators.required, Validators.minLength(5)]],
    villaSpace: ['', [Validators.required]],
    villaStreet: [''],
    memberType: ['مالك' as MemberType, [Validators.required]],
    villaType: ['مشطبة' as VillaType, [Validators.required]],
  });

  launch(): void {
    this.form.reset({ memberType: 'مالك', villaType: 'مشطبة' });
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
      await this.members.create({
        Name: v.name,
        Email: v.email,
        Password: v.password,
        PhoneNumber: v.phoneNumber,
        Image: this.selectedImage(),
        VillaAddress: v.villaAddress,
        VillaLocation: v.villaLocation,
        VillaNumber: v.villaNumber,
        VillaSpace: v.villaSpace,
        VillaStreet: v.villaStreet,
        MemberType: v.memberType,
        VillaType: v.villaType,
        DeviceToken: '',
      });
      this.open.set(false);
      this.created.emit();
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة المالك'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
