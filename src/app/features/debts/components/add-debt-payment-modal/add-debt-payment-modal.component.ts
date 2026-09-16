import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

type BalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; amount: number }
  | { status: 'error' };

/**
 * "دفع مديونية" — records a payment against a villa's outstanding debt via
 * `POST /Dashboard/debtPayment` (confirmed 2026-09-16). Shows the villa's
 * current outstanding balance live as soon as it's selected — no endpoint
 * returns that number directly, so it's computed client-side as
 * `sum(debts) - sum(payments)` via `DebtsApiService.getOutstandingBalance()`
 * (confirmed 2026-09-16). Paying more than the balance is allowed and
 * intentionally produces a negative outstanding (credit) — never clamp or
 * block the amount against the balance.
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
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
    notes: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor() {
    this.form.controls.villaNumber.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((villaNumber) => this.loadBalance(villaNumber));
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

  private loadBalance(villaNumber: string): void {
    if (!villaNumber) {
      this.balance.set({ status: 'idle' });
      return;
    }
    this.balance.set({ status: 'loading' });
    this.debtsApi.getOutstandingBalance(villaNumber).subscribe({
      next: (amount) => this.balance.set({ status: 'loaded', amount }),
      error: () => this.balance.set({ status: 'error' }),
    });
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
      const result = await this.service.createPayment({
        villaNumber: v.villaNumber,
        amount: Number(v.amount),
        notes: v.notes,
      });
      this.open.set(false);
      this.created.emit(result);
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر تسجيل الدفعة'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
