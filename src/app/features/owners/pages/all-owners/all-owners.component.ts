import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OwnersService } from '../../data/owners.service';
import { resolveOwnerAvatarUrl } from '../../data/owners-api.service';
import { Owner } from '../../data/owner.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

@Component({
  selector: 'app-all-owners',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    IconComponent,
    ModalComponent,
    FormErrorComponent,
    PasswordInputComponent,
  ],
  templateUrl: './all-owners.component.html',
  styleUrl: './all-owners.component.scss',
})
export class AllOwnersComponent implements OnInit {
  protected readonly owners = inject(OwnersService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly resolveAvatar = resolveOwnerAvatarUrl;

  private readonly avatarCellTpl = viewChild<TemplateRef<{ $implicit: Owner }>>('avatarCell');

  /** Built as a computed so `cellTemplate` waits for the view's `ng-template`s to exist. */
  protected readonly columns = computed<TableColumn[]>(() => [
    { key: 'picture', label: 'الصورة', align: 'center', cellTemplate: this.avatarCellTpl() ?? undefined },
    { key: 'email', label: 'البريد الإلكتروني', align: 'right' },
    { key: 'userName', label: 'الاسم', align: 'right' },
    { key: 'villaNumber', label: 'رقم الفيلا', align: 'center' },
    { key: 'phoneNumber', label: 'الهاتف', align: 'right' },
  ]);

  protected readonly editTarget = signal<Owner | null>(null);
  protected readonly isEditOpen = computed(() => this.editTarget() !== null);
  protected readonly isSaving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
    password: [''],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
    villaAddress: ['', [Validators.required, Validators.minLength(5)]],
    villaNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    villaLocation: ['', [Validators.required, Validators.minLength(5)]],
    villaSpace: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
    villaStreet: ['', [Validators.required, Validators.minLength(3)]],
    villaFloorsNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    void this.owners.load();
  }

  protected openEdit(owner: Owner): void {
    this.serverError.set(null);
    this.editForm.reset({
      name: owner.userName,
      email: owner.email,
      password: '',
      phoneNumber: owner.phoneNumber,
      villaAddress: owner.villaAddress,
      villaNumber: String(owner.villaNumber),
      villaLocation: owner.villaLocation,
      villaSpace: owner.villaSpace,
      villaStreet: owner.villaStreet,
      villaFloorsNumber: String(owner.villaFloorsNumber),
    });
    this.editTarget.set(owner);
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
      await this.owners.update({
        Id: target.id,
        Email: v.email,
        Name: v.name,
        PhoneNumber: v.phoneNumber,
        Password: v.password,
        VillaAddress: v.villaAddress,
        VillaNumber: Number(v.villaNumber),
        VillaLocation: v.villaLocation,
        VillaSpace: v.villaSpace,
        VillaStreet: v.villaStreet,
        VillaFloorsNumber: Number(v.villaFloorsNumber),
      });
      this.toast.success('تم تحديث بيانات المالك بنجاح');
      this.editTarget.set(null);
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر حفظ التعديلات'));
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Closes spec §10 issue 4 — the Flutter app deletes immediately with no
   * confirmation at all. Every destructive action in this rebuild routes
   * through `DialogService.confirm()` first.
   */
  protected async confirmDelete(owner: Owner): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف المالك',
      message: `هل أنت متأكد أنك تريد حذف "${owner.userName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      confirmText: 'حذف',
    });
    if (!confirmed) return;

    try {
      await this.owners.delete(owner.id);
      this.toast.success('تم حذف المالك بنجاح');
    } catch (err) {
      this.toast.error(apiErrorToMessage(err as ApiError, 'تعذّر حذف المالك'));
    }
  }
}
