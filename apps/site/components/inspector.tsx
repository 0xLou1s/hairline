"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FIGURES, type FigureId } from "@/lib/figures";
import { snippet, type Theme } from "@/lib/snippets";
import { Code } from "./code";
import { CopyIcon } from "./copy";
import { Slide, type Option } from "./slide";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };
const FIGURE_OPTIONS: Option<FigureId>[] = FIGURES.map((f) => ({ value: f.id, label: f.name }));

const ICON = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.3, "aria-hidden": true } as const;
const THEMES: Option<Theme>[] = [
  { value: "auto", name: "Auto", label: <svg {...ICON}><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor" stroke="none" /></svg> },
  { value: "light", name: "Light", label: <svg {...ICON} strokeLinecap="round"><circle cx="8" cy="8" r="2.75" /><path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05" /></svg> },
  { value: "dark", name: "Dark", label: <svg {...ICON}><path d="M13.25 9.6A5.5 5.5 0 0 1 6.4 2.75a5.5 5.5 0 1 0 6.85 6.85z" strokeLinejoin="round" /></svg> },
];

/** A CSS custom property in a style object. */
const vars = (v: Record<string, string>) => v as CSSProperties;

/**
 * One large figure standing on the page itself, with no card around it, and
 * one dock under it for every control: which figure, how intense, which
 * theme. The snippet under them is the code for what is on screen.
 */
export function Inspector() {
  const [id, setId] = useState<FigureId>("terrain");
  const [intensity, setIntensity] = useState(0.5);
  const [theme, setTheme] = useState<Theme>("auto");
  const slider = useId();
  const code = useRef<HTMLPreElement>(null);
  const doc = FIGURES.find((f) => f.id === id)!;
  const Figure = COMPONENTS[id];
  const text = snippet(doc.name, { intensity, theme });
  const dark = theme === "dark";

  return (
    <div className="s-inspector" data-inspector>
      {/* off dark, the figure's plate is the page, so it stands without a box */}
      <div className="s-stage enter" style={vars({ "--d": "400ms", ...(dark ? {} : { "--hairline-plate": "var(--color-canvas)" }) })} data-figure={id} data-dark={dark || undefined}>
        <Figure key={id} intensity={intensity} theme={theme} />
      </div>

      <div className="s-dock enter" style={vars({ "--d": "460ms" })}>
        <Slide label="Figure" options={FIGURE_OPTIONS} value={id} onChange={setId} clip className="s-figures" />
        <div className="s-row">
          <div className="s-range">
            <label htmlFor={slider} className="s-range-label">Intensity</label>
            <input id={slider} type="range" className="slider" min={0} max={1} step={0.05} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} />
            <output htmlFor={slider} className="s-value">{intensity.toFixed(2)}</output>
          </div>
          <Slide label="Theme" options={THEMES} value={theme} onChange={setTheme} className="s-themes" />
        </div>
      </div>
      <p key={id} className="s-hint enter-hint">{doc.stronger}</p>

      <div className="s-code enter" style={vars({ "--d": "520ms" })} data-snippet>
        <Code text={text} codeRef={code} />
        <CopyIcon text={text} select={code} label="Copy snippet" className="s-copy" />
      </div>
    </div>
  );
}
