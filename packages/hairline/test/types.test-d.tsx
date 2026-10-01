/**
 * Type tests. Nothing here runs: `pnpm typecheck` compiles this file, and an
 * `@ts-expect-error` line fails the build if the line below it stops being
 * an error. Vitest does not pick it up (it is not a `.test.` file).
 */
import { createRef } from "react";
import { exploded, ranges, riffle, slow, terrain, type Figure, type RiffleOptions } from "../src/index";
import { Riffle, Terrain, Turntable, type RiffleProps } from "../src/react";

declare const el: HTMLElement;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const yes = <T extends true>() => {};

/* each figure takes its own option and no other's */
riffle(el, { stagger: 60, bands: true, labels: ["a", "b"], theme: "dark", label: "Cards", onRead: (t: string) => t });
terrain(el, { radius: 4 });
riffle(el);
// @ts-expect-error radius is Terrain's
riffle(el, { radius: 4 });
// @ts-expect-error stagger is Riffle's
terrain(el, { stagger: 60 });
// @ts-expect-error a number, not a string
slow(el, { rate: "0.4" });
// @ts-expect-error not a theme
exploded(el, { theme: "sepia" });
// @ts-expect-error the element is required
riffle();

/* the handle */
const f = riffle(el);
yes<Equal<typeof f, Figure<RiffleOptions>>>();
f.update({ stagger: undefined, labels: ["a"] as const });
f.destroy();
// @ts-expect-error update takes Riffle's options
f.update({ radius: 4 });
/* ranges is literal, so a slider built from it is typed */
yes<Equal<(typeof ranges)["riffle"]["stagger"]["default"], 40>>();
yes<Equal<keyof typeof ranges, "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable">>();
// @ts-expect-error read-only
ranges.riffle.stagger.max = 100;

/* components: the options, plus what a div takes */
const ref = createRef<HTMLDivElement>();
<Riffle ref={ref} stagger={60} bands labels={["a"]} className="w-80" id="cards" onClick={() => {}} onRead={(text) => text.length} />;
<Terrain radius={4} style={{ width: 320 }} aria-label="Dunes" data-x="1" />;
<Turntable />;
// @ts-expect-error radius is Terrain's
<Riffle radius={4} />;
// @ts-expect-error a number, not a string
<Terrain radius="4" />;
// @ts-expect-error a figure has no children
<Riffle>text</Riffle>;
// @ts-expect-error the ref is to a div
<Riffle ref={createRef<HTMLSpanElement>()} />;
const props: RiffleProps = { stagger: 60, className: "w-80" };
void props;
