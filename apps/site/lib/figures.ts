import { ranges, type Range } from "@lucasmarkes/hairline";

/**
 * The page's copy about each figure. Everything numeric comes from the
 * package's own `ranges`, so a slider, a props table and /llms.txt cannot
 * disagree with what the figure does.
 */

export type FigureId = keyof typeof ranges;

export type FigureDoc = {
  id: FigureId;
  /** The React component, and the figure's name on the page. */
  name: string;
  /** The figure's one numeric option. */
  option: string;
  range: Range;
  summary: string;
  optionDoc: string;
};

const COPY: Record<FigureId, { name: string; summary: string; optionDoc: string }> = {
  riffle: {
    name: "Riffle",
    summary: "A tray of eight cards. The card under the pointer stands up and its neighbours lean after it. The arrow keys walk the cards.",
    optionDoc: "The delay between one card and the next as they lean.",
  },
  terrain: {
    name: "Terrain",
    summary: "Eighty-one pillars on a plinth. They rise around the pointer and settle back into a dune with two rises.",
    optionDoc: "How far the rise reaches around the pointer.",
  },
  exploded: {
    name: "Exploded",
    summary: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    optionDoc: "The space between two layers when fully open, in viewBox units (the drawing is 400 × 320).",
  },
  phosphor: {
    name: "Phosphor",
    summary: "A seven by seven dot matrix playing a loop. Where the pointer paints, the dots fade like phosphor.",
    optionDoc: "How long a painted dot takes to fade.",
  },
  slow: {
    name: "Slow",
    summary: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    optionDoc: "The clock's speed while the pointer is over the figure, as a multiple of normal.",
  },
  turntable: {
    name: "Turntable",
    summary: "Blocks on a turntable. A flick across it spins it, and it settles on the nearest quarter turn.",
    optionDoc: "How long a flick keeps the table turning.",
  },
};

export const FIGURES: FigureDoc[] = (Object.keys(ranges) as FigureId[]).map((id) => {
  const [option, range] = Object.entries(ranges[id])[0] as [string, Range];
  return { id, option, range, ...COPY[id] };
});

/** Names for Riffle's eight cards on this page. */
export const CARDS = ["Radial menu", "Drum", "Dock", "Condense", "Settle", "Upload", "Badge", "Spark"] as const;

/** "0 to 90 ms", "0.05× to 0.6×", "12 to 40 units" */
export function span(range: Range): string {
  if (range.unit === "×") return `${range.min}× to ${range.max}×`;
  return `${range.min} to ${range.max} ${range.unit === "u" ? "units" : range.unit}`;
}

/** A value as the page shows it next to a slider: "40 ms", "0.2×" */
export function shown(value: number, range: Range): string {
  return range.unit === "×" ? `${value}×` : `${value} ${range.unit}`;
}

export type Row = { name: string; type: string; default: string; description: string };

/** A figure's own options, the numeric one first. */
export function rows(doc: FigureDoc): Row[] {
  const out: Row[] = [
    { name: doc.option, type: "number", default: String(doc.range.default), description: `${doc.optionDoc} ${span(doc.range)}.` },
  ];
  if (doc.id === "riffle") {
    out.push(
      { name: "bands", type: "boolean", default: "false", description: "Shows the bands the pointer is tested against." },
      { name: "labels", type: "readonly string[]", default: "[]", description: "Names for the eight cards, card 01 first. A named card is read out as \"03 · Dock\", an unnamed one as \"03\"." },
    );
  }
  return out;
}

/** The options every figure takes. */
export const SHARED: Row[] = [
  { name: "theme", type: "\"auto\" | \"light\" | \"dark\"", default: "\"auto\"", description: "\"auto\" follows the page: an ancestor with class dark or data-theme=\"dark\", then the page's color-scheme." },
  { name: "label", type: "string", default: "a description in English", description: "The accessible name. In React, aria-label does the same." },
  { name: "onRead", type: "(text: string) => void", default: "", description: "The figure's caption, each time it changes. Called once at mount with the rest caption." },
];

/** The public theme: six custom properties, set on the figure or on anything above it. */
export const THEME: { property: string; role: string }[] = [
  { property: "--hairline-plate", role: "The fill of every plate. It hides what is drawn behind, so it must be the colour the figure sits on." },
  { property: "--hairline-hi", role: "The stroke of what is lit: the card pulled, the layer picked, a dot that is on." },
  { property: "--hairline-edge", role: "Silhouettes, and dots at half strength." },
  { property: "--hairline-mid", role: "Every other stroke." },
  { property: "--hairline-lo", role: "What recedes: guides, and dots that are off." },
  { property: "--hairline-stroke", role: "The stroke width, in CSS pixels at any size. Default 0.9." },
];

export const NOTES: { title: string; body: string }[] = [
  { title: "Accessibility", body: "A figure is an image with a description you can replace with label. Riffle is the exception: it is a focusable group, the arrow keys walk its cards, and a live region reads the card out." },
  { title: "Reduced motion", body: "With prefers-reduced-motion, the figures that play on their own (Phosphor and Slow) hold still, and every figure still answers the pointer." },
  { title: "Performance", body: "Every figure on a page shares one requestAnimationFrame loop. A figure off screen, or at rest, does no work, and the loop stops when nothing is moving." },
  { title: "Server rendering", body: "On the server a figure is an empty box with a 5:4 aspect ratio, so nothing shifts when it draws. The drawing itself happens in the browser." },
  { title: "Size", body: "No dependencies. A bundle that imports one figure carries one figure." },
];

export const LINKS = {
  github: "https://github.com/lucasmarkes/hairline",
  npm: "https://www.npmjs.com/package/@lucasmarkes/hairline",
  essay: "https://lucasmarkes.com/lab/hairline",
  linear: "https://linear.app",
} as const;
