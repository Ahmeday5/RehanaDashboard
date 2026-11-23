import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MaintenanceDifferencesService } from '../../data/maintenance-differences.service';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { DatePickerAnywhereDirective } from '../../../../shared/directives/date-picker-anywhere.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { AddMaintenanceDifferenceModalComponent } from '../../components/add-maintenance-difference-modal/add-maintenance-difference-modal.component';
import { ToastService } from '../../../../core/services/toast.service';

/** Debounce for the two free-text date filters — the villa/member pickers already commit instantly on selection. */
const FILTER_DEBOUNCE_MS = 350;

/**
 * "فروقات الصيانة" — every `Disbursement` bond, with a single-row filter
 * bar (villa / member / date range, confirmed 2026-09-16) above the table.
 * Each row shows its total / paid-so-far / remaining balance; the service
 * refetches automatically whenever a payment is recorded elsewhere.
 */
@Component({
  selector: 'app-maintenance-differences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    DataTableComponent,
    ButtonComponent,
    RefreshButtonComponent,
    PaginationComponent,
    VillaSelectComponent,
    DatePickerAnywhereDirective,
    IconComponent,
    AddMaintenanceDifferenceModalComponent,
  ],
  templateUrl: './maintenance-differences.component.html',
  styleUrl: './maintenance-differences.component.scss',
})
export class MaintenanceDifferencesComponent implements OnInit {
  protected readonly service = inject(MaintenanceDifferencesService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly addModal = viewChild.required(AddMaintenanceDifferenceModalComponent);
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

  protected onDifferenceCreated(result: { message: string; totalAmount: number }): void {
    this.toast.success(result.message, {
      title: `الإجمالي: ${result.totalAmount.toLocaleString('ar-EG')} ج.م`,
    });
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

  protected formatMoney(value: number, currency: string): string {
    return `${value.toLocaleString('ar-EG')} ${currency}`;
  }
}
