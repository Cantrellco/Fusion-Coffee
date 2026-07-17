'use client';

import { useState } from 'react';
import { site } from '@/lib/site';
import { Sprig } from './Botanical';
import { ArrowUpRight } from './icons';

/**
 * Inline email capture — the shop's one owned channel. No popup, no modal.
 * If site.newsletterAction is set (paste the Square Marketing / Mailchimp form
 * action), the form POSTs subscribers straight in. Until then it gracefully
 * falls back to a pre-filled email to the shop, so the control always works.
 */
export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const hasAction = site.newsletterAction.trim().length > 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (hasAction) return; // let the native POST proceed
    e.preventDefault();
    const subject = encodeURIComponent('Join the Fusion Coffee list');
    const body = encodeURIComponent(`Please add me to the list: ${email}`);
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="mx-auto mt-12 max-w-xl border-t border-ink/12 pt-12 text-center">
      <Sprig className="mx-auto h-6 w-6 text-sage" aria-hidden />
      <p className="eyebrow mt-4 text-brick-deep">Stay in the loop</p>
      <h3 className="mt-3 font-display text-fluid-lg leading-tight text-ink">
        Seasonal drops, in your inbox.
      </h3>
      <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-ink-muted">
        The Summer Menu is here while the sun is — be first to know when the next
        one lands.
      </p>

      {sent ? (
        <p className="mt-6 font-display text-lg italic text-brick-deep">
          Thanks — check your mail app to send and you’re on the list.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          {...(hasAction ? { action: site.newsletterAction, method: 'post' } : {})}
          className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 border border-ink/20 bg-cream px-4 py-3 text-ink placeholder:text-ink/40 transition-colors focus:border-brick focus-visible:outline-none"
          />
          <button
            type="submit"
            className="group inline-flex items-center justify-center gap-2 bg-brick px-6 py-3 text-sm font-medium tracking-wide text-cream transition-colors duration-300 hover:bg-[#9b4128]"
          >
            Subscribe
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </form>
      )}
      <p className="mt-3 text-xs text-ink/45">No spam — just the new menu, now and then.</p>
    </div>
  );
}
