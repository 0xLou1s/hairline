import { create, type BaseOptions, type Figure } from "./mount";
import { ranges } from "./ranges";
import { mount as explodedEngine } from "./figures/exploded";
import { mount as phosphorEngine } from "./figures/phosphor";
import { mount as riffleEngine } from "./figures/riffle";
import { mount as slowEngine } from "./figures/slow";
import { mount as terrainEngine } from "./figures/terrain";
import { mount as turntableEngine } from "./figures/turntable";

/**
 * @lucasmarkes/hairline — six isometric line figures that answer the pointer.
 *
 * One function per figure. Each takes an element and its own options, draws
 * into the element, and returns `{ update, destroy }`. Each function names
 * its engine itself, so a bundle that imports one figure carries one.
 */

export { ranges, type Range } from "./ranges";
export type { BaseOptions, Figure, Theme } from "./mount";

export type RiffleOptions = BaseOptions & {
  /** The delay between one card and the next as they lean, in ms. 0 to 90. Default 40. */
  stagger?: number;
  /** Shows the bands the pointer is tested against. Default `false`. */
  bands?: boolean;
  /** Names for the eight cards, card 01 first. A named card is read out as `"03 · Dock"`, an unnamed one as `"03"`. */
  labels?: readonly string[];
};

export type TerrainOptions = BaseOptions & {
  /** How far the rise reaches around the pointer, in cells. 1.5 to 5. Default 3. */
  radius?: number;
};

export type ExplodedOptions = BaseOptions & {
  /** The space between two layers when fully open, in viewBox units (the drawing is 400 × 320). 12 to 40. Default 28. */
  gap?: number;
};

export type PhosphorOptions = BaseOptions & {
  /** How long a painted dot takes to fade, in ms. 150 to 1500. Default 520. */
  afterglow?: number;
};

export type SlowOptions = BaseOptions & {
  /** The clock's speed while the pointer is over the figure, as a multiple of normal. 0.05 to 0.6. Default 0.2. */
  rate?: number;
};

export type TurntableOptions = BaseOptions & {
  /** How long a flick keeps the table turning, in ms. 200 to 1500. Default 650. */
  coast?: number;
};

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. */
export function riffle(el: HTMLElement, options?: RiffleOptions): Figure<RiffleOptions> {
  return create({
    id: "riffle",
    label: "A tray of eight cards. Hover or use the arrow keys to pull a card.",
    rest: "rest",
    key: "stagger",
    range: ranges.riffle.stagger,
    engine: riffleEngine,
    focusable: true,
    apply(engine, o) {
      engine.bands(o.bands === true);
      engine.labels(Array.isArray(o.labels) ? o.labels.slice(0, 8).map((s) => (typeof s === "string" ? s : "")) : []);
    },
  }, el, options);
}

/** Eighty-one pillars on a plinth that rise around the pointer. */
export function terrain(el: HTMLElement, options?: TerrainOptions): Figure<TerrainOptions> {
  return create({
    id: "terrain",
    label: "Eighty-one pillars on a plinth that rise around the pointer and rest as a dune with two rises.",
    rest: "rest",
    key: "radius",
    range: ranges.terrain.radius,
    engine: terrainEngine,
  }, el, options);
}

/** An app window in four layers. Moving across opens the gap; moving down picks a layer. */
export function exploded(el: HTMLElement, options?: ExplodedOptions): Figure<ExplodedOptions> {
  return create({
    id: "exploded",
    label: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    rest: "",
    key: "gap",
    range: ranges.exploded.gap,
    engine: explodedEngine,
  }, el, options);
}

/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. */
export function phosphor(el: HTMLElement, options?: PhosphorOptions): Figure<PhosphorOptions> {
  return create({
    id: "phosphor",
    label: "A seven by seven dot matrix on a floating tile that plays a loop, and fades like phosphor where you paint it.",
    rest: "loop",
    key: "afterglow",
    range: ranges.phosphor.afterglow,
    engine: phosphorEngine,
  }, el, options);
}

/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. */
export function slow(el: HTMLElement, options?: SlowOptions): Figure<SlowOptions> {
  return create({
    id: "slow",
    label: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    rest: "rate 1.00×",
    key: "rate",
    range: ranges.slow.rate,
    engine: slowEngine,
  }, el, options);
}

/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. */
export function turntable(el: HTMLElement, options?: TurntableOptions): Figure<TurntableOptions> {
  return create({
    id: "turntable",
    label: "Blocks on a turntable. Flick across it to spin it; it settles on the nearest quarter turn.",
    rest: "az 045° · el 30°",
    key: "coast",
    range: ranges.turntable.coast,
    engine: turntableEngine,
  }, el, options);
}
