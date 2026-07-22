import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function ArrowUpRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function Mail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

export function Phone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 4.5 4.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 7.6 1.5 1.5 0 0 1 6.5 4Z" />
    </svg>
  );
}

export function Instagram(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Facebook(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 8.5V7c0-.8.4-1.2 1.3-1.2H17V3h-2.3c-2.4 0-3.7 1.3-3.7 3.7v1.8H9V11h2v9h3.5v-9h2.2l.5-2.5h-2.7Z" />
    </svg>
  );
}

export function Menu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Close(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function Bean(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <ellipse cx="12" cy="12" rx="7.5" ry="9" transform="rotate(35 12 12)" />
      <path d="M8.5 7.5C11 10 11 14 8.5 16.5" />
    </svg>
  );
}

// ---- Bottom tab bar icons (mobile app shell) ----

export function Home(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
    </svg>
  );
}

export function Cup(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 9.5h11V15a4.5 4.5 0 0 1-4.5 4.5H9.5A4.5 4.5 0 0 1 5 15V9.5Z" />
      <path d="M16 11h1.4a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M8.2 6.5c0-.9.6-1.1.6-2M12 6.5c0-.9.6-1.1.6-2" />
    </svg>
  );
}

export function Bag(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.7 8.2h12.6l-.75 10.6a2.1 2.1 0 0 1-2.1 1.95H8.55a2.1 2.1 0 0 1-2.1-1.95L5.7 8.2Z" />
      <path d="M9 10.2V6.7a3 3 0 0 1 6 0v3.5" />
    </svg>
  );
}
