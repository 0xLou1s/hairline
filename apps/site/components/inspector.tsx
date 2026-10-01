"use client";

import { useId, useRef, useState } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FIGURES, type FigureId } from "@/lib/figures";
import { snippet, type Theme } from "@/lib/snippets";
import { CopyButton } from "./copy";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };
const THEMES: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * One large figure and its three controls: which figure, how intense, which
 * theme. The snippet under them is the code for what is on screen.
 */
export function Inspector() {
  const [id, setId] = useState<FigureId>("terrain");
  const [intensity, setIntensity] = useState(0.5);
  const [theme, setTheme] = useState<Theme>("auto");
  const [read, setRead] = useState("");
  const slider = useId();
  const code = useRef<HTMLPreElement>(null);
  const doc = FIGURES.find((f) => f.id === id)!;
  const Figure = COMPONENTS[id];
  const text = snippet(doc.name, { intensity, theme });

  return (
    <div className="panel grid gap-px md:grid-cols-[3fr_2fr] [&>*]:min-w-0" data-inspector>
      <div className="stage" data-figure={id} data-dark={theme === "dark" || undefined}>
        <Figure key={id} intensity={intensity} theme={theme} onRead={setRead} />
        <span className="cap" data-read aria-hidden="true">{read}</span>
      </div>
      <div className="grid content-start gap-7 bg-white p-6">
        <fieldset>
          <legend className="label">Figure</legend>
          <div className="flex flex-wrap gap-1.5">
            {FIGURES.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={f.id === id} onClick={() => { setId(f.id); setRead(""); }}>
                {f.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={slider} className="label">intensity</label>
            <output htmlFor={slider} className="font-mono text-[12px] tabular-nums text-muted">{intensity.toFixed(2)}</output>
          </div>
          <input id={slider} type="range" className="slider" min={0} max={1} step={0.05} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} />
          <p className="mt-2 text-[13px] leading-[1.5] text-muted">{doc.stronger}</p>
        </div>
        <fieldset>
          <legend className="label">theme</legend>
          <div className="segmented">
            {THEMES.map((t) => (
              <button key={t.value} type="button" aria-pressed={t.value === theme} onClick={() => setTheme(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="code md:col-span-2" data-snippet>
        <div className="code-bar">
          <span className="code-tab" aria-selected="true">React</span>
          <CopyButton text={text} select={code} />
        </div>
        <pre ref={code} className="code-panel">{text}</pre>
      </div>
    </div>
  );
}
