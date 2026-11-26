import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DebtPaymentsService } from '../../data/debt-payments.service';
import { DebtsApiService } from '../../data/debts-api.service';
import { CreateDebtPaymentResponse } from '../../data/debt.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

/** Mirrors the backend's 400 rule — the message string is shown as-is by `<app-form-error>`. */
function positiveAmount(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? null : { positive: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' };
}

/** 400 body when the amount exceeds what the villa still owes. */
interface OverpaymentErrorBody {
  message?: string;
  totalDebt?: number;
  totalPaid?: number;
  totalOutstanding?: number;
}

type BalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; amount: number }
  | { status: 'error' };

/**
 * "دفع مديونية" — records a payment against a villa's outstanding debt via
 * `POST /Dashboard/debtPayment` (confirmed 2026-09-16). Shows the villa's
 * current outstanding balance live as soon as it's selected, via
 * `DebtsApiService.getOutstandingBalance()` (latest payment's
 * `remainingAmount`, or total debts when there are no payments yet).
 * Since 2026-11-24 the backend rejects amounts <= 0 or above the
 * outstanding balance (400), so the form enforces both rules up front.
 */
@Component({
  selector: 'app-add-debt-payment-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    ModalComponent,
    ButtonComponent,
    IconComponent,
    FormErrorComponent,
    VillaSelectComponent,
  ],
  templateUrl: './add-debt-payment-modal.component.html',
  styleUrl: './add-debt-payment-modal.component.scss',
})
export class AddDebtPaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DebtPaymentsService);
  private readonly debtsApi = inject(DebtsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly created = output<CreateDebtPaymentResponse>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly balance = signal<BalanceState>({ status: 'idle' });
  /** `0` while not loaded — the template only reads this once `balance().status === 'loaded'`. */
  protected readonly balanceAmount = computed(() => {
    const b = this.balance();
    return b.status === 'loaded' ? b.amount : 0;
  });

  protected readonly form = this.fb.nonNullable.group({
    villaNumber: ['', [Validators.required]],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/), positiveAmount]],
    /** Optional — the API accepts `notes: null`. */
    notes: [''],
  });

  private readonly amountValue = toSignal(this.form.controls.amount.valueChanges, { initialValue: '' });

  /**
   * Blocking: the backend rejects an amount above the villa's outstanding
   * balance (400). Only enforced once the balance has loaded — if it failed
   * to load, the backend's own 400 is the fallback.
   */
  protected readonly exceedsBalance = computed(() => {
    const b = this.balance();
    const amount = Number(this.amountValue());
    if (b.status !== 'loaded' || !this.amountValue() || !Number.isFinite(amount)) return false;
    return amount > Math.max(b.amount, 0);
  });

  constructor() {
    this.form.controls.villaNumber.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((villaNumber) => this.loadBalance(villaNumber));
    this.destroyRef.onDestroy(() => this.balanceSub?.unsubscribe());
  }

  launch(): void {
    this.form.reset({ villaNumber: '', amount: '', notes: '' });
    this.serverError.set(null);
    this.balance.set({ status: 'idle' });
    this.open.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.open.set(false);
  }

  private balanceSub?: Subscription;

  private loadBalance(villaNumber: string): void {
    if (!villaNumber) {
      this.balanceSub?.unsubscribe();
      this.balance.set({ status: 'idle' });
      return;
    }
    this.balance.set({ status: 'loading' });
    this.balanceSub?.unsubscribe();
    this.balanceSub = this.debtsApi.getOutstandingBalance(villaNumber).subscribe({
      next: (amount) => this.balance.set({ status: 'loaded', amount }),
      error: () => this.balance.set({ status: 'error' }),
    });
  }

  protected async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;
    if (this.form.invalid || this.exceedsBalance()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.serverError.set(null);
    this.isSubmitting.set(true);

    try {
      const result = await this.service.createPayment({
        villaNumber: v.villaNumber,
        amount: Number(v.amount),
        notes: v.notes.trim() || null,
      });
      this.open.set(false);
      this.created.emit(result);
    } catch (err) {
      const apiErr = err as ApiError;
      const body = (apiErr?.raw ?? null) as OverpaymentErrorBody | null;
      let message = apiErrorToMessage(apiErr, 'تعذّر تسجيل الدفعة');
      if (apiErr?.status === 400 && typeof body?.totalOutstanding === 'number') {
        // The backend's figure is authoritative — sync the balance card to it.
        this.balance.set({ status: 'loaded', amount: body.totalOutstanding });
        message += ` — المتبقي على الفيلا: ${body.totalOutstanding.toLocaleString('ar-EG')} ج.م`;
      }
      this.serverError.set(message);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
