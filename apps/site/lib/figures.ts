/**
 * The page's copy about each figure, and the options every figure takes.
 *
 * INTENSITY copies the table in packages/hairline/src/intensity.ts, which the
 * package keeps internal. test/docs.test.ts holds the two equal, so /llms.txt
 * cannot describe a map the figures do not use.
 */

import { spell } from "./words";

export type FigureId = "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable" | "keyboard" | "elevator" | "phone" | "laptop" | "terminal" | "cabinet" | "branches" | "vault" | "lockers" | "padlock" | "patch" | "dish" | "router" | "loupe" | "sieve" | "rail" | "plug" | "query" | "drawer" | "basket" | "plot";

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
  {
    id: "keyboard",
    name: "Keyboard",
    summary: "Sixty keys in a block. The key under the pointer sinks and its neighbours follow it down, less the further away.",
    stronger: "A wider patch of keys sinks.",
    parameter: { name: "radius", unit: "keys" },
  },
  {
    id: "elevator",
    name: "Elevator",
    summary: "Four floors with the shaft open and the car inside. The pointer's height picks the floor; the car travels there.",
    stronger: "The car travels faster between floors.",
    parameter: { name: "stiffness", unit: "spring units" },
  },
  {
    id: "phone",
    name: "Phone",
    summary: "A phone in layers: glass, board, battery, shell. Moving across opens the gap; moving down picks a layer.",
    stronger: "The layers open further.",
    parameter: { name: "gap", unit: "viewBox units" },
  },
  {
    id: "laptop",
    name: "Laptop",
    summary: "A thin laptop, open on its hinge. The pointer's height sets the lid; it follows on a spring.",
    stronger: "The lid opens wider.",
    parameter: { name: "lid", unit: "degrees" },
  },
  {
    id: "terminal",
    name: "Terminal",
    summary: "A terminal window with its history in rows. The pointer's height scrolls back; the line under it lifts and its neighbours follow.",
    stronger: "The lift spreads further.",
    parameter: { name: "spread", unit: "lines" },
  },
  {
    id: "cabinet",
    name: "Cabinet",
    summary: "A rack of twelve blades, a few half out. The pointer's height pulls the nearest ones out, the farther the less.",
    stronger: "More blades come out.",
    parameter: { name: "reach", unit: "blades" },
  },
  {
    id: "branches",
    name: "Branches",
    summary: "A commit graph with a branch forking off main and merging back. The commit under the pointer rises, and its history rises after it.",
    stronger: "More of the history rises.",
    parameter: { name: "reach", unit: "commits" },
  },
  {
    id: "vault",
    name: "Vault",
    summary: "A vault door with a dial and three bolts. The pointer turns the dial; detents catch every ten, and on the combination the bolts draw back.",
    stronger: "The dial coasts longer.",
    parameter: { name: "coast", unit: "ms" },
  },
  {
    id: "lockers",
    name: "Lockers",
    summary: "A bank of twelve lockers, one ajar at rest. The locker under the pointer opens; the one at rest closes.",
    stronger: "The door opens wider.",
    parameter: { name: "opening", unit: "degrees" },
  },
  {
    id: "padlock",
    name: "Padlock",
    summary: "A padlock with its shackle in. As the pointer comes near the shackle lifts out and swings open.",
    stronger: "The shackle swings further.",
    parameter: { name: "swing", unit: "degrees" },
  },
  {
    id: "patch",
    name: "Patch",
    summary: "A patch panel of twenty-four ports with cables. The cable under the pointer lifts and its neighbours lean away.",
    stronger: "The lean spreads further.",
    parameter: { name: "radius", unit: "ports" },
  },
  {
    id: "dish",
    name: "Dish",
    summary: "A parabolic dish on a two-axis gimbal. The pointer aims the dish; it follows on a spring.",
    stronger: "The dish swings further.",
    parameter: { name: "reach", unit: "degrees" },
  },
  {
    id: "router",
    name: "Router",
    summary: "A router with its antennas up. Each antenna leans toward the pointer, the nearest most.",
    stronger: "The lean spreads further.",
    parameter: { name: "spread", unit: "antennas" },
  },
  {
    id: "loupe",
    name: "Loupe",
    summary: "A stand loupe on a blank ruled sheet. The pointer drags it across; the rules pass enlarged under the glass, with nothing between them.",
    stronger: "The glass magnifies more.",
    parameter: { name: "magnification", unit: "×" },
  },
  {
    id: "sieve",
    name: "Sieve",
    summary: "Three test sieves stacked over a pan. The pointer's height picks one; it rises clear of the stack, and every mesh is bare.",
    stronger: "The gap opens further.",
    parameter: { name: "gap", unit: "viewBox units" },
  },
  {
    id: "rail",
    name: "Rail",
    summary: "A garment rail with seven bare hangers. The pointer brushes them; each rocks away, the nearest most, and settles.",
    stronger: "The brush reaches more hangers.",
    parameter: { name: "radius", unit: "hangers" },
  },
  {
    id: "plug",
    name: "Plug",
    summary: "A wall socket, and a plug lying on the floor at the end of its cord. The pointer draws the plug up toward the socket; it stops short, and falls back.",
    stronger: "The plug comes closer to the socket.",
    parameter: { name: "pull", unit: "of the way" },
  },
  {
    id: "query",
    name: "Query",
    summary: "A question mark built as a bent bar over a loose ball. The hook turns toward the pointer, and the ball rolls after it.",
    stronger: "The hook turns further.",
    parameter: { name: "turn", unit: "degrees" },
  },
  {
    id: "drawer",
    name: "Drawer",
    summary: "A cabinet of three drawers. The pointer's height picks one; it slides out and shows two dividers with nothing between them.",
    stronger: "The drawer opens further.",
    parameter: { name: "pull", unit: "viewBox units" },
  },
  {
    id: "basket",
    name: "Basket",
    summary: "A wire basket under a bail handle. It tilts toward the pointer and shows its bare floor; the handle swings after it.",
    stronger: "The basket tilts further.",
    parameter: { name: "tilt", unit: "degrees" },
  },
  {
    id: "plot",
    name: "Plot",
    summary: "A bar chart with seven flat tabs where the bars would stand. The pointer brushes them; each lifts a little and drops back to zero.",
    stronger: "The tabs lift higher.",
    parameter: { name: "lift", unit: "viewBox units" },
  },
];

