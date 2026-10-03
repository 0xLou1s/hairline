"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Branches, Cabinet, Elevator, Exploded, Keyboard, Laptop, Phone, Phosphor, Riffle, Slow, Terminal, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FIGURES } from "@/lib/figures";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable, keyboard: Keyboard, elevator: Elevator, phone: Phone, laptop: Laptop, terminal: Terminal, cabinet: Cabinet, branches: Branches };

/**
 * One pass of a pointer over each figure, in its viewBox (400 × 320): [x, y, ms]. Each path does the
 * one thing that figure answers to, so a visitor who never moves the mouse still sees it answer.
 */
const DEMO: Record<keyof typeof COMPONENTS, [number, number, number][]> = {
  riffle: [[110, 220, 0], [300, 115, 2200]],
  terrain: [[140, 175, 0], [215, 135, 700], [275, 170, 1400], [205, 210, 2100], [150, 175, 2700]],
  exploded: [[110, 195, 0], [280, 185, 1200], [245, 265, 2400]],
  phosphor: [[130, 100, 0], [270, 100, 700], [140, 160, 1400], [275, 165, 2100]],
  slow: [[120, 250, 0], [200, 165, 700], [206, 160, 2600]],
  turntable: [[100, 170, 0], [125, 168, 400], [310, 160, 620], [320, 158, 900]],
  keyboard: [[126, 116, 0], [290, 198, 2000], [172, 165, 3000]],
  elevator: [[200, 250, 0], [200, 60, 1400], [200, 175, 3400]],
  phone: [[110, 170, 0], [290, 170, 1200], [290, 90, 1900], [290, 250, 2900]],
  laptop: [[200, 270, 0], [200, 70, 1500], [200, 180, 3300]],
  terminal: [[200, 250, 0], [200, 90, 1500], [200, 170, 3300]],
  cabinet: [[200, 250, 0], [200, 120, 1600], [200, 200, 3300]],
  branches: [[170, 192, 0], [124, 112, 1800], [332, 216, 3400]],
};

/** Long enough for the slowest dissolve (the reel's own, 520ms) to finish before its leaver goes. */
const LEAVE_MS = 640;

type Layer = { key: number; at: number; leaving: boolean };

/**
 * The figures, one at a time, standing on the page with no controls. Each
 * plays for six seconds while its tick fills, then the next dissolves in over
 * it. A pointer on the figure pauses the reel, and so does a hidden tab;
 * picking a tick shows that figure and stops the reel for good. Under reduced
 * motion it never starts.
 *
 * The tick's fill is the clock: a CSS animation whose end moves the reel on,
 * so a pause is only `animation-play-state`. A change of figure overlaps: the
 * new one mounts in its own layer over the old, which blurs away and is then
 * unmounted. Nothing moves the page: every figure is 5:4 and the layers stack
 * in one box.
 *
 * While the reel plays, a hairline ring walks each figure once and hands it
 * the pointer events a mouse would, so the page shows what "answer the
 * pointer" means before anyone moves theirs. A real pointer takes over at once.
 */
export function Reel({ style }: { style?: CSSProperties }) {
  const [at, setAt] = useState(0);
  const [layers, setLayers] = useState<Layer[]>([{ key: 0, at: 0, leaving: false }]);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const nextKey = useRef(1);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const front = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const heldRef = useRef(false);
  const stopDemo = useRef<() => void>(() => {});
  const first = useRef(true);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  const go = (i: number, auto: boolean) => {
    if (i === at) return;
    const way = i > at || (auto && i === 0) ? "fwd" : "back";
    // A full tick hands its line on toward the next one; one cut short by a pick rewinds to where it began.
    const out = fills.current[at];
    if (out && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const m = getComputedStyle(out).transform;
      const drawn = m === "none" ? 1 : new DOMMatrix(m).a;
      const origin = drawn > 0.99 ? (way === "fwd" ? "right" : "left") : "left";
      if (drawn > 0.01) out.animate([{ transform: `scaleX(${drawn})`, transformOrigin: origin }, { transform: "scaleX(0)", transformOrigin: origin }], { duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
    const key = nextKey.current++;
    setLayers((ls) => [...ls.map((l) => (l.leaving ? l : { ...l, leaving: true })), { key, at: i, leaving: false }]);
    // every layer that left on this change goes; one that leaves on a later change waits for its own timer
    setTimeout(() => setLayers((ls) => ls.filter((l) => !l.leaving || l.key >= key)), LEAVE_MS);
    setDir(way);
    setAt(i);
  };

  const pick = (i: number) => {
    setPlaying(false);
    go(i, false);
  };

  // the demo pointer: once per figure, while the reel plays and nobody is pointing
  useEffect(() => {
    const delay = first.current ? 1400 : 920;
    first.current = false;
    const host = front.current?.firstElementChild as HTMLElement | null | undefined;
    const ring = ghost.current;
    if (!playing || heldRef.current || !host || !ring || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const path = DEMO[FIGURES[at].id];
    const end = path[path.length - 1][2];
    let raf = 0, inside = false, done = false;
    const stop = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      if (inside) host.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
      delete ring.dataset.on;
    };
    const frame = (start: number) => (now: number) => {
      const t = now - start;
      if (t > end) return stop();
      let k = 1;
      while (k < path.length - 1 && path[k][2] < t) k++;
      const [x0, y0, a] = path[k - 1], [x1, y1, b] = path[k];
      let u = Math.min(1, Math.max(0, (t - a) / (b - a || 1)));
      u = u * u * (3 - 2 * u);
      const box = host.getBoundingClientRect(), stage = ring.parentElement!.getBoundingClientRect();
      const x = box.left + ((x0 + (x1 - x0) * u) / 400) * box.width;
      const y = box.top + ((y0 + (y1 - y0) * u) / 320) * box.height;
      ring.style.transform = `translate(${x - stage.left}px, ${y - stage.top}px)`;
      ring.dataset.on = "";
      inside = true;
      host.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" }));
      raf = requestAnimationFrame(frame(start));
    };
    const timer = setTimeout(() => (raf = requestAnimationFrame((now) => frame(now)(now))), delay);
    stopDemo.current = stop;
    return stop;
  }, [at, playing]);

  return (
    <div className="reel" style={style} data-reel data-dir={dir} data-playing={playing ? "" : undefined} data-paused={held || hidden ? "" : undefined}>
      <div
        className="reel-stage"
        data-figure={FIGURES[at].id}
        onPointerEnter={() => {
          // before the pointer's own first move reaches the figure
          heldRef.current = true;
          stopDemo.current();
          setHeld(true);
        }}
        onPointerLeave={() => {
          heldRef.current = false;
          setHeld(false);
        }}
      >
        {layers.map((l) => {
          const Figure = COMPONENTS[FIGURES[l.at].id];
          return (
            <div key={l.key} ref={l.leaving ? undefined : front} className="reel-layer" data-leaving={l.leaving ? "" : undefined}>
              <Figure />
            </div>
          );
        })}
        <span ref={ghost} className="reel-ghost" aria-hidden="true" />
      </div>
      <div className="reel-ticks" role="group" aria-label="Figures">
        {FIGURES.map((f, i) => (
          <button key={f.id} type="button" className="reel-tick" aria-label={f.name} title={f.name} aria-current={i === at || undefined} onClick={() => pick(i)}>
            <span ref={(el) => { fills.current[i] = el; }} className="reel-fill" onAnimationEnd={i === at ? () => go((at + 1) % FIGURES.length, true) : undefined} />
          </button>
        ))}
      </div>
    </div>
  );
}
