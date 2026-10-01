"use client";

import { useEffect, useRef } from "react";

/** The generated page's body has 24px of padding above and below its one column. */
const PAD = 48;

/**
 * A page the skill wrote, in a frame as tall as that page: the frame never
 * scrolls inside. Its height is reserved in CSS before it loads, then fitted
 * to the page's column and kept fitted as the column's text wraps.
 */
export function ExampleFrame({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let watch: ResizeObserver | undefined;
    const fit = () => {
      const view = el.contentWindow as (Window & typeof globalThis) | null;
      const main = el.contentDocument?.querySelector("main");
      if (!view || !main) return;
      const size = () => { el.style.height = `${main.offsetHeight + PAD}px`; };
      size();
      watch?.disconnect();
      // the frame's own observer: its column is in the frame's document
      watch = new view.ResizeObserver(size);
      watch.observe(main);
    };
    fit();
    el.addEventListener("load", fit);
    return () => {
      el.removeEventListener("load", fit);
      watch?.disconnect();
    };
  }, []);

  return <iframe ref={frame} className="example-frame" src={src} title={title} loading="lazy" />;
}
