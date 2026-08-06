'use client';

import type { KeyboardEvent } from 'react';

// ============================================================
// Enter / Done on a checkout text field.
//
// The checkout fields on /order and /merch are deliberately NOT wrapped in a
// <form>: submitting is a multi-step affair (reveal payment → tokenize → POST)
// that the form element can't express, and a stray implicit submit in the
// middle of it is the last thing a money path needs.
//
// The cost of that is easy to miss on a desktop and infuriating on a phone. A
// bare input gets NO implicit submission, so iOS's Done/Return key does
// literally nothing — the keyboard stays up covering the sheet, hiding the very
// button the customer is being asked to press. (The site's other forms,
// Newsletter and BookingForm, ARE real <form onSubmit> elements, which is why
// their Enter key has always behaved.)
//
// This gives the key back its meaning without a form: advance to the next field
// in the group, or dismiss the keyboard on the last one.
// ============================================================

/**
 * Handle Enter on a text field inside a `[data-fields]` container: focus the
 * next visible field, or blur — dismissing the keyboard — when it's the last.
 *
 * Order comes from the DOM, so a field group can be rearranged or conditionally
 * rendered (merch swaps its address block for pickup) without this needing to
 * know.
 */
export function onFieldEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  // Without this, a bare Enter can still trigger an ancestor's default action.
  e.preventDefault();

  const field = e.currentTarget;
  const group = field.closest<HTMLElement>('[data-fields]');
  const fields = group
    ? Array.from(group.querySelectorAll<HTMLInputElement>('input')).filter(
        // offsetParent is null for anything not rendered — the merch address
        // block disappears entirely when the order is being collected.
        (el) => !el.disabled && !el.readOnly && el.offsetParent !== null,
      )
    : [];

  const next = fields[fields.indexOf(field) + 1];
  if (next) next.focus();
  else field.blur();
}
