import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MaintenancePaymentsService } from '../../data/maintenance-payments.service';
import { BondRow } from '../../data/bond.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { DatePickerAnywhereDirective } from '../../../../shared/directives/date-picker-anywhere.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { AddMaintenancePaymentModalComponent } from '../../components/add-maintenance-payment-modal/add-maintenance-payment-modal.component';
import { ToastService } from '../../../../core/services/toast.service';

/** Debounce for the two free-text date filters — the villa/member pickers already commit instantly on selection. */
const FILTER_DEBOUNCE_MS = 350;

/**
 * "مدفوعات فروق الصيانة" — every `Receipt` bond, i.e. every payment a
 * member made against their maintenance difference (confirmed 2026-09-16).
 * A separate screen from Maintenance Differences even though both read the
 * same `GET /Dashboard/bonds` endpoint — see `MaintenancePaymentsService`.
 */
@Component({
  selector: 'app-maintenance-payments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    RefreshButtonComponent,
    PaginationComponent,
    VillaSelectComponent,
    DatePickerAnywhereDirective,
    IconComponent,
    AddMaintenancePaymentModalComponent,
  ],
  templateUrl: './maintenance-payments.component.html',
  styleUrl: './maintenance-payments.component.scss',
})
export class MaintenancePaymentsComponent implements OnInit {
  protected readonly service = inject(MaintenancePaymentsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly addModal = viewChild.required(AddMaintenancePaymentModalComponent);
  protected readonly isRefreshing = signal(false);

  protected readonly filterForm = this.fb.nonNullable.group({
    villaNumber: [''],
    memberName: [''],
    fromDate: [''],
    toDate: [''],
  });

  ngOnInit(): void {
    void this.service.load();

    // Every filter is live — no submit button: the villa/member pickers
    // commit their own value the instant something is selected/cleared, and
    // the two date inputs debounce briefly so typing a date doesn't refetch
    // on every keystroke (confirmed 2026-09-16: filters apply as you type).
    this.filterForm.valueChanges
      .pipe(debounceTime(FILTER_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.service.setFilters(value as ReturnType<typeof this.filterForm.getRawValue>));
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  protected onPaymentCreated(): void {
    this.toast.success('تم تسجيل الدفعة بنجاح');
  }

  protected resetFilters(): void {
    this.filterForm.reset({ villaNumber: '', memberName: '', fromDate: '', toDate: '' }, { emitEvent: false });
    this.service.clearFilters();
  }

  protected hasActiveFilters(): boolean {
    const f = this.service.filters();
    return !!(f.villaNumber || f.memberName || f.fromDate || f.toDate);
  }

  protected async refresh(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.service.load();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  protected formatAmount(bond: BondRow): string {
    return `${bond.amount.toLocaleString('ar-EG')} ${bond.currency}`;
  }
}
