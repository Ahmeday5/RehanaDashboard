import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { SecurityGuardInvitationsService } from '../../data/security-guard-invitations.service';
import { InvitationStatus, SecurityGuardInvitation } from '../../data/security-guard-invitation.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GuardSelectComponent } from '../../../../shared/components/guard-select/guard-select.component';
import { DatePickerAnywhereDirective } from '../../../../shared/directives/date-picker-anywhere.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/** Debounce for the two free-text date filters — the guard picker and status toggle already commit instantly. */
const FILTER_DEBOUNCE_MS = 350;

interface StatusOption {
  value: InvitationStatus | null;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: null, label: 'الكل' },
  { value: 'Active', label: 'نشطة' },
  { value: 'Expired', label: 'منتهية' },
];

/**
 * "دعوات حراس الأمن" — every visitor invitation created by a security
 * guard (confirmed 2026-09-16). Filters: guard (picker, drains every page
 * of the guard directory), status (Active/Expired — sent to the backend in
 * English, shown in Arabic), and a date range.
 */
@Component({
  selector: 'app-invitations-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    RefreshButtonComponent,
    PaginationComponent,
    GuardSelectComponent,
    DatePickerAnywhereDirective,
    IconComponent,
  ],
  templateUrl: './invitations-list.component.html',
  styleUrl: './invitations-list.component.scss',
})
export class InvitationsListComponent implements OnInit {
  protected readonly service = inject(SecurityGuardInvitationsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly isRefreshing = signal(false);

  protected readonly columns: TableColumn[] = [
    { key: 'securityGuardName', label: 'الحارس', align: 'right' },
    { key: 'villaNumber', label: 'الفيلا', align: 'center' },
    { key: 'memberName', label: 'المالك', align: 'right' },
    { key: 'visitorName', label: 'الزائر', align: 'right' },
    { key: 'carPlateNumber', label: 'رقم السيارة', align: 'center' },
    { key: 'visitTime', label: 'موعد الزيارة', align: 'center' },
    { key: 'status', label: 'الحالة', align: 'center' },
  ];

  protected readonly filterForm = this.fb.nonNullable.group({
    securityId: this.fb.control<number | null>(null),
    fromDate: [''],
    toDate: [''],
  });

  protected readonly activeStatus = signal<InvitationStatus | null>(null);

  ngOnInit(): void {
    void this.service.load();

    // The guard picker commits instantly on selection/clear; the two date
    // inputs debounce briefly so typing a date doesn't refetch on every
    // keystroke (confirmed 2026-09-16: every filter applies live).
    this.filterForm.valueChanges
      .pipe(debounceTime(FILTER_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
  }

  protected setStatus(status: InvitationStatus | null): void {
    this.activeStatus.set(status);
    this.applyFilters();
  }

  private applyFilters(): void {
    const v = this.filterForm.getRawValue();
    this.service.setFilters({
      securityId: v.securityId,
      status: this.activeStatus(),
      fromDate: v.fromDate,
      toDate: v.toDate,
    });
  }

  protected resetFilters(): void {
    this.filterForm.reset({ securityId: null, fromDate: '', toDate: '' }, { emitEvent: false });
    this.activeStatus.set(null);
    this.service.clearFilters();
  }

  protected hasActiveFilters(): boolean {
    const f = this.service.filters();
    return !!(f.securityId || f.status || f.fromDate || f.toDate);
  }

  protected async refresh(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.service.load();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  protected statusLabel(status: InvitationStatus): string {
    return status === 'Active' ? 'نشطة' : 'منتهية';
  }

  protected formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }
}
