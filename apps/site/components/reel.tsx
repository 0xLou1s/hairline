"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FIGURES } from "@/lib/figures";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

/**
 * The six figures, one at a time, standing on the page with no controls. Each
 * plays for six seconds while its tick fills, then the next comes in. A
 * pointer on the figure pauses the reel, and so does a hidden tab; picking a
 * tick shows that figure and stops the reel for good. Under reduced motion it
 * never starts.
 *
 * The tick's fill is the clock: a CSS animation whose end moves the reel on,
 * so a pause is only `animation-play-state`. Nothing moves the page when the
 * figure changes: every figure is 5:4, and the six captions share one cell,
 * as tall as the longest of them, with only the current one shown.
 */
export function Reel({ style }: { style?: CSSProperties }) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const Figure = COMPONENTS[FIGURES[at].id];

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  const pick = (i: number) => {
    setAt(i);
    setPlaying(false);
  };

  return (
    <div className="reel" style={style} data-reel data-playing={playing ? "" : undefined} data-paused={held || hidden ? "" : undefined}>
      <div className="reel-stage" data-figure={FIGURES[at].id} onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}>
        <Figure key={at} />
      </div>
      <div className="reel-ticks" role="group" aria-label="Figures">
        {FIGURES.map((f, i) => (
          <button key={f.id} type="button" className="reel-tick" aria-label={f.name} title={f.name} aria-current={i === at || undefined} onClick={() => pick(i)}>
            <span className="reel-fill" onAnimationEnd={i === at ? () => setAt((at + 1) % FIGURES.length) : undefined} />
          </button>
        ))}
      </div>
      <div className="reel-caps">
        {FIGURES.map((f, i) => (
          <p key={f.id} className="reel-cap" data-on={i === at ? "" : undefined}>
            <b>{f.name}.</b> {f.summary}
          </p>
        ))}
      </div>
    </div>
  );
}
