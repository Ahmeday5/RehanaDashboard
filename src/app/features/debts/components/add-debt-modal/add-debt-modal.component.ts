import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DebtsService } from '../../data/debts.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

/**
 * "إضافة مديونية" — records a manual debt against a villa via
 * `POST /Dashboard/createDebt` (confirmed 2026-09-16). Launched as a modal
 * from the debts list screen, per the app's standing "add flows are
 * modals, not routes" convention.
 */
@Component({
  selector: 'app-add-debt-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, FormErrorComponent, VillaSelectComponent],
  templateUrl: './add-debt-modal.component.html',
  styleUrl: './add-debt-modal.component.scss',
})
export class AddDebtModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DebtsService);

  readonly open = signal(false);
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    villaNumber: ['', [Validators.required]],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
    notes: ['', [Validators.required, Validators.minLength(3)]],
  });

  launch(): void {
    this.form.reset({ villaNumber: '', amount: '', notes: '' });
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
      await this.service.create({
        villaNumber: v.villaNumber,
        amount: Number(v.amount),
        notes: v.notes,
      });
      this.open.set(false);
      this.created.emit();
    } catch (err) {
      this.serverError.set(apiErrorToMessage(err as ApiError, 'تعذّر إضافة المديونية'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
