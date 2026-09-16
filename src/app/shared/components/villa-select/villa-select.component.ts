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
 * Searchable villa/member picker — a proper async combobox, not a plain
 * `<select>`: as the compound grows past a couple dozen villas a flat
 * dropdown becomes unusable, so this debounces the query straight to
 * `GET /Dashboard/list?villaNumber=` (server-side search, confirmed
 * 2026-09-16) rather than filtering a client-side array.
 *
 * Implements ControlValueAccessor so it plugs into reactive forms exactly
 * like a native input.
 *
 *   <app-villa-select formControlName="villaNumber" placeholder="اختر فيلا..." />
 *
 * Also doubles as the member-name picker (confirmed 2026-09-16: the same
 * `/Dashboard/list` directory has both fields, no separate endpoint exists):
 *
 *   <app-villa-select formControlName="memberName" emitField="memberName" searchField="memberName" placeholder="اختر مالك..." />
 */
@Component({
  selector: 'app-villa-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './villa-select.component.html',
  styleUrl: './villa-select.component.scss',
})
export class VillaSelectComponent implements ControlValueAccessor {
  private readonly villaDirectory = inject(VillaDirectoryService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input<string>('اختر فيلا...');
  /** Allow clearing the selection back to empty (shown as an "×" in the trigger). */
  readonly clearable = input<boolean>(true);
  /** Which field of the selected `VillaDirectoryEntry` becomes the CVA value. */
  readonly emitField = input<'villaNumber' | 'memberName'>('villaNumber');
  /**
   * Which field the typed query filters on. `'villaNumber'` forwards the
   * query straight to the backend's own `?villaNumber=` search param.
   * `'memberName'` has no server-side equivalent (confirmed 2026-09-16: the
   * `/Dashboard/list` endpoint only supports villa-number search) — the
   * unfiltered directory is fetched once and matched client-side instead.
   */
  readonly searchField = input<'villaNumber' | 'memberName'>('villaNumber');

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);
  protected readonly disabled = signal(false);

  /** The committed selection — may differ from `query()` while the user is actively typing/searching. */
  protected readonly selected = signal<VillaDirectoryEntry | null>(null);

  private readonly searchTrigger = new Subject<string>();
  private readonly searchResults: () => VillaDirectoryEntry[] | null = toSignal(
    this.searchTrigger.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((term) => {
        this.isLoading.set(true);
        // Server-side search only understands villaNumber — a memberName
        // search fetches the unfiltered directory and filters client-side below.
        const serverTerm = this.searchField() === 'villaNumber' ? term : undefined;
        return this.villaDirectory.search(serverTerm || undefined);
      }),
    ),
    { initialValue: null },
  );

  protected readonly isLoading = signal(false);

  protected readonly options = computed(() => {
    const results = this.searchResults() ?? [];
    if (this.searchField() !== 'memberName') return results;
    const term = this.query().trim().toLowerCase();
    if (!term) return results;
    return results.filter((o) => o.memberName.toLowerCase().includes(term));
  });

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /** ControlValueAccessor callbacks — assigned by Angular forms. */
  private onChange: (val: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // Load the initial (unfiltered) page as soon as the dropdown opens the first time.
    effect(() => {
      if (this.isOpen()) this.searchTrigger.next(this.query());
    });

    // Autofocus the search field the moment the panel opens.
    effect(() => {
      if (!this.isOpen()) return;
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    });

    // Once results land, loading is over regardless of which query triggered them.
    // Only ever writes `isLoading`, which this effect doesn't itself read —
    // no cycle, `allowSignalWrites` just satisfies Angular's static check.
    effect(
      () => {
        if (this.searchResults() !== null) this.isLoading.set(false);
      },
      { allowSignalWrites: true },
    );

    // Capture phase, not `@HostListener('document:click')` (bubble phase):
    // `ModalComponent`'s dialog calls `$event.stopPropagation()` on every
    // click inside it so its own backdrop-click-to-close doesn't fire, which
    // also silently swallows a bubble-phase listener here — capturing runs
    // before that stopPropagation ever gets a chance to act.
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
    if (this.searchField() === 'villaNumber') this.searchTrigger.next(value);
  }

  protected selectEntry(entry: VillaDirectoryEntry): void {
    this.selected.set(entry);
    this.query.set('');
    this.onChange(entry[this.emitField()]);
    this.close();
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.selected.set(null);
    this.query.set('');
    this.onChange(null);
  }

  protected displayValue(entry: VillaDirectoryEntry): string {
    return this.emitField() === 'memberName' ? entry.memberName : entry.villaNumber;
  }

  protected displaySubtext(entry: VillaDirectoryEntry): string {
    return this.emitField() === 'memberName' ? entry.villaNumber : entry.memberName;
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

  writeValue(value: string | null): void {
    if (!value) {
      this.selected.set(null);
      return;
    }
    // The bound value is just the emitted field; resolve a display entry for
    // it lazily (e.g. programmatic reset, or editing a pre-filled form).
    const field = this.emitField();
    const fromOptions = this.options().find((o) => o[field] === value);
    this.selected.set(
      fromOptions ?? (field === 'memberName' ? { villaNumber: '', memberName: value } : { villaNumber: value, memberName: '' }),
    );
  }

  registerOnChange(fn: (val: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
