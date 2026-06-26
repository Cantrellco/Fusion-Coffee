import Button from '@/components/Button';
import { site } from '@/lib/site';

export default function NotFound() {
  return (
    <section className="relative flex min-h-[78svh] items-center bg-cream pt-32 md:pt-40">
      <div className="mx-auto max-w-edge px-5 sm:px-8">
        <p className="eyebrow text-brick">404 — off the menu</p>
        <h1 className="mt-6 max-w-3xl text-balance font-display text-fluid-2xl leading-[0.98] text-ink">
          This page wandered off for a coffee.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-muted">
          We couldn&rsquo;t find what you were looking for — but the good stuff is
          all still here. Head back home or browse the menu.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button href="/" variant="primary">
            Back home
          </Button>
          <Button href="/menu/" variant="outline">
            See the menu
          </Button>
        </div>
        <p className="mt-14 font-sans text-sm text-ink/45">
          {site.name} · {site.address.full}
        </p>
      </div>
    </section>
  );
}
