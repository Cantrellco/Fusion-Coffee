import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from './icons';

type Variant = 'primary' | 'ink' | 'outline' | 'cream' | 'ghost-light';

// Warm, never-gray lift shared with .summer-card — only on the filled CTAs.
const LIFT = 'hover:shadow-[0_12px_30px_-20px_rgba(120,80,40,0.55)]';

// Touch never fires :hover — each variant mirrors its hover color on :active
// so taps get the same visible press the pointer gets. Purely additive: on
// desktop :active only shows during the click itself, matching the hover
// state already underneath it.
const variants: Record<Variant, string> = {
  primary: `bg-brick text-cream hover:bg-[#9b4128] active:bg-[#9b4128] border border-transparent ${LIFT}`,
  ink: `bg-ink text-cream hover:bg-[#000] active:bg-[#000] border border-transparent ${LIFT}`,
  outline:
    'bg-transparent text-ink border border-ink/25 hover:bg-ink hover:text-cream active:bg-ink active:text-cream',
  cream: `bg-cream text-ink hover:bg-white active:bg-white border border-transparent ${LIFT}`,
  'ghost-light':
    'bg-transparent text-cream border border-cream/35 hover:bg-cream hover:text-ink active:bg-cream active:text-ink',
};

export default function Button({
  href,
  children,
  variant = 'primary',
  external = false,
  arrow = true,
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  arrow?: boolean;
  className?: string;
}) {
  const cls = `group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-medium tracking-wide cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out-expo focus-visible:outline-2 active:scale-[0.985] motion-reduce:active:scale-100 ${variants[variant]} ${className}`;

  const inner = (
    <>
      <span>{children}</span>
      {arrow && (
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
