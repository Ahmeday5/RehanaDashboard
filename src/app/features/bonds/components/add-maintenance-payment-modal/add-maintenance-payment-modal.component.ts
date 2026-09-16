import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaintenancePaymentsService } from '../../data/maintenance-payments.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { DatePickerAnywhereDirective } from '../../../../shared/directives/date-picker-anywhere.directive';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const CURRENCIES = ['EGP', 'USD'] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * "إضافة دفعة" — records a maintenance-difference payment from a single
 * villa via `POST /Dashboard/memberReceipt` (confirmed 2026-09-16). Launched
 * as a modal from the maintenance-payments list screen.
 */
@Component({
  selector: 'app-add-maintenance-payment-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    IconComponent,
    FormErrorComponent,
    VillaSelectComponent,
    DatePickerAnywhereDirective,
  ],
  templateUrl: './add-maintenance-payment-modal.component.html',
  styleUrl: './add-maintenance-payment-modal.component.scss',
})
export class AddMaintenancePaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MaintenancePaymentsService);

  protected readonly currencies = CURRENCIES;

  readonly open = signal(false);
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    villaNumber: ['', [Validators.required]],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
    date: [todayIso(), [Validators.required]],
    currency: ['EGP', [Validators.required]],
    bondDescription: ['', [Validators.required, Validators.minLength(3)]],
  });

  launch(): void {
    this.form.reset({ villaNumber: '', amount: '', date: todayIso(), currency: 'EGP', bondDescription: '' });
    this.serverError.set(null);
    this.open.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.open.set(false);
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
      await this.service.createPayment({
        villaNumber: v.villaNumber,
        amount: Number(v.amount),
        date: v.date,
        currency: v.currency,
        bondDescription: v.bondDescription,
      });
      this.open.set(false);
      this.created.emit();
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة الدفعة'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
