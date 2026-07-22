'use client';

import { useEffect, useState } from 'react';
import { site, type BookingSlot } from '@/lib/site';
import { ArrowUpRight } from './icons';

/**
 * Private party booking request form. Mirrors Newsletter's graceful pattern:
 * if site.bookingAction is set (paste a Square / Formspree endpoint), the form
 * POSTs the request straight in. Until then it falls back to a pre-filled,
 * neatly formatted email to the shop — so the control always works on the
 * static export, with no server.
 */
export default function BookingForm({ slots }: { slots: BookingSlot[] }) {
  const [sent, setSent] = useState(false);
  const hasAction = site.bookingAction.trim().length > 0;

  const slotOptions = slots.map((s) => `${s.day} · ${s.start} – ${s.end}`);

  // Earliest pickable date for the native date field. Computed in an effect —
  // not at render — because the static export bakes this component's HTML at
  // build time: a render-time `new Date()` would be stale on the live site and
  // differ from the client's first paint, triggering a hydration mismatch.
  // Until the effect runs the field simply has no min, same as today.
  const [today, setToday] = useState('');
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (hasAction) return; // let the native POST proceed
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => ((data.get(k) as string | null) ?? '').trim();
    const lines = [
      `Name: ${get('name')}`,
      `Email: ${get('email')}`,
      get('phone') && `Phone: ${get('phone')}`,
      get('date') && `Preferred date: ${get('date')}`,
      `Time window: ${get('slot')}`,
      get('guests') && `Approx. guests: ${get('guests')}`,
      get('details') && '',
      get('details') && `Details:\n${get('details')}`,
    ].filter(Boolean);
    const subject = encodeURIComponent('Party booking request');
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div className="border border-ink/12 bg-cream p-8 text-center sm:p-12">
        <p className="eyebrow text-brick-deep">Almost there</p>
        <h3 className="mt-3 font-display text-fluid-lg leading-tight text-ink">
          Check your mail app to send.
        </h3>
        <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-ink-muted">
          We’ve drafted your request with the details you entered — hit send and
          we’ll get right back to you to confirm the date.
        </p>
      </div>
    );
  }

  const fieldCls =
    'w-full border border-ink/20 bg-cream px-4 py-3 text-ink placeholder:text-ink/40 transition-colors focus:border-brick focus-visible:outline-none';
  const labelCls = 'mb-2 block text-xs uppercase tracking-mega text-ink/50';

  return (
    <form
      onSubmit={handleSubmit}
      {...(hasAction ? { action: site.bookingAction, method: 'post' } : {})}
      className="grid gap-6 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="booking-name" className={labelCls}>
          Name
        </label>
        {/* enterKeyHint/inputMode/autoCapitalize across the form are inert on
            desktop — they only shape the mobile keyboard and its return key. */}
        <input
          id="booking-name"
          name="name"
          required
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          placeholder="Your name"
          className={fieldCls}
        />
      </div>

      <div>
        <label htmlFor="booking-email" className={labelCls}>
          Email
        </label>
        <input
          id="booking-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="next"
          placeholder="you@email.com"
          className={fieldCls}
        />
      </div>

      <div>
        <label htmlFor="booking-phone" className={labelCls}>
          Phone <span className="normal-case tracking-normal text-ink/35">— optional</span>
        </label>
        <input
          id="booking-phone"
          type="tel"
          name="phone"
          autoComplete="tel"
          inputMode="tel"
          enterKeyHint="next"
          placeholder="(618) 000-0000"
          className={fieldCls}
        />
      </div>

      <div>
        <label htmlFor="booking-date" className={labelCls}>
          Preferred date <span className="normal-case tracking-normal text-ink/35">— optional</span>
        </label>
        <input
          id="booking-date"
          type="date"
          name="date"
          // No past dates in the native picker; `today` is set client-side
          // (see above) so the pre-rendered HTML matches the first paint.
          min={today || undefined}
          className={fieldCls}
        />
      </div>

      <div>
        <label htmlFor="booking-slot" className={labelCls}>
          Time window
        </label>
        <select id="booking-slot" name="slot" required defaultValue="" className={fieldCls}>
          <option value="" disabled>
            Choose a window
          </option>
          {slotOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="Flexible / not sure yet">Flexible / not sure yet</option>
        </select>
      </div>

      <div>
        <label htmlFor="booking-guests" className={labelCls}>
          Approx. guests <span className="normal-case tracking-normal text-ink/35">— optional</span>
        </label>
        <input
          id="booking-guests"
          type="number"
          name="guests"
          min={1}
          inputMode="numeric"
          enterKeyHint="next"
          placeholder="e.g. 12"
          className={fieldCls}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="booking-details" className={labelCls}>
          Tell us about your event <span className="normal-case tracking-normal text-ink/35">— optional</span>
        </label>
        <textarea
          id="booking-details"
          name="details"
          rows={4}
          placeholder="The occasion, any food or drink you have in mind, anything we should know…"
          className={`${fieldCls} resize-y`}
        />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          // w-full makes the submit an edge-to-edge thumb target on phones;
          // sm:w-auto restores the original shrink-to-content button.
          className="group inline-flex w-full items-center justify-center gap-2 bg-brick px-7 py-3.5 text-sm font-medium tracking-wide text-cream transition-colors duration-300 hover:bg-[#9b4128] sm:w-auto"
        >
          Send booking request
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
        <p className="mt-3 text-xs text-ink/45">
          A request, not a confirmation — we’ll email you back to lock in the date.
        </p>
      </div>
    </form>
  );
}
