'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ============================================================
   Coffee Orbit — scroll-scrubbed product reveal
   ------------------------------------------------------------
   When the visitor reaches this section the product "pins" to
   the centre of the screen (the page appears to stop), and from
   then on their scrolling becomes the playhead: it scrubs a
   ~180° camera orbit around the real Fusion can-glass, frame by
   frame. Scroll down = orbit forward, scroll up = orbit back.
   When the orbit finishes, the section releases and the page
   scrolls on normally.

   How it works: a tall <section> gives the scroll "room"; an
   inner `position: sticky` panel stays fixed on screen while
   that room scrolls past. We map how far we are through the
   section (0 → 1) onto the video's currentTime. No scroll
   hijacking — it stays smooth and works on touch.

   The video frame itself is never transformed: it sits still and
   full-bleed, and ONLY the scrubbed footage advances. (An earlier
   version counter-translated the whole <video> every frame to
   "stabilize" the can's base; because the video is a full-bleed
   object-cover layer, that slid the entire frame — background and
   all — which read as the background drifting/creeping. Removed.)
   ============================================================ */

type CoffeeOrbitProps = {
  /** Path to the orbit video without extension; .mp4 is served. */
  basePath?: string;
  /** First-frame image shown before the video is ready. */
  poster?: string;
};

// --- Tunable knobs -------------------------------------------------
// Taller section = the orbit is spread over more scrolling (stays on
// screen longer) and the turn feels slower/smoother per scroll.
// 440 = it takes ~4.4 screen-heights of scroll to complete one turn.
const SCRUB_SCROLL_VH = 440;
// Below md, 440 is an enormous scroll commitment for one delight beat —
// the least app-like interaction on the page — so phones get a shorter
// run. Desktop keeps 440 exactly.
const SCRUB_SCROLL_VH_MOBILE = 260;
// If a seek is still in flight after this long, assume the browser
// dropped the 'seeked' event (an iOS/Safari failure mode) and re-issue
// it so the playhead can never get permanently stranded.
const SEEK_WATCHDOG_MS = 350;
// -------------------------------------------------------------------

