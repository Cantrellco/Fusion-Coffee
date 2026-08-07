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

   Smoothness, on phones especially, comes from four things — see
   the knobs and the scrub effect below for each:
     1. an eased playhead, so a flick glides instead of snapping;
     2. seeks quantised to the encode's own frame grid, so no seek
        is ever spent landing on the frame already on screen;
     3. an event-driven seek chain (seek → 'seeked' → next seek)
        rather than an rAF poll, so seeks run back-to-back;
     4. zero forced layout inside the scroll handler — the section
        and panel heights are measured once and cached.
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
// Frame rate of each encode (see scripts/encode-orbit.sh — these MUST
// match it). The scrub rounds every seek onto this grid and skips the
// seek entirely when it resolves to the frame already displayed: at
// mobile's ~8px of scroll per frame, a naive continuous mapping spends
// most of its seeks re-fetching the current frame, and those wasted
// seeks are exactly what starves the ones that would move the picture.
const FPS_DESKTOP = 30;
const FPS_MOBILE = 15;
// Playhead easing time constant, in ms — the playhead chases the scroll
// position exponentially rather than being pinned to it.
//
// This is the single biggest win for phone smoothness, and it is not
// really about the video: iOS coalesces scroll events during momentum
// scrolling, so a flick delivers a few large jumps rather than a stream
// of small ones. Pinned 1:1, the orbit lurched several degrees per event
// and then sat still — the "glitchy" read. Chasing an eased target turns
// the same gesture into continuous motion that decelerates into place,
// and as a bonus every seek stays near the last one (short seeks are far
// cheaper than long ones). 110ms is short enough to still feel directly
// driven by the finger.
//
// Desktop is 0 — no easing, playhead pinned to the scroll exactly as
// before. Wheel/trackpad scroll is already fine-grained and desktop seeks
// are fast, so there is nothing to smooth and behaviour stays unchanged.
const EASE_TAU_MOBILE_MS = 110;
const EASE_TAU_DESKTOP_MS = 0;
// -------------------------------------------------------------------

