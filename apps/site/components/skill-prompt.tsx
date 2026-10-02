"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

/**
 * The home's way to the skill: a question, then the skill's command as a
 * prompt waiting to be sent, with the ideas it has drawn typed after it one
 * at a time. The whole prompt is the link; the return key says it goes. Under
 * reduced motion the first idea stays. An idea wider than the prompt fades at
 * the edge, as the install line does.
 */
export function SkillPrompt({ command, ideas, style }: { command: string; ideas: string[]; style?: CSSProperties }) {
  const [{ at, prev }, setTurn] = useState({ at: 0, prev: -1 });
  const line = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setTurn((t) => ({ at: (t.at + 1) % ideas.length, prev: t.at })), 2600);
    return () => clearInterval(timer);
  }, [ideas.length]);

  useEffect(() => {
    const el = line.current;
    const idea = el?.querySelector<HTMLElement>(`[data-idea="${at}"]`);
    if (!el || !idea) return;
    const measure = () => setMore(idea.getBoundingClientRect().right > el.getBoundingClientRect().right + 0.5);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => resize.disconnect();
  }, [at]);

  return (
    <div className="hero-skill" style={style}>
      <p className="hero-skill-ask">Need a figure that isn’t one of the six?</p>
      <a className="prompt" href="/skill" aria-label="Make your own figure with the hairline-create skill">
        <code aria-hidden="true" className="prompt-caret">›</code>
        <code ref={line} aria-hidden="true" className="prompt-line" data-more={more ? "" : undefined}>
          <span className="text-muted">{command} </span>
          <span className="prompt-ideas">
            {ideas.map((idea, i) => (
              <span key={idea} className="prompt-idea" data-idea={i} data-on={i === at ? "" : undefined} data-gone={i === prev ? "" : undefined}>
                {idea}
              </span>
            ))}
          </span>
        </code>
        <span className="prompt-go" aria-hidden="true">
          <span className="prompt-go-label">to draw</span>
          <span className="prompt-key">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.5 3.5v4a2 2 0 0 1-2 2h-7M6 6.5l-3 3 3 3" />
            </svg>
          </span>
        </span>
      </a>
    </div>
  );
}
