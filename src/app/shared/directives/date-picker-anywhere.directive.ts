import { Directive, HostListener, ElementRef, inject } from '@angular/core';

/**
 * A native `<input type="date">` only opens its calendar picker when the
 * click lands exactly on the small calendar-icon affordance at the field's
 * edge — clicking anywhere else in the field just places a text caret,
 * which reads as broken (confirmed 2026-09-16: "any date input, let me
 * click anywhere in it to open the calendar, not one specific spot").
 * `showPicker()` (Chromium/Edge; no-op-safe fallback elsewhere) opens it
 * programmatically so the whole field is clickable.
 *
 *   <input type="date" formControlName="fromDate" appDatePickerAnywhere />
 */
@Directive({
  selector: 'input[type="date"][appDatePickerAnywhere]',
  standalone: true,
})
export class DatePickerAnywhereDirective {
  private readonly host = inject(ElementRef<HTMLInputElement>);

  @HostListener('click')
  protected onClick(): void {
    const input = this.host.nativeElement;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Some browsers throw if the picker is already open or the input
        // isn't connected/visible yet — clicking again still works natively.
      }
    }
  }
}
