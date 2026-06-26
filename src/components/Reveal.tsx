'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span' | 'figure' | 'ul' | 'ol';
};

/**
 * Editorial scroll reveal — a soft rise + fade as content enters the viewport.
 *
 * Pure CSS transition toggled by IntersectionObserver. The base state is
 * VISIBLE; the `.js` class (added by the boot script before paint) is what
 * actually hides-then-reveals, so:
 *   - no-JS users see all content,
 *   - prefers-reduced-motion is honored in CSS,
 *   - server and first client render are byte-identical (no hydration mismatch).
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className = '',
  as = 'div',
}: RevealProps) {
  const ref = useRef<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as ElementType;
  const style = {
    '--reveal-y': `${y}px`,
    '--reveal-delay': `${delay}s`,
  } as CSSProperties;

  return (
    <Tag
      ref={ref}
      style={style}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </Tag>
  );
}
