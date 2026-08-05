'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

// ============================================================
// Shared bottom-sheet mechanics for /order.
//
// Two sheets live on this page — the cart (which is ALSO the desktop sticky
// aside, so it can never be portalled out of the grid) and the item detail
// sheet. They need identical chrome: a scroll lock that actually works on
// iOS, a focus trap, focus restore, background inert-ing, Escape, and the
// drag-to-dismiss gesture. That lives here once instead of twice.
//
// Everything below is a no-op above the sheet's breakpoint — at `lg` the cart
// is a plain sticky column and must behave exactly as it always has.
// ============================================================

// ---- Body scroll lock ----------------------------------------------------
//
// `overflow: hidden` on <body> does NOT lock scrolling on iOS Safari — the
// page keeps moving behind the sheet. `position: fixed` does lock it, but on
// its own it throws the reader back to the top of the document. Saving the
// offset, applying it as a negative `top`, and scrolling back on release is
// the whole fix.
//
// Ref-counted: the item sheet can hand off to the cart sheet (add a drink →
// the cart opens), and during that overlap the first sheet's cleanup must not
// unlock the page out from under the second.
let lockCount = 0;
let savedScrollY = 0;

function lockBody() {
  if (lockCount++ > 0) return;
  savedScrollY = window.scrollY;
  const b = document.body;
  b.style.position = 'fixed';
  b.style.top = `-${savedScrollY}px`;
  b.style.left = '0';
  b.style.right = '0';
  b.style.width = '100%';
  // The hook the bottom tab bar listens on to tuck itself away — a native
  // sheet owns the whole bottom edge. Same class Header.tsx's menu uses.
  b.classList.add('sheet-open');
}

function unlockBody() {
  if (lockCount === 0) return;
  if (--lockCount > 0) return;
  const b = document.body;
  b.style.position = '';
  b.style.top = '';
  b.style.left = '';
  b.style.right = '';
  b.style.width = '';
  b.classList.remove('sheet-open');
  window.scrollTo(0, savedScrollY);
}

// Everything OUTSIDE <main> that stays tappable behind a scrim otherwise.
// The header pill sits at z-50 and the tab bar at z-[55] — both ABOVE the
// sheet scrim — so without this the hamburger is still clickable through a
// "modal" sheet. `inert` kills pointer events and focus in one attribute.
//
// <main> itself is deliberately NOT inerted: these sheets render inside it,
// so inerting it would inert the sheet. The focus trap + aria-modal cover the
// menu list behind the sheet.
const BEHIND = 'header, footer, nav[aria-label="Quick navigation"]';

/**
 * Modal chrome for a bottom sheet: scroll lock, Escape, focus trap, focus
 * restore, background inert. All of it is skipped when `enabled` is false,
 * which is how the cart aside stays an ordinary sticky column at `lg`.
 */
export function useSheetChrome({
  open,
  enabled = true,
  onClose,
  panelRef,
  initialFocusRef,
}: {
  open: boolean;
  enabled?: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement>;
  initialFocusRef?: RefObject<HTMLElement>;
}) {
  const active = open && enabled;
  // Where focus was before the sheet took it, so it can go back to the exact
  // control that opened the sheet rather than the top of the document.
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    lockBody();

    const behind = Array.from(document.querySelectorAll<HTMLElement>(BEHIND));
    behind.forEach((el) => el.setAttribute('inert', ''));

    // Move focus in. rAF so the panel is laid out (and its first control
    // reachable) before we aim at it.
    const raf = requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea',
        );
      target?.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      behind.forEach((el) => el.removeAttribute('inert'));
      unlockBody();
      // Only reclaim focus if it's still parked inside the closing sheet — if
      // the customer already tapped something else, leave them alone.
      const activeEl = document.activeElement as HTMLElement | null;
      const stranded = !activeEl || activeEl === document.body || panelRef.current?.contains(activeEl);
      if (stranded) {
        const back = restoreTo.current;
        // The opener may be gone, or may never have taken focus (iOS does not
        // focus a button on tap). Either way, focus must not stay inside a
        // sheet that just slid off-screen.
        if (back && back.isConnected && back !== document.body) {
          back.focus({ preventScroll: true });
        } else {
          activeEl?.blur();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * Closes the sheet when the viewport crosses INTO the desktop layout — a
 * sheet whose markup goes `display:none` on rotate would otherwise leave the
 * page scroll-locked forever with no way to release it.
 */
export function useCloseAboveBreakpoint(
  open: boolean,
  minWidthPx: number,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const check = () => {
      if (mq.matches) onClose();
    };
    check();
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, [open, minWidthPx, onClose]);
}

// ---- Drag to dismiss -----------------------------------------------------

// vaul's shipped constants — the numbers a widely-copied iOS-sheet clone
// converged on. Distance OR velocity dismisses; either alone feels wrong.
const CLOSE_FRACTION = 0.25; // of the sheet's own height
const VELOCITY_THRESHOLD = 0.4; // px per ms

/**
 * The native bottom-sheet gesture. Attach `handlers` to a grab zone (the
 * handle + title row), never to the scrolling body, or the gesture fights the
 * list. Pointer events with capture, so a finger that slides off the grab
 * zone mid-drag keeps control.
 */
export function useDragDismiss({
  onDismiss,
  enabled = true,
}: {
  onDismiss: () => void;
  enabled?: boolean;
}) {
  const [dragY, setDragY] = useState(0);
  const st = useRef({ active: false, startY: 0, startT: 0, height: 0 });

  const reset = useCallback(() => {
    st.current.active = false;
    setDragY(0);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      // Mouse users get the close button and the scrim; a click-drag on a
      // sheet header is not a gesture anyone performs.
      if (e.pointerType === 'mouse') return;
      const zone = e.currentTarget;
      const panel = zone.closest<HTMLElement>('[data-sheet-panel]');
      // Capture keeps the gesture alive when the finger slides off the grab
      // zone. It throws if the pointer is already gone (fast tap, synthetic
      // event) — losing capture is survivable, losing the drag is not.
      try {
        zone.setPointerCapture(e.pointerId);
      } catch {
        /* no active pointer — drag still tracks via the move handler */
      }
      st.current = {
        active: true,
        startY: e.clientY,
        startT: e.timeStamp,
        height: panel?.offsetHeight || window.innerHeight,
      };
    },
    [enabled],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!st.current.active) return;
    const dy = e.clientY - st.current.startY;
    // Downward tracks the finger 1:1; upward gets heavy resistance so the
    // sheet feels anchored rather than detached.
    setDragY(dy > 0 ? dy : dy / 8);
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!st.current.active) return;
      const dy = Math.max(0, e.clientY - st.current.startY);
      const dt = Math.max(1, e.timeStamp - st.current.startT);
      const velocity = dy / dt;
      const far = dy > st.current.height * CLOSE_FRACTION;
      const fast = velocity > VELOCITY_THRESHOLD && dy > 24;
      st.current.active = false;
      setDragY(0);
      if (far || fast) onDismiss();
    },
    [onDismiss],
  );

  // The OS can cancel a touch mid-drag (notification shade, app switch,
  // incoming call). Spring back rather than dismissing.
  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset,
  };

  // While dragging, the inline transform must beat the open/closed class
  // transform AND kill the transition so the sheet tracks the finger exactly.
  const style = dragY !== 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined;

  return { dragY, style, handlers, reset };
}
