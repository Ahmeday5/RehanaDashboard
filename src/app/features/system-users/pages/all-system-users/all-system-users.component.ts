import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemUsersService } from '../../data/system-users.service';
import { SystemUser, SystemUserRole } from '../../data/system-user.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import {
  AddSystemUserModalComponent,
  SYSTEM_USER_ROLES,
} from '../../components/add-system-user-modal/add-system-user-modal.component';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const EMAIL_PATTERN = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const PHONE_PATTERN = /^\d{10,}$/;

@Component({
  selector: 'app-all-system-users',
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
    AddSystemUserModalComponent,
  ],
  templateUrl: './all-system-users.component.html',
  styleUrl: './all-system-users.component.scss',
})
export class AllSystemUsersComponent implements OnInit {
  protected readonly users = inject(SystemUsersService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly roles = SYSTEM_USER_ROLES;
  protected readonly addModal = viewChild.required(AddSystemUserModalComponent);

  protected readonly columns: TableColumn[] = [
    { key: 'fullName', label: 'الاسم الكامل', align: 'right' },
    { key: 'email', label: 'البريد الإلكتروني', align: 'right' },
    { key: 'phoneNumber', label: 'رقم الهاتف', align: 'center' },
  ];

  protected readonly editTarget = signal<SystemUser | null>(null);
  protected readonly isEditOpen = computed(() => this.editTarget() !== null);
  protected readonly isSaving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly editForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    password: [''],
    role: ['Admin' as SystemUserRole, [Validators.required]],
  });

  ngOnInit(): void {
    void this.users.load();
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  protected onUserCreated(): void {
    this.toast.success('تم إضافة المستخدم بنجاح');
  }

  protected roleLabel(user: SystemUser): string {
    const role = user.roles?.[0];
    return role === 'Admin' ? 'مسؤول' : role === 'Account Manager' ? 'مدير حسابات' : role ?? '—';
  }

  protected openEdit(user: SystemUser): void {
    this.serverError.set(null);
    this.editForm.reset({
      fullName: user.fullName ?? '',
      email: user.email,
      phoneNumber: user.phoneNumber ?? '',
      password: '',
      role: user.roles?.[0] ?? 'Admin',
    });
    this.editTarget.set(user);
  }

  protected closeEdit(): void {
    this.editTarget.set(null);
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
      await this.users.update(target.id, {
        email: v.email,
        fullName: v.fullName,
        phoneNumber: v.phoneNumber,
        password: v.password,
        roles: [v.role],
      });
      this.toast.success('تم تحديث بيانات المستخدم بنجاح');
      this.editTarget.set(null);
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر حفظ التعديلات'));
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Closes spec §10 issue 4 — no destructive action fires without confirmation first. */
  protected async confirmDelete(user: SystemUser): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف المستخدم',
      message: `هل أنت متأكد أنك تريد حذف "${user.fullName ?? user.email}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      confirmText: 'حذف',
    });
    if (!confirmed) return;

    try {
      await this.users.delete(user.id);
      this.toast.success('تم حذف المستخدم بنجاح');
    } catch (err) {
      this.toast.error(apiErrorToMessage(err as ApiError, 'تعذّر حذف المستخدم'));
    }
  }
}
