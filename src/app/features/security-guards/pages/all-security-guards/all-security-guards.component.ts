import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SecurityGuardsService } from '../../data/security-guards.service';
import { resolveSecurityGuardAvatarUrl } from '../../data/security-guards-api.service';
import { SecurityGuard } from '../../data/security-guard.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { AddSecurityGuardModalComponent } from '../../components/add-security-guard-modal/add-security-guard-modal.component';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const EMAIL_PATTERN = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const PHONE_PATTERN = /^\d{10,}$/;
const GATE_NUMBER_PATTERN = /^\d+$/;

@Component({
  selector: 'app-all-security-guards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    IconComponent,
    ModalComponent,
    FormErrorComponent,
    PasswordInputComponent,
    AddSecurityGuardModalComponent,
  ],
  templateUrl: './all-security-guards.component.html',
  styleUrl: './all-security-guards.component.scss',
})
export class AllSecurityGuardsComponent implements OnInit {
  protected readonly guards = inject(SecurityGuardsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly resolveAvatar = resolveSecurityGuardAvatarUrl;
  protected readonly addModal = viewChild.required(AddSecurityGuardModalComponent);

  protected readonly editTarget = signal<SecurityGuard | null>(null);
  protected readonly isEditOpen = computed(() => this.editTarget() !== null);
  protected readonly isSaving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly editSelectedImage = signal<File | null>(null);
  protected readonly editImagePreviewUrl = signal<string | null>(null);
  protected readonly editDisplayImageUrl = computed(
    () => this.editImagePreviewUrl() ?? this.resolveAvatar(this.editTarget()?.pictureUrl ?? null),
  );

  protected readonly editForm = this.fb.nonNullable.group({
    userName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: [''],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    gateNumber: ['', [Validators.required, Validators.pattern(GATE_NUMBER_PATTERN)]],
  });

  ngOnInit(): void {
    void this.guards.load();
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  protected onGuardCreated(): void {
    this.toast.success('تم إضافة حارس الأمن بنجاح');
  }

  protected openEdit(guard: SecurityGuard): void {
    this.serverError.set(null);
    this.clearEditImage();
    this.editForm.reset({
      userName: guard.userName,
      email: guard.email,
      password: '',
      phoneNumber: guard.phoneNumber,
      gateNumber: guard.gateNumber,
    });
    this.editTarget.set(guard);
  }

  protected closeEdit(): void {
    this.editTarget.set(null);
  }

  protected onEditImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.setEditImage(file);
  }

  protected onEditImageDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file?.type.startsWith('image/')) this.setEditImage(file);
  }

  protected clearEditImage(): void {
    const prev = this.editImagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editSelectedImage.set(null);
    this.editImagePreviewUrl.set(null);
  }

  private setEditImage(file: File | null): void {
    const prev = this.editImagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editSelectedImage.set(file);
    this.editImagePreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  protected async saveEdit(): Promise<void> {
    const target = this.editTarget();
    if (!target || this.isSaving()) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const v = this.editForm.getRawValue();
    this.serverError.set(null);
    this.isSaving.set(true);
    try {
      await this.guards.update({
        Id: target.id,
        UserName: v.userName,
        Email: v.email,
        PhoneNumber: v.phoneNumber,
        Password: v.password || undefined,
        Image: this.editSelectedImage(),
        GateNumber: v.gateNumber,
      });
      this.toast.success('تم تحديث بيانات حارس الأمن بنجاح');
      this.editTarget.set(null);
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر حفظ التعديلات'));
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Closes spec §10 issue 4 — no destructive action fires without confirmation first. */
  protected async confirmDelete(guard: SecurityGuard): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف حارس الأمن',
      message: `هل أنت متأكد أنك تريد حذف "${guard.userName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      confirmText: 'حذف',
    });
    if (!confirmed) return;

    try {
      await this.guards.delete(guard.id);
      this.toast.success('تم حذف حارس الأمن بنجاح');
    } catch (err) {
      this.toast.error(apiErrorToMessage(err as ApiError, 'تعذّر حذف حارس الأمن'));
    }
  }
}