export default function CoffeeOrbit({
  basePath = '/media/fusion-orbit',
  poster = '/media/fusion-orbit-poster.jpg',
}: CoffeeOrbitProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // The pinned stage — also the measuring stick for the scrub's travel
  // (see progress() below), so scroll room and viewport share one base.
  const stickyRef = useRef<HTMLDivElement>(null);
  // Overlay state: the "scroll to spin" cue fades once the orbit starts; the
  // payoff caption fades in near the end of the turn.
  const [started, setStarted] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);
  // Scroll room in svh. SSR-safe: default to the desktop constant so the
  // server markup and first client render match, then the mount effect
  // below swaps in the mobile value (read once — this only matters while
  // the section is on screen, a live listener isn't worth it).
  const [scrubVh, setScrubVh] = useState(SCRUB_SCROLL_VH);
  // Phones get a ~0.9 MB 720p encode instead of the 17.9 MB 1080p master —
  // the single biggest data saving on the site. Safe to swap in a mount
  // effect: the element ships preload="none" and only calls load() from the
  // approach observer, which registers after hydration, so the source is
  // always final before any bytes are requested.
  const [mobileClip, setMobileClip] = useState(false);
  // prefers-reduced-motion: when set we never scrub — the section collapses
  // to a single static screen (see the style prop) and both effects below
  // bail out before touching the video.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
    }
    // Live listener, not a one-shot read: a tablet rotating across the 768px
    // line mid-session must get the desktop scrub room and the 1080p master
    // back (and vice versa) — a sticky mobile value was a real desktop drift.
    const mq = window.matchMedia('(max-width: 767.98px)');
    const apply = () => {
      setScrubVh(mq.matches ? SCRUB_SCROLL_VH_MOBILE : SCRUB_SCROLL_VH);
      setMobileClip(mq.matches);
      // If the clip already started loading under the old source, re-select:
      // <source> edits alone don't re-evaluate an in-flight media element.
      const video = videoRef.current;
      if (video && video.readyState > 0) {
        const wantMobile = mq.matches;
        const isMobileSrc = video.currentSrc.includes('-720');
        if (wantMobile !== isMobileSrc) {
          // Let React swap the <source>, then reload on the next frame.
          requestAnimationFrame(() => {
            try {
              video.load();
            } catch {
              /* ignore */
            }
          });
        }
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Defer the heavy (~18 MB) clip until the section is within ~1.5 screens, so
  // the majority of homepage visitors who never reach it don't pay for it — but
  // it's fully buffered before anyone actually scrubs. The element ships with
  // preload="none"; we upgrade to "auto" + load() on approach. The scrub effect
  // below already re-arms on durationchange/canplay, so metadata arriving late
  // is handled.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;
    // Reduced motion = no scrub, so never pull the heavy clip at all — the
    // poster is the whole show (also the respectful call on data).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          video.preload = 'auto';
          try {
            video.load();
          } catch {
            /* ignore */
          }
          io.disconnect();
        }
      },
      { rootMargin: '150% 0px 150% 0px' },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // Reduced motion: skip frame-seeking entirely — the poster (the clip's
    // first frame) stays up as a still. Pin the overlays to their readable
    // end state: the "scroll to spin" cue is suppressed (it invites motion
    // that won't happen) and the payoff caption is shown so the /menu link
    // stays reachable without the orbit.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStarted(true); // started → cue fades out
      setNearEnd(true); // nearEnd → payoff link visible
      return;
    }

    let target = 0; // where the scroll wants the playhead
    let raf: number | null = null;
    let seekStartedAt = 0; // when the in-flight seek began (for the watchdog)

    // Map scroll position within the section onto 0–1 progress.
    const progress = () => {
      const rect = section.getBoundingClientRect();
      // Travel is measured against the pinned panel's own height (100svh),
      // NOT window.innerHeight: innerHeight tracks the *dynamic* viewport,
      // so on mobile it jumps as the URL bar hides/shows mid-scrub and the
      // playhead drifted against the svh-sized section. The panel and the
      // section share the svh base, so scrolled/travel map 1:1 — and the
      // playhead hits exactly 1 at the moment the sticky panel releases.
      // On desktop svh == vh == innerHeight: behavior is identical.
      const viewport = stickyRef.current?.offsetHeight ?? window.innerHeight;
      const travel = section.offsetHeight - viewport;
      if (travel <= 0) return 0;
      const scrolled = Math.min(Math.max(-rect.top, 0), travel);
      return scrolled / travel;
    };

    const schedule = () => {
      if (raf == null) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = null;
      // Read duration LIVE off the element. Caching it from 'loadedmetadata'
      // is racy — that event can fire before this effect mounts (more likely
      // on heavier clips), which left the playhead stuck at 0.
      const duration = video.duration;
      if (!duration || Number.isNaN(duration)) {
        // Duration not ready — let the chain die HERE and rely on the
        // 'loadedmetadata' / 'durationchange' / 'canplay' listeners below to
        // re-arm it the moment metadata lands. Self-rescheduling instead was
        // a real bug: with preload="none" metadata may never arrive (visitor
        // never nears the section), which left a permanent 60fps no-op rAF
        // loop spinning from page load — measurable battery drain on phones.
        return;
      }
      // Never issue a new seek while one is still in flight: heavier clips
      // drop seeks requested mid-seek, which starved the playhead and pinned
      // it at 0. Wait for the current seek to finish, then chase the target.
      if (video.seeking) {
        // Watchdog: if the seek overruns, the browser likely swallowed the
        // 'seeked' event — re-issue so the loop can't spin here forever.
        if (seekStartedAt && performance.now() - seekStartedAt > SEEK_WATCHDOG_MS) {
          try {
            video.currentTime = target;
            seekStartedAt = performance.now();
          } catch {
            /* seeking can briefly throw mid-load */
          }
        }
        schedule();
        return;
      }
      if (Math.abs(target - video.currentTime) > 0.03) {
        try {
          video.currentTime = target;
          seekStartedAt = performance.now();
        } catch {
          /* seeking can briefly throw mid-load */
        }
        schedule();
      }
    };

    const onScroll = () => {
      const p = progress();
      target = p * (video.duration || 0);
      // Cheap threshold flips — React bails when the boolean is unchanged.
      setStarted(p > 0.015);
      setNearEnd(p > 0.88);
      schedule();
    };

    const onMeta = () => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      onScroll(); // recompute now that the duration is known
    };
    if (video.readyState >= 1) onMeta();

    video.addEventListener('loadedmetadata', onMeta);
    // Re-arm the loop the moment the clip's duration lands or it becomes
    // playable, so a metadata race can never leave the playhead frozen.
    video.addEventListener('durationchange', onScroll);
    video.addEventListener('canplay', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onScroll);
      video.removeEventListener('canplay', onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
    // scrubVh is a dep so the effect re-runs after the mount effect swaps in
    // the mobile scroll room — its initial onScroll() re-baselines the
    // playhead against the new section height. On desktop scrubVh never
    // changes, so this runs once, exactly as before.
  }, [basePath, scrubVh]);

  return (
    // Height set via --orbit-vh consumed by .orbit-room (globals.css), which
    // declares vh with an svh override — svh keeps the section and progress()
    // on the same small-viewport base (URL-bar-proof), while engines without
    // svh fall back to vh instead of dropping the height entirely. Under
    // reduced motion the scroll room collapses to one static screen; with no
    // JS at all, .orbit-room's html:not(.js) rule does the same collapse.
    <section
      ref={sectionRef}
      className="orbit-room relative bg-espresso"
      style={{ '--orbit-vh': reducedMotion ? 100 : scrubVh } as React.CSSProperties}
      aria-label="Fusion Coffee — meet the can"
    >
      {/* .h-screen-small (100vh -> 100svh fallback pair, globals.css): on iOS
          100vh hangs below the collapsible URL bar, pushing the pinned
          stage's bottom edge off screen; svh always fits (== vh on desktop),
          and non-svh engines keep the vh line instead of losing the height.
          This element also measures `travel` for the scrub — see progress(). */}
      <div
        ref={stickyRef}
        className="h-screen-small sticky top-0 flex w-full items-center justify-center overflow-hidden"
      >
        {/* The orbiting product. object-cover keeps the centred can filling
            the screen on any aspect ratio. No transform — the frame stays put;
            only the scrubbed footage moves. */}
        <video
          ref={videoRef}
          poster={poster}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          className="h-full w-full object-cover"
        >
          {/* H.264 mp4, all-intra (every frame a keyframe) so each scroll
              position seeks to an exact, instantly-decodable frame — the
              key to reliable scroll scrubbing. Phones swap to the -720
              encode (~0.9 MB vs 17.9 MB) before any bytes load — see the
              mobileClip mount effect. */}
          <source
            src={`${basePath}${mobileClip ? '-720' : ''}.mp4`}
            type="video/mp4"
          />
        </video>

        {/* "Scroll to spin" cue — fades out the moment the orbit begins.
            <md it rides above the fixed tab bar (+ safe area); md: restores
            the original bottom-10. */}
        <div
          aria-hidden
          className={`orbit-cue pointer-events-none absolute inset-x-0 bottom-[calc(2.5rem+var(--tabbar-h)+env(safe-area-inset-bottom))] flex flex-col items-center gap-2 text-cream/80 transition-opacity duration-500 ease-out-expo md:bottom-10 ${
            started ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="eyebrow text-cream/55">Scroll to spin</span>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 animate-bounce motion-reduce:animate-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </div>

        {/* Payoff caption — fades in as the turn completes, routing to merch.
            <md the link clears the fixed tab bar (+ safe area) so it stays
            tappable; md: restores the original pb-10. */}
        <div
          className={`orbit-payoff absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-espresso/80 to-transparent pb-[calc(2.5rem+var(--tabbar-h)+env(safe-area-inset-bottom))] pt-20 transition-opacity duration-700 ease-out-expo md:pb-10 ${
            nearEnd ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <Link
            href="/menu/"
            className="group inline-flex items-center gap-2 text-center font-display text-lg italic text-cream"
          >
            Made to order — see the menu
            <span className="not-italic transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