export default function CoffeeOrbit({
  basePath = '/media/fusion-orbit',
  poster = '/media/fusion-orbit-poster.jpg',
}: CoffeeOrbitProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // The pinned stage — also the measuring stick for the scrub's travel
  // (see measure() below), so scroll room and viewport share one base.
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
  // Phones get a 15fps 720p encode (~4.8 MB) instead of the 30fps 1080p
  // master (17.9 MB) — both the biggest data saving on the site and half
  // the frames for the scrub to chase. Safe to swap in a mount effect: the
  // element ships preload="none" and nothing fetches until the loader effect
  // below runs, which is after hydration, so the choice is always final
  // before any bytes are requested.
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
      // Re-selecting the source on a breakpoint change is the loader effect's
      // job now — `mobileClip` is one of its deps, so flipping it tears down
      // the old clip (and its blob) and pulls the other one.
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Clip loader. Defers the download until the section is within ~1.5 screens,
  // so the majority of homepage visitors who never reach it don't pay for it.
  //
  // It fetches the clip and hands the video a `blob:` URL rather than pointing
  // `src` at the file, and that indirection is load-bearing, not a nicety:
  // Chrome derives `video.seekable` from the SERVER'S Range support, not from
  // what it has buffered. Cloudflare Pages does not answer Range requests for
  // these mp4s — an explicit `Range:` GET comes back `200` with the whole body
  // and no `accept-ranges` — so on both live Pages deployments `seekable` was
  // `[[0, 0]]` with the clip fully buffered, every `currentTime` write clamped
  // to 0, and the orbit sat frozen on frame 0 however far you scrolled. Bytes
  // the browser already owns are always seekable, so a blob: URL sidesteps the
  // host entirely. Measured on the live URL: direct src `seekable [0,0]`, seek
  // to 5.0s → 0; blob: `seekable [0,10]`, seek to 5.0s → 5.0.
  //
  // The trade is that the whole clip must arrive before the first frame instead
  // of streaming in. The poster covers that window and the fetch starts 1.5
  // screens out. GitHub Pages does honour Range, so the preview never showed
  // this — see the Range note in the deploy memory.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;
    // Reduced motion = no scrub, so never pull the clip at all — the poster is
    // the whole show (also the respectful call on data).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const url = `${basePath}${mobileClip ? '-720' : ''}.mp4`;
    const ac = new AbortController();
    let objectUrl: string | null = null;

    // If the fetch fails (offline, 404, quota), fall back to the plain
    // <source> path. On a Range-honouring host that still scrubs; on Pages it
    // degrades to the poster, which is what it already did.
    const useDirectSource = () => {
      try {
        video.preload = 'auto';
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
    };

    const pull = async () => {
      try {
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (ac.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        // Order matters: `src` first. Flipping `preload` to 'auto' while the
        // element still has only the child <source> makes it start fetching
        // the file directly, which we then abort a line later — a stray
        // request that briefly competes for bandwidth.
        video.src = objectUrl; // beats the child <source>
        video.preload = 'auto';
        video.load();
      } catch (err) {
        if ((err as { name?: string } | null)?.name === 'AbortError') return;
        useDirectSource();
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void pull();
        }
      },
      // 50% = start pulling the clip about half a viewport before the section
      // shows. 150% fired ~one viewport into the page, so nearly every visit
      // paid the full 17.9MB/5MB download whether or not they ever got here.
      { rootMargin: '50% 0px 50% 0px' },
    );
    io.observe(section);

    return () => {
      ac.abort();
      io.disconnect();
      if (objectUrl) {
        // Detach before revoking — revoking a URL the element still holds
        // leaves it decoding a source that no longer exists.
        try {
          video.removeAttribute('src');
          video.load();
        } catch {
          /* ignore */
        }
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [basePath, mobileClip]);

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

    const fps = mobileClip ? FPS_MOBILE : FPS_DESKTOP;
    const tau = mobileClip ? EASE_TAU_MOBILE_MS : EASE_TAU_DESKTOP_MS;
    const halfFrame = 0.5 / fps;

    // --- cached geometry ---------------------------------------------
    // Travel is measured against the pinned panel's own height (100svh),
    // NOT window.innerHeight: innerHeight tracks the *dynamic* viewport, so
    // on mobile it jumps as the URL bar hides/shows mid-scrub and the
    // playhead drifted against the svh-sized section. The panel and the
    // section share the svh base, so scrolled/travel map 1:1 — and the
    // playhead hits exactly 1 at the moment the sticky panel releases.
    // On desktop svh == vh == innerHeight: behavior is identical.
    //
    // Measured once here and on resize, never in the scroll handler. Both
    // reads force layout, and three forced layouts per scroll event is a
    // real stutter on a phone mid-momentum-scroll — the heights are pure
    // svh so they cannot change between resizes anyway.
    let travel = 0;
    const measure = () => {
      const viewport = stickyRef.current?.offsetHeight ?? window.innerHeight;
      travel = section.offsetHeight - viewport;
    };

    // --- playhead state ----------------------------------------------
    let targetT = 0; // where the scroll wants the playhead, in seconds
    let easedT = 0; // where the playhead actually is (chases targetT)
    let raf: number | null = null;
    let lastTickAt = 0;
    let pendingSeek = false; // a seek we issued that hasn't reported back
    let seekIssuedAt = 0;
    let shownFrame = -1; // frame index currently on screen (or being sought)
    // Mirror the two overlay booleans so a scroll event that doesn't cross a
    // threshold never enters React's dispatch path at all.
    let startedNow = false;
    let nearEndNow = false;

    const lastFrame = () => {
      const duration = video.duration;
      if (!duration || Number.isNaN(duration)) return -1;
      return Math.max(0, Math.round(duration * fps) - 1);
    };

    // Seek to the middle of the frame's interval, not its edge: edges sit
    // exactly on the boundary between two frames and different engines round
    // them different ways, which shows up as an occasional one-frame flicker
    // back and forth while scrubbing slowly.
    const timeOfFrame = (f: number) => (f + 0.5) / fps;

    // Don't issue a seek into a region that hasn't downloaded yet — it can't
    // complete until the bytes land, and meanwhile it blocks the one seek slot
    // we allow, so the orbit freezes instead of simply lagging the buffer. The
    // 'progress' listener re-pumps as the buffer grows. If the browser reports
    // no ranges at all we let the seek through rather than deadlock.
    const isBuffered = (t: number) => {
      const b = video.buffered;
      if (b.length === 0) return true;
      const duration = video.duration || 0;
      for (let i = 0; i < b.length; i += 1) {
        // Stay a frame clear of a range's trailing edge — a seek that lands
        // right on it can resolve into the not-yet-downloaded side. A range
        // that runs to the end of the clip has no such edge, and applying the
        // margin there made the last frame permanently unreachable, so the
        // orbit stopped one frame short of the full turn.
        const end = b.end(i);
        const limit = end >= duration - 1e-3 ? end : end - 1 / fps;
        if (t >= b.start(i) - 1e-3 && t <= limit) return true;
      }
      return false;
    };

    const pump = () => {
      if (pendingSeek) return;
      const last = lastFrame();
      if (last < 0) return;
      const f = Math.min(last, Math.max(0, Math.floor(easedT * fps)));
      if (f === shownFrame) return;
      const t = timeOfFrame(f);
      if (!isBuffered(t)) return; // retried from 'progress' / the next tick
      shownFrame = f;
      pendingSeek = true;
      seekIssuedAt = performance.now();
      try {
        video.currentTime = t;
      } catch {
        // seeking can briefly throw mid-load — drop the claim so we retry
        pendingSeek = false;
        shownFrame = -1;
      }
    };

    // Chain the next seek off completion rather than off the next animation
    // frame: seeks then run back-to-back at whatever rate the device can
    // manage, instead of being capped at one per rAF.
    const onSeeked = () => {
      pendingSeek = false;
      pump();
    };

    const schedule = () => {
      if (raf == null) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      raf = null;

      // Watchdog first, and before the duration guard: if the browser
      // swallowed a 'seeked' event, the seek slot must be released even on
      // the paths that return early, or the chain stalls forever.
      if (pendingSeek && performance.now() - seekIssuedAt > SEEK_WATCHDOG_MS) {
        pendingSeek = false;
        shownFrame = -1;
      }

      // Read duration LIVE off the element. Caching it from 'loadedmetadata'
      // is racy — that event can fire before this effect mounts (more likely
      // on heavier clips), which left the playhead stuck at 0.
      if (lastFrame() < 0) {
        // Duration not ready — let the chain die HERE and rely on the
        // 'loadedmetadata' / 'durationchange' / 'canplay' listeners below to
        // re-arm it the moment metadata lands. Self-rescheduling instead was
        // a real bug: with preload="none" metadata may never arrive (visitor
        // never nears the section), which left a permanent 60fps no-op rAF
        // loop spinning from page load — measurable battery drain on phones.
        lastTickAt = 0;
        return;
      }

      const dt = lastTickAt ? Math.min(now - lastTickAt, 100) : 0;
      lastTickAt = now;

      if (tau > 0 && dt > 0) {
        // Frame-rate independent exponential approach: the same 110ms feel
        // whether the device is running the loop at 120Hz or dropping to 30.
        easedT += (targetT - easedT) * (1 - Math.exp(-dt / tau));
      } else {
        easedT = targetT;
      }
      // Snap once we're inside a frame's width — otherwise the asymptote
      // keeps the loop alive forever for motion nobody can see.
      if (Math.abs(targetT - easedT) < halfFrame) easedT = targetT;

      pump();

      if (easedT !== targetT || pendingSeek) {
        schedule();
      } else {
        lastTickAt = 0;
      }
    };

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const p = travel > 0 ? Math.min(Math.max(-rect.top, 0), travel) / travel : 0;
      targetT = p * (video.duration || 0);

      const s = p > 0.015;
      if (s !== startedNow) {
        startedNow = s;
        setStarted(s);
      }
      const n = p > 0.88;
      if (n !== nearEndNow) {
        nearEndNow = n;
        setNearEnd(n);
      }
      schedule();
    };

    // Re-baseline: put the playhead where the scroll already is with no ease.
    // Used on metadata and on resize, where easing from a stale position would
    // animate a turn the visitor never asked for.
    const rebase = () => {
      measure();
      onScroll();
      easedT = targetT;
      shownFrame = -1;
      pump();
    };

    const onMeta = () => {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      rebase();
    };

    measure();
    if (video.readyState >= 1) onMeta();

    video.addEventListener('loadedmetadata', onMeta);
    // Re-arm the loop the moment the clip's duration lands or it becomes
    // playable, so a metadata race can never leave the playhead frozen.
    video.addEventListener('durationchange', onScroll);
    video.addEventListener('canplay', onScroll);
    video.addEventListener('seeked', onSeeked);
    // Buffer grew — a seek we declined as unbuffered may be viable now.
    video.addEventListener('progress', pump);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', rebase);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', rebase);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onScroll);
      video.removeEventListener('canplay', onScroll);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('progress', pump);
      if (raf != null) cancelAnimationFrame(raf);
    };
    // scrubVh / mobileClip are deps so the effect re-runs after the mount
    // effect swaps in the mobile scroll room, frame rate and easing — its
    // rebase() re-measures against the new section height. On desktop neither
    // changes, so this runs once, exactly as before.
  }, [basePath, scrubVh, mobileClip]);

  return (
    // Height set via --orbit-vh consumed by .orbit-room (globals.css), which
    // declares vh with an svh override — svh keeps the section and the scrub's
    // travel on the same small-viewport base (URL-bar-proof), while engines
    // without svh fall back to vh instead of dropping the height entirely.
    // Under reduced motion the scroll room collapses to one static screen; with
    // no JS at all, .orbit-room's html:not(.js) rule does the same collapse.
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
          This element also measures `travel` for the scrub — see measure(). */}
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
              position seeks to an exact, instantly-decodable frame — the key
              to reliable scroll scrubbing. Phones swap to the -720 encode
              (15fps, ~4.8 MB vs 30fps, 17.9 MB) before any bytes load — see
              the mobileClip mount effect and scripts/encode-orbit.sh. */}
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
