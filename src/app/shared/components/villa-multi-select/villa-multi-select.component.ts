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
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { VillaDirectoryService } from '../../../core/services/villa-directory.service';
import { VillaDirectoryEntry } from '../../data/villa-directory.model';
import { IconComponent } from '../icon/icon.component';

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Multi-villa picker for flows that apply to several villas at once (e.g.
 * bulk maintenance-difference disbursement) — same server-backed search as
 * `VillaSelectComponent`, but the trigger holds a row of removable chips
 * instead of a single value. The bound CVA value is `string[]` of villa
 * numbers.
 *
 *   <app-villa-multi-select formControlName="villaNumbers" />
 */
@Component({
  selector: 'app-villa-multi-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './villa-multi-select.component.html',
  styleUrl: './villa-multi-select.component.scss',
})
export class VillaMultiSelectComponent implements ControlValueAccessor {
  private readonly villaDirectory = inject(VillaDirectoryService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input<string>('اختر فيلا أو أكثر...');

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);
  protected readonly disabled = signal(false);

  protected readonly selected = signal<VillaDirectoryEntry[]>([]);

  private readonly searchTrigger = new Subject<string>();
  private readonly searchResults: () => VillaDirectoryEntry[] | null = toSignal(
    this.searchTrigger.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((term) => {
        this.isLoading.set(true);
        return this.villaDirectory.search(term || undefined);
      }),
    ),
    { initialValue: null },
  );

  protected readonly isLoading = signal(false);

  /** Already-selected villas are hidden from the results — picking is additive. */
  protected readonly options = computed(() => {
    const selectedNumbers = new Set(this.selected().map((e) => e.villaNumber));
    return (this.searchResults() ?? []).filter((o) => !selectedNumbers.has(o.villaNumber));
  });

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private onChange: (val: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    effect(() => {
      if (this.isOpen()) this.searchTrigger.next(this.query());
    });

    effect(
      () => {
        if (this.searchResults() !== null) this.isLoading.set(false);
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      if (!this.isOpen()) return;
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    });

    // Capture phase, not `@HostListener('document:click')` (bubble phase):
    // `ModalComponent`'s dialog calls `$event.stopPropagation()` on every
    // click inside it so its own backdrop-click-to-close doesn't fire, which
    // also silently swallows this listener when it relies on bubbling —
    // capturing runs before that stopPropagation ever gets a chance to act.
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
    this.query.set('');
    this.onTouched();
  }

  protected onQueryInput(value: string): void {
    this.query.set(value);
    this.activeIndex.set(-1);
  }

  protected addEntry(entry: VillaDirectoryEntry): void {
    this.selected.update((list) => [...list, entry]);
    this.query.set('');
    this.emit();
  }

  protected removeEntry(villaNumber: string, event?: Event): void {
    event?.stopPropagation();
    this.selected.update((list) => list.filter((e) => e.villaNumber !== villaNumber));
    this.emit();
  }

  private emit(): void {
    this.onChange(this.selected().map((e) => e.villaNumber));
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
      if (active) this.addEntry(active);
    } else if (event.key === 'Backspace' && !this.query() && this.selected().length > 0) {
      this.removeEntry(this.selected()[this.selected().length - 1].villaNumber);
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  // ─────────── ControlValueAccessor ───────────

  writeValue(value: string[] | null): void {
    if (!value?.length) {
      this.selected.set([]);
      return;
    }
    const options = this.options();
    this.selected.set(
      value.map((villaNumber) => options.find((o) => o.villaNumber === villaNumber) ?? { villaNumber, memberName: '' }),
    );
  }

  registerOnChange(fn: (val: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
