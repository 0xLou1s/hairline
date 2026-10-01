"use client";

import { useId, useState } from "react";
import type { Range } from "@lucasmarkes/hairline";
import { shown, type FigureId } from "@/lib/figures";
import { Tabs, type Tab } from "./tabs";
import { Tile } from "./tile";

/** A figure, the slider for its option, and the code that follows the slider. */
export function FigureDemo({ id, index, name, option, range, tabs }: { id: FigureId; index: number; name: string; option: string; range: Range; tabs: Tab[] }) {
  const [value, setValue] = useState(range.default);
  const slider = useId();
  return (
    <div className="grid items-start gap-6 md:grid-cols-2 [&>*]:min-w-0">
      <Tile id={id} index={index} name={name} options={{ [option]: value }} />
      <div className="grid gap-4 [&>*]:min-w-0">
        <div className="flex items-center gap-4 font-mono text-[13px]">
          <label htmlFor={slider} className="w-20 text-ink">{option}</label>
          <input id={slider} type="range" className="slider" min={range.min} max={range.max} step={range.step} value={value} onChange={(event) => setValue(Number(event.target.value))} />
          <output htmlFor={slider} className="w-20 text-right text-muted">{shown(value, range)}</output>
        </div>
        <Tabs tabs={tabs} label={`${name} code`} live={String(value)} />
      </div>
    </div>
  );
}
