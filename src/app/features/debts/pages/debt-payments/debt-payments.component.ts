import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DebtPaymentsService } from '../../data/debt-payments.service';
import { CreateDebtPaymentResponse } from '../../data/debt.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { AddDebtPaymentModalComponent } from '../../components/add-debt-payment-modal/add-debt-payment-modal.component';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * "مدفوعات المديونيات" — every `DebtPayment`, i.e. every payment made
 * against an "other debt" (confirmed 2026-09-16). A separate screen from
 * the debts list even though both concern the same villa's balance —
 * mirrors the maintenance-differences/payments split.
 */
@Component({
  selector: 'app-debt-payments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    RefreshButtonComponent,
    PaginationComponent,
    VillaSelectComponent,
    IconComponent,
    AddDebtPaymentModalComponent,
  ],
  templateUrl: './debt-payments.component.html',
  styleUrl: './debt-payments.component.scss',
})
export class DebtPaymentsComponent implements OnInit {
  protected readonly service = inject(DebtPaymentsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly addModal = viewChild.required(AddDebtPaymentModalComponent);
  protected readonly isRefreshing = signal(false);

  protected readonly filterForm = this.fb.nonNullable.group({
    villaNumber: [''],
  });

  ngOnInit(): void {
    void this.service.load();
    this.filterForm.valueChanges.subscribe((value) => this.service.setFilters(value as { villaNumber: string }));
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  /** `createPayment()` already reloads page 1, so the table and the villa summary are fresh by the time this fires. */
  protected onPaymentCreated(result: CreateDebtPaymentResponse): void {
    const details = [
      `الدفعة: ${this.formatMoney(result.paymentAmount)}`,
      `المستحق: ${this.formatMoney(result.totalDebt)}`,
      `المسدد: ${this.formatMoney(result.totalPaid)}`,
      `المتبقي: ${this.formatMoney(result.totalOutstanding)}`,
    ].join(' • ');
    this.toast.success(details, { title: result.message || 'تم تسجيل الدفعة بنجاح', duration: 8000 });
  }

  protected resetFilters(): void {
    this.filterForm.reset({ villaNumber: '' }, { emitEvent: false });
    this.service.clearFilters();
  }

  protected hasActiveFilters(): boolean {
    return !!this.service.filters().villaNumber;
  }

  protected async refresh(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.service.load();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  /** Same currency format as the rest of the dashboard: `1٬234 ج.م`. */
  protected formatMoney(value: number | null | undefined): string {
    return `${(value ?? 0).toLocaleString('ar-EG')} ج.م`;
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  }
}
