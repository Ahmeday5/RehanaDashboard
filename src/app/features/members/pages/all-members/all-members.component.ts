import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MembersService } from '../../data/members.service';
import { resolveMemberAvatarUrl } from '../../data/members-api.service';
import { Member, MemberType, VillaType } from '../../data/member.model';
import {
  DataTableComponent,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  AddMemberModalComponent,
  MEMBER_TYPES,
  VILLA_TYPES,
} from '../../components/add-member-modal/add-member-modal.component';
import { ChangeMemberPasswordModalComponent } from '../../components/change-member-password-modal/change-member-password-modal.component';
import { MemberDependantsPanelComponent } from '../../components/member-dependants-panel/member-dependants-panel.component';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const EMAIL_PATTERN = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const PHONE_PATTERN = /^\d{10,}$/;

@Component({
  selector: 'app-all-members',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    RefreshButtonComponent,
    PaginationComponent,
    IconComponent,
    ModalComponent,
    FormErrorComponent,
    AddMemberModalComponent,
    ChangeMemberPasswordModalComponent,
    MemberDependantsPanelComponent,
  ],
  templateUrl: './all-members.component.html',
  styleUrl: './all-members.component.scss',
})
export class AllMembersComponent implements OnInit {
  protected readonly members = inject(MembersService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly resolveAvatar = resolveMemberAvatarUrl;
  protected readonly memberTypes = MEMBER_TYPES;
  protected readonly villaTypes = VILLA_TYPES;

  protected readonly addModal = viewChild.required(AddMemberModalComponent);
  protected readonly passwordModal = viewChild.required(ChangeMemberPasswordModalComponent);

  protected readonly columns: TableColumn[] = [
    { key: 'identity', label: 'المالك', align: 'right', width: '260px' },
    { key: 'villaNumber', label: 'رقم الفيلا', align: 'center' },
    { key: 'memberType', label: 'نوع الساكن', align: 'center' },
    { key: 'phoneNumber', label: 'الهاتف', align: 'center' },
    { key: 'email', label: 'البريد الإلكتروني', align: 'right' },
  ];

  protected readonly editTarget = signal<Member | null>(null);
  protected readonly isEditOpen = computed(() => this.editTarget() !== null);
  protected readonly isSaving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly editSelectedImage = signal<File | null>(null);
  protected readonly editImagePreviewUrl = signal<string | null>(null);
  protected readonly editDisplayImageUrl = computed(
    () =>
      this.editImagePreviewUrl() ??
      this.resolveAvatar(this.editTarget()?.pictureUrl ?? null),
  );

  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    villaAddress: ['', [Validators.required, Validators.minLength(5)]],
    villaNumber: ['', [Validators.required]],
    villaLocation: ['', [Validators.required, Validators.minLength(5)]],
    villaSpace: ['', [Validators.required]],
    villaStreet: [''],
    memberType: ['مالك' as MemberType, [Validators.required]],
    villaType: ['مشطبة' as VillaType, [Validators.required]],
  });

  ngOnInit(): void {
    void this.members.load();
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  protected onMemberCreated(): void {
    this.toast.success('تم إضافة المالك بنجاح');
  }

  protected openEdit(member: Member): void {
    this.serverError.set(null);
    this.clearEditImage();
    this.editForm.reset({
      name: member.userName,
      email: member.email,
      phoneNumber: member.phoneNumber,
      villaAddress: member.villaAddress,
      villaNumber: member.villaNumber,
      villaLocation: member.villaLocation,
      villaSpace: member.villaSpace,
      villaStreet: member.villaStreet,
      memberType: (member.memberType || 'مالك') as MemberType,
      villaType: (member.villaType || 'مشطبة') as VillaType,
    });
    this.editTarget.set(member);
  }

  protected closeEdit(): void {
    this.editTarget.set(null);
  }

  protected openChangePassword(member: Member): void {
    this.passwordModal().launch(member);
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
      await this.members.update({
        Id: target.id,
        Email: v.email,
        Name: v.name,
        PhoneNumber: v.phoneNumber,
        Image: this.editSelectedImage(),
        VillaAddress: v.villaAddress,
        VillaNumber: v.villaNumber,
        VillaLocation: v.villaLocation,
        VillaSpace: v.villaSpace,
        VillaStreet: v.villaStreet,
        MemberType: v.memberType,
        VillaType: v.villaType,
      });
      this.toast.success('تم تحديث بيانات المالك بنجاح');
      this.editTarget.set(null);
    } catch (err) {
      this.serverError.set(
        apiErrorToMessage(err as ApiError, 'تعذّر حفظ التعديلات'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Closes spec §10 issue 4 — no destructive action fires without confirmation first. */
  protected async confirmDelete(member: Member): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف المالك',
      message: `هل أنت متأكد أنك تريد حذف "${member.userName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      confirmText: 'حذف',
    });
    if (!confirmed) return;

    try {
      await this.members.delete(member.id);
      this.toast.success('تم حذف المالك بنجاح');
    } catch (err) {
      this.toast.error(apiErrorToMessage(err as ApiError, 'تعذّر حذف المالك'));
    }
  }

  isMapUrl(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }

    return /^https?:\/\//i.test(value);
  }
}
