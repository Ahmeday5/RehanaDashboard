import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Optional,
  Self,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { SecurityGuardDirectoryService } from '../../../core/services/security-guard-directory.service';
import { SecurityGuard } from '../../../features/security-guards/data/security-guard.model';
import { IconComponent } from '../icon/icon.component';

/**
 * Searchable security-guard picker for the Invitations screen's
 * `securityId` filter (confirmed 2026-09-16). The full guard roster is
 * fetched once (drained across every page — see
 * `SecurityGuardDirectoryService`, never capped to a single page) and
 * filtered by name client-side, since the guard roster is small and there
 * is no server-side name-search param for it (unlike villas' `?villaNumber=`).
 * The bound CVA value is the guard's numeric `id`.
 *
 *   <app-guard-select formControlName="securityId" placeholder="اختر حارس أمن..." />
 */
@Component({
  selector: 'app-guard-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './guard-select.component.html',
  styleUrl: './guard-select.component.scss',
})
export class GuardSelectComponent implements ControlValueAccessor {
  private readonly directory = inject(SecurityGuardDirectoryService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input<string>('اختر حارس أمن...');
  readonly clearable = input<boolean>(true);

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);
  protected readonly disabled = signal(false);
  protected readonly selected = signal<SecurityGuard | null>(null);

  private readonly guards: () => SecurityGuard[] | null = toSignal(this.directory.getAll(), { initialValue: null });
  protected readonly isLoading = computed(() => this.guards() === null);

  protected readonly options = computed(() => {
    const list = this.guards() ?? [];
    const term = this.query().trim().toLowerCase();
    if (!term) return list;
    return list.filter((g) => g.userName.toLowerCase().includes(term));
  });

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private onChange: (val: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    effect(() => {
      if (!this.isOpen()) return;
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    });

    // Capture phase — see VillaSelectComponent for why: ModalComponent's
    // dialog stops click propagation, which would silently swallow a
    // bubble-phase document listener here.
    const onDocumentClickCapture = (event: MouseEvent) => {
      if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
        this.close();
      }
    };
    document.addEventListener('click', onDocumentClickCapture, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocumentClickCapture, true));
  }

  protected isInvalid(): boolean {
    const c = this.ngControl?.control;
    if (!c) return false;
    return !!(c.invalid && (c.touched || c.dirty));
  }

  protected open(): void {
    if (this.disabled()) return;
    this.isOpen.set(true);
    this.activeIndex.set(-1);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  protected onQueryInput(value: string): void {
    this.query.set(value);
    this.activeIndex.set(-1);
    if (!this.isOpen()) this.isOpen.set(true);
  }

  protected selectEntry(guard: SecurityGuard): void {
    this.selected.set(guard);
    this.query.set('');
    this.onChange(guard.id);
    this.close();
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.selected.set(null);
    this.query.set('');
    this.onChange(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const opts = this.options();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isOpen()) return this.open();
      this.activeIndex.set(Math.min(this.activeIndex() + 1, opts.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = opts[this.activeIndex()];
      if (active) this.selectEntry(active);
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  // ─────────── ControlValueAccessor ───────────

  writeValue(value: number | null): void {
    if (value == null) {
      this.selected.set(null);
      return;
    }
    const fromOptions = this.options().find((g) => g.id === value);
    this.selected.set(fromOptions ?? null);
  }

  registerOnChange(fn: (val: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
