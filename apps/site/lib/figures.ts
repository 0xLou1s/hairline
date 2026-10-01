/**
 * The page's copy about each figure, and the options every figure takes.
 *
 * INTENSITY copies the table in packages/hairline/src/intensity.ts, which the
 * package keeps internal. test/docs.test.ts holds the two equal, so /llms.txt
 * cannot describe a map the figures do not use.
 */

export type FigureId = "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable";

export type FigureDoc = {
  id: FigureId;
  /** The React component, and the figure's name on the page. */
  name: string;
  summary: string;
  /** What a higher intensity does to this figure, as one sentence. */
  stronger: string;
  /** The number intensity sets inside the figure, for /llms.txt. */
  parameter: { name: string; unit: string };
};

export const FIGURES: FigureDoc[] = [
  {
    id: "riffle",
    name: "Riffle",
    summary: "A tray of eight cards. The card under the pointer stands up and its neighbours lean after it. The arrow keys walk the cards.",
    stronger: "The ripple spreads further from the pulled card.",
    parameter: { name: "stagger", unit: "ms" },
  },
  {
    id: "terrain",
    name: "Terrain",
    summary: "Eighty-one pillars on a plinth. They rise around the pointer and settle back into a dune with two rises.",
    stronger: "A wider area rises.",
    parameter: { name: "radius", unit: "cells" },
  },
  {
    id: "exploded",
    name: "Exploded",
    summary: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    stronger: "The layers open further.",
    parameter: { name: "gap", unit: "viewBox units" },
  },
  {
    id: "phosphor",
    name: "Phosphor",
    summary: "A seven by seven dot matrix playing a loop. Where the pointer paints, the dots fade like phosphor.",
    stronger: "The trail lingers longer.",
    parameter: { name: "afterglow", unit: "ms" },
  },
  {
    id: "slow",
    name: "Slow",
    summary: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    stronger: "Time slows down more.",
    parameter: { name: "rate", unit: "× normal speed" },
  },
  {
    id: "turntable",
    name: "Turntable",
    summary: "Blocks on a turntable. A flick across it spins it, and it settles on the nearest quarter turn.",
    stronger: "The spin coasts longer.",
    parameter: { name: "coast", unit: "ms" },
  },
];

/** Each figure's number at intensity 0, 0.5 and 1: a copy of the package's table. */
export const INTENSITY: Record<FigureId, readonly [number, number, number]> = {
  riffle: [0, 40, 90],
  terrain: [1.5, 3, 5],
  exploded: [12, 28, 40],
  phosphor: [150, 520, 1500],
  slow: [0.6, 0.2, 0.05],
  turntable: [200, 650, 1500],
};

export type Row = { name: string; type: string; default: string; description: string };

/** The options every figure takes: the whole API, in the quickstart's table. */
export const OPTIONS: Row[] = [
  { name: "intensity", type: "number", default: "0.5", description: "How strongly the figure answers the pointer, from 0 (subtle) to 1 (strong). Outside 0…1 is clamped; anything that is not a number is 0.5." },
  { name: "theme", type: "\"auto\" | \"light\" | \"dark\"", default: "\"auto\"", description: "\"auto\" follows the page: an ancestor with class dark or data-theme=\"dark\", then the page's color-scheme." },
  { name: "label", type: "string", default: "a description", description: "The accessible name. In React, aria-label does the same." },
  { name: "onRead", type: "(text: string) => void", default: "", description: "The figure's caption, each time it changes. Called once at mount with the rest caption." },
];

/** The public theme: six custom properties, set on the figure or on anything above it. */
export const THEME: { property: string; light: string; role: string }[] = [
  { property: "--hairline-plate", light: "#ffffff", role: "The fill of every plate. It hides what is drawn behind, so it must be the colour the figure sits on." },
  { property: "--hairline-hi", light: "#232327", role: "The stroke of what is lit: the card pulled, the layer picked, a dot that is on." },
  { property: "--hairline-edge", light: "#a4a4ac", role: "Silhouettes, and dots at half strength." },
  { property: "--hairline-mid", light: "#c3c3c9", role: "Every other stroke." },
  { property: "--hairline-lo", light: "#e0e0e4", role: "What recedes: guides, and dots that are off." },
  { property: "--hairline-stroke", light: "0.9", role: "The stroke width, in CSS pixels at any size." },
];

/** The four cards under the figures. Tiny's body is the measured size; see lib/size.ts. */
export const CARDS: { title: string; body: string }[] = [
  { title: "Tiny", body: "gzipped, all six figures. A bundle that imports one carries one." },
  { title: "No dependencies", body: "SVG and one shared animation frame. React is optional." },
  { title: "Accessible", body: "Keyboard on Riffle, a description for screen readers, and stillness under reduced motion." },
  { title: "Themeable", body: "Six CSS variables, on the figure or anything above it. Light and dark built in." },
];

export const LINKS = {
  github: "https://github.com/lucasmarkes/hairline",
  npm: "https://www.npmjs.com/package/@lucasmarkes/hairline",
  essay: "https://lucasmarkes.com/lab/hairline",
  linear: "https://linear.app",
} as const;
