"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS, type Group } from "@/lib/docs";

const GROUPS = [...new Set(SECTIONS.map((s) => s.group))] as Group[];
const LAST = SECTIONS[SECTIONS.length - 1].id;

/**
 * The docs' anchors: grouped in a column beside the page from 1024px, one
 * sideways strip under the top bar below it. Both are plain links, so they
 * work without JavaScript; the script only marks the section in view, which
 * is the first one, in page order, inside a band from under the sticky
 * chrome to 30% down the viewport.
 */
export function Sidebar() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [edges, setEdges] = useState({ start: false, end: false });
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    // the band starts where a section lands after a click: its scroll-margin-top, under the top bar and on a phone the strip
    const offset = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0;
    const inBand = new Set<string>();
    const pick = () => {
      const end = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      // the last section is too short to reach the band, so the end of the page marks it
      if (end) return setActive(LAST);
      const first = SECTIONS.find((s) => inBand.has(s.id));
      if (first) setActive(first.id);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        pick();
      },
      { rootMargin: `-${offset}px 0px -70% 0px` },
    );
    for (const el of sections) observer.observe(el);
    window.addEventListener("scroll", pick, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", pick);
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

  // Brings the marked item into the strip by scrolling the strip alone. scrollIntoView would also scroll the
  // page, and would cut short the smooth scroll a click on the strip has just started.
  useEffect(() => {
    const el = strip.current;
    const item = el?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!el || !item || !el.clientWidth) return;
    const pad = 24;
    if (item.offsetLeft - pad < el.scrollLeft) el.scrollTo({ left: item.offsetLeft - pad });
    else if (item.offsetLeft + item.offsetWidth + pad > el.scrollLeft + el.clientWidth) el.scrollTo({ left: item.offsetLeft + item.offsetWidth + pad - el.clientWidth });
  }, [active]);

  const link = (id: string, title: string) => (
    <li key={id}>
      <a href={`#${id}`} className="doc-link" aria-current={id === active ? "location" : undefined}>{title}</a>
    </li>
  );

  return (
    <>
      <nav aria-label="Docs" className="doc-sidebar">
        {GROUPS.map((group) => (
          <div key={group} className="doc-group">
            <p className="doc-group-label">{group}</p>
            <ul>{SECTIONS.filter((s) => s.group === group).map((s) => link(s.id, s.title))}</ul>
          </div>
        ))}
      </nav>
      <nav aria-label="Docs" className="doc-strip">
        <div ref={strip} className="doc-strip-scroll" data-start={edges.start || undefined} data-end={edges.end || undefined}>
          <ul>{SECTIONS.map((s) => link(s.id, s.title))}</ul>
        </div>
      </nav>
    </>
  );
}
