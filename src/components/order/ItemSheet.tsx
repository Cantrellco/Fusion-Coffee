'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  formatCents,
  type CartModifier,
  type OrderItem,
  type OrderModifierOption,
} from '@/lib/order';
import { Close } from '@/components/icons';
import { specimenFor } from '@/components/SummerSpecimens';
import { useDragDismiss, useSheetChrome, useCloseAboveBreakpoint } from './sheet';

// ============================================================
// Item detail sheet — where a drink actually gets built (< lg only).
//
// It exists because the old row put up to FOUR native <select>s inline: a
// single drink row ran 245–348px tall on a 390px phone, the whole menu came
// to 10.4 screens of scrolling, and choosing oat milk cost a tap, a picker
// wheel, a flick and a "Done". Every serious ordering app (Starbucks, Philz,
// Dutch Bros, Sweetgreen, CAVA, Toast, Olo) puts customization on its own
// surface with the options EXPOSED as buttons, because a <select> hides its
// choices and reads as a form, not a menu.
//
// Desktop is untouched: at lg the original inline-dropdown row is still the
// one that renders, and this component is display:none.
// ============================================================

/** The live unit price for the build currently on screen. */
function buildPrice(item: OrderItem, selection: Record<string, string>): number {
  return (item.modifiers ?? []).reduce((sum, g) => {
    const value = selection[g.id] ?? g.options[0].value;
    return sum + (g.options.find((o) => o.value === value)?.priceCents ?? 0);
  }, item.priceCents);
}

function defaultsFor(item: OrderItem | null): Record<string, string> {
  return Object.fromEntries(
    (item?.modifiers ?? []).map((g) => [g.id, g.options[0].value]),
  );
}

