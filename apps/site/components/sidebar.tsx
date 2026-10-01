"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SECTIONS, type Group } from "@/lib/docs";

const GROUPS = [...new Set(SECTIONS.map((s) => s.group))] as Group[];
const LAST = SECTIONS[SECTIONS.length - 1].id;

/**
 * The section in view: the first one, in page order, inside a band from under the sticky chrome (a section's
 * scroll-margin-top, read each time, as it differs on a phone) to 30% down the viewport. Null in a gap between two
 * sections, where the mark stays put.
 */
function inView(sections: HTMLElement[]): string | null {
  const top = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0;
  const bottom = window.innerHeight * 0.3;
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    // the last section is too short to reach the band, so the end of the page marks it; unless the reader asked for
    // a section the page could only bring into view, on a screen taller than what is left below it
    const asked = sections.find((s) => `#${s.id}` === window.location.hash);
    const at = asked?.getBoundingClientRect();
    return asked && at && at.top >= 0 && at.top < window.innerHeight ? asked.id : LAST;
  }
  const hit = sections.find((s) => {
    const at = s.getBoundingClientRect();
    return at.bottom > top && at.top < bottom;
  });
  if (hit) return hit.id;
  // above the first section nothing is in the band, so Install is marked, as at the top
  return sections[0].getBoundingClientRect().top >= bottom ? SECTIONS[0].id : null;
}

/**
 * Puts a list's dot by the marked link's text, on its centre line. The first time, the dot appears in place; after
 * that it flies there, and in the column it swings out to the left on the way, like a thrown thing.
 */
function place(list: HTMLElement | null, active: string, swing: boolean) {
  const dot = list?.querySelector<HTMLElement>(".doc-dot");
  const link = list?.querySelector<HTMLElement>(`a[href="#${active}"]`);
  if (!list || !dot || !link || !list.clientWidth) return;
  const box = list.getBoundingClientRect();
  const at = link.getBoundingClientRect();
  const x = at.left - box.left + list.scrollLeft + parseFloat(getComputedStyle(link).paddingLeft);
  const y = at.top - box.top + list.scrollTop + (at.height - dot.offsetHeight) / 2;
  const to = `${x}px ${y}px`;
  if (dot.style.translate === to) return;
  if (!list.hasAttribute("data-live")) {
    dot.style.translate = to;
    // transitions start once the first mark has been drawn, so the page opens with it in place
    requestAnimationFrame(() => requestAnimationFrame(() => list.setAttribute("data-live", "")));
    return;
  }
  dot.style.translate = to;
  if (swing && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dot.animate([{ transform: "none" }, { transform: "translateX(-10px)", offset: 0.35 }, { transform: "none" }], { duration: 350, easing: "ease-in-out" });
  }
}

/**
 * The docs' anchors: grouped in a column beside the page from 1024px, one sideways strip under the top bar below it.
 * Both are plain links, so they work without JavaScript; the script marks the section in view with a dot, and
 * nothing is marked until it runs.
 */
export function Sidebar() {
  const [active, setActive] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const column = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    const pick = () => {
      const id = inView(sections);
      if (id) setActive(id);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    // the browser has already scrolled to a deep link's section, at once; the reader's own clicks from here on glide
    document.documentElement.dataset.smooth = "";
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
      delete document.documentElement.dataset.smooth;
    };
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, []);

  // before paint, so the dot is never drawn by a link that is no longer marked
  useLayoutEffect(() => {
    if (!active) return;
    const both = () => {
      place(column.current, active, true);
      place(strip.current, active, false);
    };
    both();
    // a list that was hidden shows, or the window changes width: the dot keeps to its link
    const resize = new ResizeObserver(both);
    for (const el of [column.current, strip.current]) if (el) resize.observe(el);
    return () => resize.disconnect();
  }, [active]);

  // Brings the marked item into the strip by scrolling the strip alone. scrollIntoView would also scroll the
  // page, and would cut short the smooth scroll a click on the strip has just started.
  useEffect(() => {
    const el = strip.current;
    const item = el?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!el || !item || !el.clientWidth) return;
    const pad = 24;
    const box = el.getBoundingClientRect();
    const at = item.getBoundingClientRect();
    if (at.left - pad < box.left) el.scrollTo({ left: el.scrollLeft + at.left - pad - box.left });
    else if (at.right + pad > box.right) el.scrollTo({ left: el.scrollLeft + at.right + pad - box.right });
  }, [active]);

  const link = (id: string, title: string) => (
    <li key={id}>
      <a href={`#${id}`} className="doc-link" aria-current={id === active ? "location" : undefined}>
        <span>{title}</span>
      </a>
    </li>
  );
  const dot = active && <span className="doc-dot" aria-hidden />;

  return (
    <>
      <nav ref={column} aria-label="Docs" className="doc-sidebar">
        {GROUPS.map((group) => (
          <div key={group} className="doc-group">
            <p className="doc-group-label">{group}</p>
            <ul>{SECTIONS.filter((s) => s.group === group).map((s) => link(s.id, s.title))}</ul>
          </div>
        ))}
        {dot}
      </nav>
      <nav aria-label="Docs" className="doc-strip">
        <div ref={strip} className="doc-strip-scroll" data-start={edges.start || undefined} data-end={edges.end || undefined}>
          <ul>{SECTIONS.map((s) => link(s.id, s.title))}</ul>
          {dot}
        </div>
      </nav>
    </>
  );
}
