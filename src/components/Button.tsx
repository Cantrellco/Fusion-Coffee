import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from './icons';

type Variant = 'primary' | 'ink' | 'outline' | 'cream' | 'ghost-light';

const variants: Record<Variant, string> = {
  primary: 'bg-brick text-cream hover:bg-[#9b4128] border border-transparent',
  ink: 'bg-ink text-cream hover:bg-[#000] border border-transparent',
  outline:
    'bg-transparent text-ink border border-ink/25 hover:bg-ink hover:text-cream',
  cream: 'bg-cream text-ink hover:bg-white border border-transparent',
  'ghost-light':
    'bg-transparent text-cream border border-cream/35 hover:bg-cream hover:text-ink',
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
  const cls = `group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-medium tracking-wide cursor-pointer transition-colors duration-300 ease-out-expo focus-visible:outline-2 ${variants[variant]} ${className}`;

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
