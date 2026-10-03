import { create, type Figure, type HairlineOptions } from "./mount";
import { mount as branchesEngine } from "./figures/branches";
import { mount as cabinetEngine } from "./figures/cabinet";
import { mount as elevatorEngine } from "./figures/elevator";
import { mount as explodedEngine } from "./figures/exploded";
import { mount as keyboardEngine } from "./figures/keyboard";
import { mount as laptopEngine } from "./figures/laptop";
import { mount as lockersEngine } from "./figures/lockers";
import { mount as padlockEngine } from "./figures/padlock";
import { mount as phoneEngine } from "./figures/phone";
import { mount as phosphorEngine } from "./figures/phosphor";
import { mount as riffleEngine } from "./figures/riffle";
import { mount as slowEngine } from "./figures/slow";
import { mount as terminalEngine } from "./figures/terminal";
import { mount as terrainEngine } from "./figures/terrain";
import { mount as turntableEngine } from "./figures/turntable";
import { mount as vaultEngine } from "./figures/vault";

/**
 * @lucasmarkes/hairline — sixteen isometric line figures that answer the pointer.
 *
 * One function per figure. Each takes an element and the same options, draws
 * into the element, and returns `{ update, destroy }`. Each function names
 * its engine itself, so a bundle that imports one figure carries one.
 */

export type { Figure, HairlineOptions } from "./mount";

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. `intensity` spreads the ripple further from the pulled card. */
export function riffle(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "riffle",
    label: "A tray of eight cards. Hover or use the arrow keys to pull a card.",
    rest: "rest",
    engine: riffleEngine,
    focusable: true,
  }, el, options);
}

/** Eighty-one pillars on a plinth that rise around the pointer. `intensity` widens the area that rises. */
export function terrain(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "terrain",
    label: "Eighty-one pillars on a plinth that rise around the pointer and rest as a dune with two rises.",
    rest: "rest",
    engine: terrainEngine,
  }, el, options);
}

/** An app window in four layers. Moving across opens the gap; moving down picks a layer. `intensity` opens the layers further. */
export function exploded(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "exploded",
    label: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    rest: "",
    engine: explodedEngine,
  }, el, options);
}

/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. `intensity` makes the trail linger longer. */
export function phosphor(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "phosphor",
    label: "A seven by seven dot matrix on a floating tile that plays a loop, and fades like phosphor where you paint it.",
    rest: "loop",
    engine: phosphorEngine,
  }, el, options);
}

/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. `intensity` slows it more. */
export function slow(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "slow",
    label: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    rest: "rate 1.00×",
    engine: slowEngine,
  }, el, options);
}

/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. `intensity` makes the spin coast longer. */
export function turntable(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "turntable",
    label: "Blocks on a turntable. Flick across it to spin it; it settles on the nearest quarter turn.",
    rest: "az 045° · el 30°",
    engine: turntableEngine,
  }, el, options);
}

/** A sixty-key board. The key under the pointer sinks, and its neighbours follow it down, less the further away. `intensity` widens how far the press reaches. */
export function keyboard(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "keyboard",
    label: "A sixty-key board. The key under the pointer sinks, and its neighbours follow it down, less the further away.",
    rest: "rest",
    engine: keyboardEngine,
  }, el, options);
}

/** Four floors beside an open shaft. The pointer's height picks a floor, and the car travels there through the ones between. `intensity` makes the car travel faster. */
export function elevator(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "elevator",
    label: "Four floors beside an open shaft. The pointer's height picks a floor, and the car travels there through the ones between.",
    rest: "rest",
    engine: elevatorEngine,
  }, el, options);
}

/** A phone in layers: glass, board, battery, shell. Moving across opens the gap; moving down picks a layer. `intensity` opens the layers further. */
export function phone(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "phone",
    label: "A phone in layers: glass, board, battery, shell. Moving across opens the gap; moving down picks a layer.",
    rest: "rest",
    engine: phoneEngine,
  }, el, options);
}

/** A thin laptop: the pointer's height sets how far the lid stands open, and the lid follows it on a spring. `intensity` lets the lid open wider. */
export function laptop(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "laptop",
    label: "A thin laptop: the pointer's height sets how far the lid stands open, and the lid follows it on a spring.",
    rest: "rest",
    engine: laptopEngine,
  }, el, options);
}

/** A terminal window: the pointer's height scrolls back through its history, and the line under it lifts off the screen. `intensity` spreads the lift over more lines. */
export function terminal(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "terminal",
    label: "A terminal window: the pointer's height scrolls back through its history, and the line under it lifts off the screen.",
    rest: "rest",
    engine: terminalEngine,
  }, el, options);
}

/** A rack of twelve blades: the pointer's height pulls the nearest ones out on their rails, the farther the less. `intensity` pulls out more blades. */
export function cabinet(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "cabinet",
    label: "A rack of twelve blades: the pointer's height pulls the nearest ones out on their rails, the farther the less.",
    rest: "rest",
    engine: cabinetEngine,
  }, el, options);
}

/** A commit graph on a board: the commit under the pointer rises, and its history rises after it, the farther back the less. `intensity` raises more of the history. */
export function branches(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "branches",
    label: "A commit graph on a board: the commit under the pointer rises, and its history rises after it, the farther back the less.",
    rest: "rest",
    engine: branchesEngine,
  }, el, options);
}

/** A vault door: circling the pointer turns its dial, which coasts and catches every ten; on forty its three bolts draw back. `intensity` lets the dial coast longer. */
export function vault(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "vault",
    label: "A vault door: circling the pointer turns its dial, which coasts and catches every ten; on forty its three bolts draw back.",
    rest: "rest",
    engine: vaultEngine,
  }, el, options);
}

/** A bank of twelve lockers, one ajar at rest: the locker under the pointer opens, and the one open before it swings shut. `intensity` opens the door wider. */
export function lockers(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "lockers",
    label: "A bank of twelve lockers, one ajar at rest: the locker under the pointer opens, and the one open before it swings shut.",
    rest: "rest",
    engine: lockersEngine,
  }, el, options);
}

/** A padlock: as the pointer nears, the shackle springs up out of the body and swings open about its long leg. `intensity` swings the shackle further. */
export function padlock(el: HTMLElement, options?: HairlineOptions): Figure {
  return create({
    id: "padlock",
    label: "A padlock: as the pointer nears, the shackle springs up out of the body and swings open about its long leg.",
    rest: "rest",
    engine: padlockEngine,
  }, el, options);
}