/** One option button — an exposed choice, never a hidden <select> row. */
function OptionChip({
  option,
  selected,
  onSelect,
  wide,
}: {
  option: OrderModifierOption;
  selected: boolean;
  onSelect: () => void;
  wide: boolean;
}) {
  const label = option.display ?? option.value;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-4 text-[0.9375rem] transition-colors duration-200 ease-drawer active:scale-[0.97] motion-reduce:active:scale-100 ${
        wide ? 'w-full' : ''
      } ${
        // Selected reads INK, not brick. Three brick-filled chips plus a brick
        // CTA left nothing dominant on the sheet; keeping brick exclusively for
        // the action means the eye lands on "Add to order" every time.
        selected
          ? 'border-ink bg-ink text-cream'
          : 'border-ink/15 bg-cream text-ink'
      }`}
    >
      <span>{label}</span>
      {option.priceCents ? (
        <span
          className={`text-[0.8125rem] tabular-nums ${
            selected ? 'text-cream/70' : 'text-ink-muted'
          }`}
        >
          +{formatCents(option.priceCents)}
        </span>
      ) : null}
    </button>
  );
}

export default function ItemSheet({
  item,
  open,
  onClose,
  onAdd,
}: {
  item: OrderItem | null;
  open: boolean;
  onClose: () => void;
  onAdd: (item: OrderItem, modifiers: CartModifier[], qty: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    defaultsFor(item),
  );
  const [qty, setQty] = useState(1);

  // A fresh item means a fresh build — never inherit the last drink's oat milk.
  useEffect(() => {
    setSelection(defaultsFor(item));
    setQty(1);
  }, [item]);

  useSheetChrome({ open, onClose, panelRef, initialFocusRef: closeRef });
  useCloseAboveBreakpoint(open, 1024, onClose);
  const { style: dragStyle, handlers } = useDragDismiss({ onDismiss: onClose });

  const unit = item ? buildPrice(item, selection) : 0;
  const specimen = item ? specimenFor(item.name) : null;

  function submit() {
    if (!item) return;
    // "No milk" / "No flavor" / "No extra shot" are dropped here, so the cart
    // line and the barista's ticket carry only real choices.
    const modifiers: CartModifier[] = (item.modifiers ?? [])
      .map((g) => {
        const value = selection[g.id] ?? g.options[0].value;
        return { group: g, opt: g.options.find((o) => o.value === value) };
      })
      .filter((p): p is { group: typeof p.group; opt: OrderModifierOption } =>
        Boolean(p.opt) && !p.opt!.noop,
      )
      .map(({ group, opt }) => ({
        groupId: group.id,
        label: group.label,
        value: opt.value,
        priceCents: opt.priceCents ?? 0,
      }));
    onAdd(item, modifiers, qty);
  }

  return (
    <div className="lg:hidden" aria-hidden={!open ? true : undefined}>
      {/* Scrim. touch-none so a drag that starts here can't scroll the menu
          behind the sheet. */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[60] touch-none bg-black/55 backdrop-blur-[2px] transition-opacity duration-500 ease-drawer motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        data-sheet-panel
        // Declarative inert so the static export ships the closed sheet out of
        // the tab order and the a11y tree — otherwise every option chip is an
        // invisible tab stop inside a phantom modal. Same discipline as the
        // header menu sheet.
        // @ts-expect-error — `inert` is missing from React 18's DOM typings
        inert={open ? undefined : ''}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-labelledby={titleId}
        className={`sheet-max-h fixed inset-x-0 bottom-0 z-[61] flex flex-col overflow-hidden rounded-t-[1.75rem] border-t border-ink/10 bg-cream shadow-[0_-20px_60px_-12px_rgba(60,38,20,0.45)] transition-transform duration-500 ease-drawer motion-reduce:transition-none ${
          open ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        style={dragStyle}
      >
        {/* Grab zone — handle + title row. The gesture lives ONLY here so it
            never fights the option list's own scrolling. */}
        <div {...handlers} className="flex-none touch-none px-5 pb-3 pt-3">
          <div aria-hidden className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-ink/15" />
          <div className="flex items-start gap-3">
            {specimen && (
              <span aria-hidden className="mt-0.5 h-10 w-10 shrink-0">
                {specimen}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {/* No price here on purpose: the footer CTA carries the live
                  one, and a static base price beside it just contradicts
                  itself the moment oat milk is picked. */}
              <h2
                id={titleId}
                className="font-display text-[1.375rem] leading-tight text-ink"
              >
                {item?.name ?? ''}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable middle: description + every option group */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {item?.description && (
            <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
              {item.description}
            </p>
          )}

          <div className="flex flex-col gap-6 pt-5">
            {(item?.modifiers ?? []).map((group) => {
              // Two-option groups (Hot/Iced, extra shot) read as a segmented
              // control; longer lists wrap as chips.
              const segmented = group.options.length === 2;
              return (
                <fieldset key={group.id} className="border-0 p-0">
                  <legend className="eyebrow mb-2.5 p-0 text-brick-deep">
                    {group.label}
                  </legend>
                  <div
                    className={
                      segmented ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'
                    }
                  >
                    {group.options.map((opt) => (
                      <OptionChip
                        key={opt.value}
                        option={opt}
                        wide={segmented}
                        selected={
                          (selection[group.id] ?? group.options[0].value) === opt.value
                        }
                        onSelect={() =>
                          setSelection((s) => ({ ...s, [group.id]: opt.value }))
                        }
                      />
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>

          {/* Quantity */}
          <div className="mt-7 flex items-center justify-between border-t border-ink/10 pt-5">
            <span className="eyebrow text-brick-deep">Quantity</span>
            <div className="inline-flex items-center gap-1 rounded-full border border-ink/15">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="One fewer"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink transition-colors hover:bg-ink/10 disabled:opacity-35"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="min-w-7 text-center text-base tabular-nums text-ink"
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="One more"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink transition-colors hover:bg-ink/10"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Pinned CTA. It carries the live total — the single most-cited miss
            in ordering-app teardowns is a customize screen that hides what the
            build now costs. */}
        <div className="flex-none border-t border-ink/10 bg-cream px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={submit}
            className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-brick px-6 text-[0.9375rem] font-medium tracking-wide text-cream transition-transform duration-200 ease-drawer active:scale-[0.985] motion-reduce:active:scale-100"
          >
            <span>Add to order</span>
            {/* No price until an item is actually open — the exported HTML
                otherwise ships a literal "$0.00" in this button. */}
            {unit > 0 && (
              <>
                <span aria-hidden className="text-cream/50">
                  ·
                </span>
                <span className="tabular-nums">{formatCents(unit * qty)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
