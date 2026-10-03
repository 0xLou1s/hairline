/**
 * Type tests. Nothing here runs: `pnpm typecheck` compiles this file, and an
 * `@ts-expect-error` line fails the build if the line below it stops being
 * an error. Vitest does not pick it up (it is not a `.test.` file).
 */
import { createRef } from "react";
import { exploded, keyboard, phosphor, riffle, slow, terrain, turntable, type Figure, type HairlineOptions } from "../src/index";
import * as vanilla from "../src/index";
import * as components from "../src/react";
import { Exploded, Keyboard, Phosphor, Riffle, Slow, Terrain, Turntable, type HairlineProps } from "../src/react";

declare const el: HTMLElement;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const yes = <T extends true>() => {};

/* every figure takes the same options */
riffle(el, { intensity: 0.8, theme: "dark", label: "Cards", onRead: (t: string) => t });
riffle(el);
for (const mount of [riffle, terrain, exploded, phosphor, slow, turntable, keyboard]) {
  yes<Equal<typeof mount, (el: HTMLElement, options?: HairlineOptions) => Figure>>();
  // @ts-expect-error the old per-figure options are gone
  mount(el, { stagger: 60 });
  // @ts-expect-error the old per-figure options are gone
  mount(el, { radius: 3 });
  // @ts-expect-error Riffle's bands are gone
  mount(el, { bands: true });
  // @ts-expect-error Riffle's names are gone
  mount(el, { labels: [] });
}
// @ts-expect-error a number, not a string
slow(el, { intensity: "0.8" });
// @ts-expect-error not a theme
exploded(el, { theme: "sepia" });
// @ts-expect-error the element is required
riffle();
yes<Equal<keyof HairlineOptions, "intensity" | "theme" | "label" | "onRead">>();

/* the handle */
const f = riffle(el);
yes<Equal<typeof f, Figure>>();
f.update({ intensity: undefined, theme: "light" });
f.destroy();
// @ts-expect-error update takes the same options
f.update({ stagger: 60 });
// @ts-expect-error update takes the same options
f.update({ bands: true });

/* the entries export the functions, the components and three types, and nothing of the old API */
yes<Equal<keyof typeof vanilla, "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable" | "keyboard">>();
yes<Equal<keyof typeof components, "Riffle" | "Terrain" | "Exploded" | "Phosphor" | "Slow" | "Turntable" | "Keyboard">>();
// @ts-expect-error ranges is gone
void vanilla.ranges;
// @ts-expect-error the per-figure option types are gone
type Old = import("../src/index").RiffleOptions;
// @ts-expect-error the per-figure props types are gone
type OldProps = import("../src/react").RiffleProps;

/* components: the options, plus what a div takes */
const ref = createRef<HTMLDivElement>();
<Riffle ref={ref} intensity={0.8} theme="dark" className="w-80" id="cards" onClick={() => {}} onRead={(text) => text.length} />;
<Terrain style={{ width: 320 }} aria-label="Dunes" data-x="1" />;
<Riffle />;
for (const C of [Riffle, Terrain, Exploded, Phosphor, Slow, Turntable, Keyboard]) {
  // @ts-expect-error the old per-figure options are gone
  <C stagger={60} />;
  // @ts-expect-error the old per-figure options are gone
  <C radius={3} />;
  // @ts-expect-error Riffle's bands are gone
  <C bands />;
  // @ts-expect-error Riffle's names are gone
  <C labels={[]} />;
}
// @ts-expect-error a number, not a string
<Terrain intensity="0.8" />;
// @ts-expect-error a figure has no children
<Riffle>text</Riffle>;
// @ts-expect-error the ref is to a div
<Riffle ref={createRef<HTMLSpanElement>()} />;
const props: HairlineProps = { intensity: 0.8, className: "w-80" };
void props;
