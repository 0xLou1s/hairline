"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type Option<T extends string> = { value: T; label: ReactNode; name?: string };

/**
 * A single choice as a radio group, with a highlight that slides to the
 * checked option. The slide is turned on after the first paint, so the page
 * does not open with it moving. Arrow keys move the choice, and the highlight
 * with it at once; only a pointer's choice slides.
 *
 * The highlight never animates its size. It is moved with transform; where the
 * options differ in width (`clip`), it spans the whole row and a clip-path
 * cuts it down to the checked option.
 */
export function Slide<T extends string>({ options, value, onChange, label, clip = false, className = "" }: { options: Option<T>[]; value: T; onChange: (value: T) => void; label: string; clip?: boolean; className?: string }) {
  const group = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number; rowW: number; rowH: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [keyed, setKeyed] = useState(false);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    const measure = () => {
      const el = root.querySelector<HTMLElement>('[aria-checked="true"]');
      const last = root.querySelector<HTMLElement>("[role=radio]:last-of-type");
      // the row's extent is read from its options, not the group, which can scroll
      if (el && last) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, rowW: last.offsetLeft + last.offsetWidth, rowH: last.offsetTop + last.offsetHeight });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    return () => resize.disconnect();
  }, [value]);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setReady(true))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    setKeyed(true);
    const at = options.findIndex((o) => o.value === value);
    const next = (at + step + options.length) % options.length;
    onChange(options[next].value);
    group.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  };

  return (
    <div ref={group} role="radiogroup" aria-label={label} className={`slide ${className}`} data-ready={ready || undefined} data-keyed={keyed || undefined} onKeyDown={onKeyDown} onPointerDown={() => setKeyed(false)}>
      {box ? <span className="slide-hl" aria-hidden="true" style={clip
        ? { width: box.rowW, height: box.rowH, clipPath: `inset(${box.y}px ${box.rowW - box.x - box.w}px ${box.rowH - box.y - box.h}px ${box.x}px round var(--slide-radius))` }
        : { width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }} /> : null}
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-label={o.name} title={o.name} tabIndex={o.value === value ? 0 : -1} className="slide-item" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
