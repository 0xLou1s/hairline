"use client";

import { useState, type ComponentType, type CSSProperties } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { CARDS, type FigureId } from "@/lib/figures";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

/** A live figure on a white tile, with its number, its name and its caption in the corners. */
export function Tile({ id, index, name, options, style }: { id: FigureId; index: number; name: string; options?: Record<string, unknown>; style?: CSSProperties }) {
  const [read, setRead] = useState("");
  const Figure = COMPONENTS[id] as unknown as ComponentType<Record<string, unknown>>;
  return (
    <div className="tile" style={style} data-figure={id}>
      <Figure {...(id === "riffle" ? { labels: CARDS } : null)} {...options} onRead={setRead} />
      <span className="cap left-4 top-3">Fig. {index}</span>
      <span className="cap right-4 top-3">{name}</span>
      <span className="cap bottom-3 left-4" data-read aria-hidden="true">{read}</span>
    </div>
  );
}
