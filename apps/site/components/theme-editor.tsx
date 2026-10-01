"use client";

import { useState, type CSSProperties } from "react";
import { themeCss } from "@/lib/snippets";
import { Tile } from "./tile";

type Colors = { plate: string; hi: string; edge: string; mid: string; lo: string };

/** The package's own palettes, and one that is neither. */
const PRESETS: Record<string, Colors> = {
  Light: { plate: "#ffffff", hi: "#232327", edge: "#a4a4ac", mid: "#c3c3c9", lo: "#e0e0e4" },
  Dark: { plate: "#08090a", hi: "#d0d6e0", edge: "#5b5d64", mid: "#3e3e44", lo: "#29292d" },
  Blueprint: { plate: "#0f2f57", hi: "#eaf2ff", edge: "#8fb2e0", mid: "#5b83ba", lo: "#2b4f80" },
};
const KEYS = ["plate", "hi", "edge", "mid", "lo"] as const;

/** The six theme properties, live: change one and the figure and the CSS below both follow. */
export function ThemeEditor() {
  const [colors, setColors] = useState<Colors>(PRESETS.Light);
  const [stroke, setStroke] = useState(0.9);
  const [copied, setCopied] = useState(false);
  const css = themeCss(colors, stroke);
  const style = { background: colors.plate, "--hairline-stroke": stroke, ...Object.fromEntries(KEYS.map((k) => [`--hairline-${k}`, colors[k]])) } as CSSProperties;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // no clipboard permission: the text is still selectable
    }
  };

  return (
    <div className="grid items-start gap-6 md:grid-cols-2 [&>*]:min-w-0">
      <Tile id="exploded" index={3} name="Exploded" style={style} />
      <div className="grid gap-4 [&>*]:min-w-0">
        <div className="flex gap-2">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button key={name} type="button" className="chip" aria-pressed={KEYS.every((k) => colors[k] === preset[k])} onClick={() => setColors(preset)}>
              {name}
            </button>
          ))}
        </div>
        <div className="grid gap-2 font-mono text-[13px]">
          {KEYS.map((key) => (
            <label key={key} className="flex items-center gap-3">
              <input type="color" className="swatch" value={colors[key]} onChange={(event) => setColors({ ...colors, [key]: event.target.value })} />
              <span className="text-ink">--hairline-{key}</span>
              <span className="ml-auto text-muted">{colors[key]}</span>
            </label>
          ))}
          <label className="flex items-center gap-3">
            <span className="text-ink">--hairline-stroke</span>
            <input type="range" className="slider" min={0.5} max={2} step={0.1} value={stroke} onChange={(event) => setStroke(Number(event.target.value))} />
            <span className="w-8 text-right text-muted">{stroke}</span>
          </label>
        </div>
        <div className="code">
          <div className="code-bar">
            <span className="code-tab" aria-selected="true">CSS</span>
            <button type="button" onClick={copy} className="code-copy" aria-live="polite">{copied ? "Copied" : "Copy"}</button>
          </div>
          <pre className="code-panel" data-theme-css>{css}</pre>
        </div>
      </div>
    </div>
  );
}
