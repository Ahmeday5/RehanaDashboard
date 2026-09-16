import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaintenanceDifferencesService } from '../../data/maintenance-differences.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { VillaMultiSelectComponent } from '../../../../shared/components/villa-multi-select/villa-multi-select.component';
import { DatePickerAnywhereDirective } from '../../../../shared/directives/date-picker-anywhere.directive';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

const CURRENCIES = ['EGP', 'USD'] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * "إضافة فرق صيانة" — bulk-creates one Disbursement bond per selected villa
 * via `POST /Dashboard/bulkDisbursement` (confirmed 2026-09-16). Launched as
 * a modal from the maintenance-differences list screen, per the app's
 * standing "add flows are modals, not routes" convention.
 */
@Component({
  selector: 'app-add-maintenance-difference-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    IconComponent,
    FormErrorComponent,
    VillaMultiSelectComponent,
    DatePickerAnywhereDirective,
  ],
  templateUrl: './add-maintenance-difference-modal.component.html',
  styleUrl: './add-maintenance-difference-modal.component.scss',
})
export class AddMaintenanceDifferenceModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MaintenanceDifferencesService);

  protected readonly currencies = CURRENCIES;

  readonly open = signal(false);
  /** Emits the backend's own confirmation message + total so the list screen can toast it verbatim. */
  readonly created = output<{ message: string; totalAmount: number }>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    villaNumbers: this.fb.nonNullable.control<string[]>([], [Validators.required, (c) => (c.value?.length ? null : { required: true })]),
    pricePerMeter: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
    date: [todayIso(), [Validators.required]],
    currency: ['EGP', [Validators.required]],
    bondDescription: ['', [Validators.required, Validators.minLength(3)]],
  });

  launch(): void {
    this.form.reset({ villaNumbers: [], pricePerMeter: '', date: todayIso(), currency: 'EGP', bondDescription: '' });
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
      const result = await this.service.createBulk({
        villaNumbers: v.villaNumbers,
        pricePerMeter: Number(v.pricePerMeter),
        date: v.date,
        currency: v.currency,
        bondDescription: v.bondDescription,
      });
      this.open.set(false);
      this.created.emit(result);
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة فرق الصيانة'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