/** How many figures the package has, as the prose writes it: "twenty-seven". */
export const COUNT = spell(FIGURES.length);

/** Each figure's number at intensity 0, 0.5 and 1: a copy of the package's table. */
export const INTENSITY: Record<FigureId, readonly [number, number, number]> = {
  riffle: [0, 40, 90],
  terrain: [1.5, 3, 5],
  exploded: [12, 28, 40],
  phosphor: [150, 520, 1500],
  slow: [0.6, 0.2, 0.05],
  turntable: [200, 650, 1500],
  keyboard: [1, 2, 3.5],
  elevator: [40, 100, 220],
  phone: [16, 28, 40],
  laptop: [100, 125, 150],
  terminal: [1, 2, 3.5],
  cabinet: [1.5, 3, 5],
  branches: [1, 3, 6],
  vault: [250, 600, 1500],
  lockers: [55, 90, 120],
  padlock: [45, 90, 100],
  patch: [1, 2.5, 5],
  dish: [30, 50, 70],
  router: [0.5, 1.5, 3],
  loupe: [1.3, 1.8, 2.6],
  sieve: [6, 14, 24],
  rail: [1, 2, 3.5],
  plug: [0.35, 0.6, 0.9],
  query: [20, 40, 55],
  drawer: [12, 22, 34],
  basket: [8, 16, 28],
  plot: [3, 6, 12],
};

/** A number with its unit, as the docs' table and /llms.txt write it: "40 ms", "0.2× normal speed". */
export function measure(value: number, unit: string): string {
  return `${value}${unit.startsWith("×") ? "" : " "}${unit}`;
}

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

export const LINKS = {
  github: "https://github.com/lucasmarkes/hairline",
  npm: "https://www.npmjs.com/package/@lucasmarkes/hairline",
  essay: "https://lucasmarkes.com/lab/hairline",
  linear: "https://linear.app",
  author: "https://lucasmarkes.com",
  x: "https://x.com/lucasmarkes__",
} as const;
