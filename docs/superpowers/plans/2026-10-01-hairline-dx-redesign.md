# Hairline: one prop, and a site that leads with the install — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six per-figure options with one `intensity` option, take the names and hit bands out of Riffle, and rebuild the site in cuelume's structure: install first, a live inspector, then a two-step quickstart.

**Architecture:** One internal module, `packages/hairline/src/intensity.ts`, turns `intensity` (0…1) into each figure's own parameter through a table of three points per figure. Every figure takes one options type, `HairlineOptions`, in both entries. The site keeps a copy of the table that a unit test holds equal to the package's, and builds one page from small client components (install pill, inspector, copy button) around statically rendered copy.

**Tech Stack:** pnpm 10.20 workspace with Turborepo 2, TypeScript 5.9 strict, Node 22. Package: tsup (ESM), Vitest 5 with jsdom, Playwright 1.63 on installed Chrome (`channel: "chrome"`). Site: Next.js 16 (App Router, Turbopack, static prerender), React 19, Tailwind 4, Geist, Geist Mono and Instrument Serif through `next/font/google`, Shiki at build.

**Spec:** `docs/superpowers/specs/2026-10-01-hairline-dx-redesign-design.md`, an amendment to `docs/superpowers/specs/2026-10-01-hairline-package-design.md`. Where the amendment speaks to a topic it replaces the base spec; everything else in the base spec stands. This plan sits between Task 14 Step 6 and Task 14 Step 7 of `docs/superpowers/plans/2026-10-01-hairline-package.md`, which resumes after its last task.

## Global Constraints

- All work is on the branch `site-on-vercel` of `~/estudos/hairline` (PR #1). Every command runs from the repository root unless a step says otherwise.
- Nothing is pushed before Task 7. The site does not typecheck or build from Task 2 until Task 6 (it imports `ranges` and the old option names); that is expected, and only the package's gates must be green in Tasks 1 to 4.
- The figures look exactly as they do today at the default. The parity goldens in `packages/hairline/test/parity/golden/` are never captured again: do not run `pnpm --filter @lucasmarkes/hairline capture`.
- The `intensity` map, verbatim from the spec: two straight lines that meet at 0.5, rounded to three decimal places.

  | Figure | Parameter (internal) | 0 | 0.5 | 1 |
  | --- | --- | --- | --- | --- |
  | Riffle | stagger (ms) | 0 | 40 | 90 |
  | Terrain | radius (cells) | 1.5 | 3 | 5 |
  | Exploded | gap (viewBox units) | 12 | 28 | 40 |
  | Phosphor | afterglow (ms) | 150 | 520 | 1500 |
  | Slow | rate (× normal speed) | 0.6 | 0.2 | 0.05 |
  | Turntable | coast (ms) | 200 | 650 | 1500 |

- Values `intensity` accepts: a finite number is clamped to 0…1; a numeric string is read as a number; anything else (`undefined`, `NaN`, `Infinity`, `""`, an object) is 0.5. `update({ intensity: undefined })` goes back to 0.5, and a key left out of `update` keeps its value.
- The public API is exactly: from `@lucasmarkes/hairline`, the six functions and the types `HairlineOptions` and `Figure`; from `@lucasmarkes/hairline/react`, the six components and the type `HairlineProps`. `src/intensity.ts` is exported from neither.
- Riffle's caption and live region carry the card's number only (`"03"`, `"rest"`). Selection does not change.
- The site's copy is in English. No tile carries "Fig. N". The inspector's snippet shows only the props that differ from the default.
- The size budgets in `packages/hairline/package.json` do not change: 12.8 kB (vanilla, all six), 5.4 kB (one figure), 13.2 kB (React).
- Every commit message ends with a blank line and `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Never commit `.vercel/`, `.superpowers/` or anything under `.claude/`.

## Review Focus

1. A caller without types passes `intensity` as a string from an attribute (`"0.8"`), out of range (`-3`, `7`), or as junk (`NaN`, `null`, `{}`): every figure mounts, updates and draws, with no `NaN` in the markup, and `"1"` draws as `1` does. Pinned in Task 1 (`intensity.test.ts`: "reads a numeric string…", "clamps to 0…1") and Task 2 (`mount.test.ts`: "mounts, updates and draws with %o as the intensity", and the `text` host in "reaches %s's engine…").
2. A React prop that is removed (`<Terrain intensity={1} />` re-rendered as `<Terrain />`) goes back to 0.5, not to the last value. Pinned in Task 2 (`react.test.tsx`: "puts intensity back to 0.5 when the prop is removed").
3. The inspector's snippet at the default: a slider value that only reads as 0.5 (`0.1 + 0.4`, `0.5000001`) is left out, and `0`, which is falsy, is still shown. Pinned in Task 5 (`docs.test.ts`: "leaves out an intensity that reads as 0.5…", "shows an intensity of 0…").
4. Copy without clipboard permission (an iframe, an insecure origin, a denied prompt): the button selects the text so the reader can copy it by hand, and nothing is thrown. Pinned in Task 6 (`site.spec.ts`: "without a clipboard, copy selects the text instead and throws nothing").
5. A phone, 390 px wide, with the longest install command (shadcn's) and the inspector's controls: no horizontal scroll, and every control on screen. Pinned in Task 6 (`site.spec.ts`: "the page fits a phone, with the longest install command and every control").

---

### Task 1: The intensity map

**Files:**
- Create: `packages/hairline/src/intensity.ts`
- Create: `packages/hairline/test/intensity.test.ts`
- Modify: `packages/hairline/test/parity/scripts.mjs` (add `INTENSITY` after `OPTION`)

**Interfaces:**
- Consumes: nothing new. `test/parity/scripts.mjs` already exports `FIGURES`, `OPTION` (each figure's option name and the value its parity script sets) and `SCRIPTS`.
- Produces, all internal to the package (neither entry exports them):
  - `type FigureId = "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable"`
  - `const TABLE: Record<FigureId, readonly [number, number, number]>`, each figure's parameter at intensity 0, 0.5 and 1.
  - `const DEFAULT = 0.5`
  - `function intensity(value: unknown): number`, an intensity from anything, in 0…1.
  - `function parameter(figure: FigureId, value: unknown): number`, the figure's own number, rounded to three decimals.
  - From `test/parity/scripts.mjs`: `INTENSITY: Record<string, number>`, the intensity whose mapped value is `OPTION[id][1]`. Task 2's parity test sets it.

- [ ] **Step 1: Write the failing test**

The test pins the three points of every row, the direction of every row (Slow's falls), the parity intensities against the goldens' raw values, and the accepted values from the spec.

`packages/hairline/test/intensity.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT, TABLE, intensity, parameter, type FigureId } from "../src/intensity";
import { INTENSITY, OPTION } from "./parity/scripts.mjs";

const IDS = Object.keys(TABLE) as FigureId[];

describe("intensity", () => {
  it("keeps a number inside 0…1", () => {
    expect(intensity(0.8)).toBe(0.8);
  });
  it("clamps to 0…1", () => {
    expect(intensity(-3)).toBe(0);
    expect(intensity(7)).toBe(1);
  });
  it("reads a numeric string, as an attribute or a form field would give it", () => {
    expect(intensity("0.8")).toBe(0.8);
    expect(intensity(" 7 ")).toBe(1);
  });
  it.each([undefined, null, NaN, Infinity, -Infinity, "", "  ", "fast", {}, [], true])("falls back to 0.5 for %o", (v) => {
    expect(intensity(v)).toBe(DEFAULT);
    expect(DEFAULT).toBe(0.5);
  });
});

describe("parameter", () => {
  it.each(IDS)("gives %s its table's three values at 0, 0.5 and 1", (id) => {
    expect([0, 0.5, 1].map((i) => parameter(id, i))).toEqual(TABLE[id]);
  });

  it.each(IDS)("moves %s one way only as intensity rises", (id) => {
    const values = Array.from({ length: 21 }, (_, k) => parameter(id, k / 20));
    const falls = id === "slow";
    for (let k = 1; k < values.length; k++) {
      if (falls) expect(values[k]).toBeLessThan(values[k - 1]);
      else expect(values[k]).toBeGreaterThan(values[k - 1]);
    }
  });

  it("rounds to three decimals", () => {
    expect(parameter("riffle", 0.7)).toBe(60);
    expect(parameter("riffle", 0.333)).toBe(26.64);
  });

  it("reads the intensity the way intensity() does", () => {
    expect(parameter("terrain", "0.75")).toBe(4);
    expect(parameter("terrain", 9)).toBe(5);
    expect(parameter("terrain", "fast")).toBe(3);
  });

  /* the parity goldens were captured with raw values; these intensities must land on them exactly */
  it.each(IDS)("lands %s on the golden's value at its parity intensity", (id) => {
    const raw = OPTION[id][1];
    expect(parameter(id, INTENSITY[id])).toBe(raw);
  });
});
```

Add `INTENSITY` to the parity scripts, after `OPTION`, so the test above can import it:

`packages/hairline/test/parity/scripts.mjs (diff)`
```diff
--- a/packages/hairline/test/parity/scripts.mjs
+++ b/packages/hairline/test/parity/scripts.mjs
@@ -11,6 +11,12 @@ export const OPTION = {
   phosphor: ["afterglow", 900], slow: ["rate", 0.4], turntable: ["coast", 1000],
 };
 
+/** The intensity the package is set to at `set`: each maps exactly onto the value in OPTION (test/intensity.test.ts holds them together). */
+export const INTENSITY = {
+  riffle: 0.7, terrain: 0.75, exploded: 5 / 6,
+  phosphor: 0.5 + 190 / 980, slow: 0.25, turntable: 0.5 + 175 / 850,
+};
+
 export const SCRIPTS = {
   riffle: [
     { adv: 30 }, { cp: "rest" },
```

- [ ] **Step 2: Run the test to see it fail**

Run: `pnpm --filter @lucasmarkes/hairline exec vitest run test/intensity.test.ts`
Expected: FAIL, `Error: Cannot find module '../src/intensity'`, and no tests run.

- [ ] **Step 3: Write the module**

`packages/hairline/src/intensity.ts`
```ts
/**
 * One option, `intensity`, for every figure. Each figure turns it into the
 * one number its engine takes: two straight lines that meet at 0.5, where the
 * number is the figure's default, with the figure's limits at 0 and 1.
 *
 * Internal: neither entry exports this. The site keeps a copy of TABLE for its
 * copy and its tests hold the two together.
 */

export type FigureId = "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable";

/** Each figure's number at intensity 0, 0.5 and 1. Slow's falls: a slower clock is a stronger answer. */
export const TABLE: Record<FigureId, readonly [number, number, number]> = {
  riffle: [0, 40, 90], // stagger, ms
  terrain: [1.5, 3, 5], // radius, cells
  exploded: [12, 28, 40], // gap, viewBox units
  phosphor: [150, 520, 1500], // afterglow, ms
  slow: [0.6, 0.2, 0.05], // rate, × normal speed
  turntable: [200, 650, 1500], // coast, ms
};

export const DEFAULT = 0.5;

/** An intensity from anything: numeric strings are read, what is not a finite number is the default, the rest is clamped to 0…1. */
export function intensity(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT;
  return Math.min(1, Math.max(0, n));
}

/** The figure's own number for an intensity, rounded to three decimals so 0.7 gives Riffle 60 and not 59.99999999999999. */
export function parameter(figure: FigureId, value: unknown): number {
  const [lo, mid, hi] = TABLE[figure];
  const i = intensity(value);
  const v = i <= 0.5 ? lo + (i / 0.5) * (mid - lo) : mid + ((i - 0.5) / 0.5) * (hi - mid);
  return Math.round(v * 1000) / 1000;
}
```

- [ ] **Step 4: Run the test to see it pass, then the package's gates**

Run: `pnpm --filter @lucasmarkes/hairline exec vitest run test/intensity.test.ts`
Expected: PASS, 34 tests.

Run: `pnpm --filter @lucasmarkes/hairline test && pnpm --filter @lucasmarkes/hairline typecheck`
Expected: every test file passes, and `tsc --noEmit` prints nothing. Nothing imports the module yet, so nothing else changes.

- [ ] **Step 5: Commit**

```bash
git add packages/hairline/src/intensity.ts packages/hairline/test/intensity.test.ts packages/hairline/test/parity/scripts.mjs
git commit -m "Intensity: one number from 0 to 1, mapped onto each figure's own parameter

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2: One options type for both entries

**Files:**
- Modify: `packages/hairline/src/mount.ts` (the options type and the `update` merge)
- Modify: `packages/hairline/src/index.ts` (the six functions take `HairlineOptions` and map `intensity`)
- Modify: `packages/hairline/src/react.tsx` (one props type, `HairlineProps`)
- Delete: `packages/hairline/src/ranges.ts`, `packages/hairline/test/ranges.test.ts`
- Test: `packages/hairline/test/mount.test.ts`, `packages/hairline/test/react.test.tsx`, `packages/hairline/test/ssr.test.tsx`, `packages/hairline/test/types.test-d.tsx`
- Test: `packages/hairline/test/browser/parity.spec.ts`, `packages/hairline/test/browser/figures.spec.ts`

**Interfaces:**
- Consumes from Task 1: `parameter(figure, value)` and `FigureId` from `src/intensity.ts`; `INTENSITY` from `test/parity/scripts.mjs`.
- Produces, the whole public API from here on:
  - `src/mount.ts`:
    ```ts
    export type HairlineOptions = { intensity?: number; theme?: "auto" | "light" | "dark"; label?: string; onRead?: (text: string) => void };
    export type Figure = { update(options: HairlineOptions): void; destroy(): void };
    export function create(spec: Spec, el: HTMLElement, options?: HairlineOptions): Figure;
    ```
    In `update`, a key whose value is `undefined` is deleted from the stored options (it goes back to its default); a key that is absent is kept.
  - `src/index.ts`: `riffle`, `terrain`, `exploded`, `phosphor`, `slow`, `turntable`, each `(el: HTMLElement, options?: HairlineOptions) => Figure`, and `export type { Figure, HairlineOptions }`. Nothing else: `ranges`, `Range`, `BaseOptions`, `Theme` and the six `*Options` types are gone.
  - `src/react.tsx`: `export type HairlineProps = HairlineOptions & Omit<ComponentPropsWithoutRef<"div">, "children" | keyof HairlineOptions>`, and the six components, each taking `HairlineProps` with `ref` reaching the `<div>`. `FigureProps`, `FigureComponent` and the six `*Props` types are gone.
  - Riffle is mounted with no names, so its caption and live region read the card's number only. Task 3 removes the names from the engine itself.

The parity goldens still hold Riffle's hit bands and the site's card names. The parity test now removes both from both sides before comparing, the way it would normalise ids, and sets `intensity` at `set` instead of the old option. The goldens are not captured again.

- [ ] **Step 1: Write the failing tests**

Replace `packages/hairline/test/mount.test.ts`. The new `intensity` block mounts six hosts side by side on one clock (default, 0.5, 0, 1, the string `"1"`, and 1 reset through `update({ intensity: undefined })`) and plays the same input into all of them, which pins that the prop reaches every engine at mount and through `update`. "mounts, updates and draws with %o as the intensity" is Review Focus 1. The caption block's "reads a pulled card out by its number alone…" replaces the old names test.

`packages/hairline/test/mount.test.ts`
```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { frames, host, observers, pending } from "./dom";
import { exploded, phosphor, riffle, slow, terrain, turntable } from "../src/index";

const ALL = { riffle, terrain, exploded, phosphor, slow, turntable };
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("mount", () => {
  it.each(Object.entries(ALL))("%s draws into the element and takes it all back", (id, mount) => {
    const el = host();
    el.className = "mine";
    const f = mount(el);
    expect(el.getAttribute("data-hairline")).toBe(id);
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 400 320");
    expect(el.querySelector("svg")!.childElementCount).toBeGreaterThan(0);
    expect(el.getAttribute("aria-label")).toBeTruthy();
    f.destroy();
    expect(el.outerHTML).toBe('<div class="mine"></div>');
  });

  it("makes Riffle a focusable group with a live region, and the others images", () => {
    const a = host(), b = host();
    riffle(a); terrain(b);
    expect(a.getAttribute("role")).toBe("group");
    expect(a.getAttribute("tabindex")).toBe("0");
    expect(a.querySelector("[data-hairline-live]")!.getAttribute("aria-live")).toBe("polite");
    expect(b.getAttribute("role")).toBe("img");
    expect(b.hasAttribute("tabindex")).toBe(false);
    expect(b.querySelector("[data-hairline-live]")).toBeNull();
  });

  it("leaves the host's own attributes alone, at mount and at destroy", () => {
    const el = host();
    el.setAttribute("role", "figure");
    el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-label", "My cards");
    const f = riffle(el, { label: "ignored" });
    expect(el.getAttribute("role")).toBe("figure");
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(el.getAttribute("aria-label")).toBe("My cards");
    f.destroy();
    expect(el.getAttribute("role")).toBe("figure");
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(el.getAttribute("aria-label")).toBe("My cards");
  });

  it("does not name an element that aria-labelledby already names", () => {
    const el = host();
    el.setAttribute("aria-labelledby", "caption");
    const f = terrain(el);
    expect(el.hasAttribute("aria-label")).toBe(false);
    f.destroy();
    expect(el.getAttribute("aria-labelledby")).toBe("caption");
  });

  it("drops its own name when the element gains aria-labelledby", () => {
    const el = host();
    const f = terrain(el);
    el.setAttribute("aria-labelledby", "caption");
    f.update({});
    expect(el.hasAttribute("aria-label")).toBe(false);
  });

  it("throws a TypeError for something that is not an element", () => {
    expect(() => riffle(null as unknown as HTMLElement)).toThrow(TypeError);
    expect(() => riffle("#cards" as unknown as HTMLElement)).toThrow(/takes an element/);
  });

  it("replaces a figure already on the element", () => {
    const el = host();
    riffle(el);
    terrain(el);
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.getAttribute("data-hairline")).toBe("terrain");
    expect(el.getAttribute("role")).toBe("img");
    expect(el.hasAttribute("tabindex")).toBe(false);
    expect(el.querySelector("[data-hairline-live]")).toBeNull();
  });

  it("puts the stylesheet in the document once, however many figures mount", () => {
    riffle(host()); terrain(host()); slow(host());
    const sheets = document.adoptedStyleSheets?.length ?? 0;
    expect(sheets + document.querySelectorAll("style[data-hairline-style]").length).toBe(1);
  });
});

describe("options", () => {
  it("sets and clears the theme attribute", () => {
    const el = host();
    const f = terrain(el, { theme: "dark" });
    expect(el.getAttribute("data-hairline-theme")).toBe("dark");
    f.update({ theme: "light" });
    expect(el.getAttribute("data-hairline-theme")).toBe("light");
    f.update({ theme: "auto" });
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    f.update({ theme: "dark" });
    f.update({ theme: undefined });
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
  });

  it("updates the label, and goes back to the default when it is removed", () => {
    const el = host();
    const f = terrain(el);
    const standard = el.getAttribute("aria-label");
    f.update({ label: "Dunes" });
    expect(el.getAttribute("aria-label")).toBe("Dunes");
    f.update({ label: undefined });
    expect(el.getAttribute("aria-label")).toBe(standard);
  });

  // Review Focus 1: a caller without types passes what it has
  it.each(["0.8", -3, 7, NaN, null, "fast", {}, Infinity])("mounts, updates and draws with %o as the intensity", (v) => {
    const el = host();
    const bad = v as unknown as number;
    for (const mount of Object.values(ALL)) {
      const f = mount(el, { intensity: bad });
      el.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160, bubbles: true }));
      f.update({ intensity: bad });
      frames(3);
      expect(el.querySelector("svg")!.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
      f.destroy();
    }
  });
});

describe("intensity", () => {
  /* the same input for every host: a point, or a number of frames */
  const PLAY: Record<keyof typeof ALL, Array<[number, number] | number>> = {
    riffle: [[150, 120], 12],
    terrain: [[200, 160], 20],
    exploded: [[100, 80], 30],
    phosphor: [[240, 140], 2, [260, 145], 2, [280, 150], 15],
    slow: [[200, 160], 60],
    turntable: [[50, 176], 1, [120, 176], 1, [200, 176], 1, [280, 176], 1, [350, 176], 40],
  };
  const svg = (el: Element) => el.querySelector("svg")!.innerHTML.replace(/hl-fd\d+/g, "hl-fd");

  /* the hosts run side by side on one clock, so the default and an explicit 0.5 must draw alike: that is the control */
  it.each(Object.keys(ALL) as Array<keyof typeof ALL>)("reaches %s's engine, at mount and through update", (id) => {
    const mount = ALL[id];
    const els = Array.from({ length: 6 }, host);
    const [base, half, none, full, text, reset] = els;
    mount(base);
    mount(half, { intensity: 0.5 });
    mount(none, { intensity: 0 });
    mount(full, { intensity: 1 });
    mount(text, { intensity: "1" as unknown as number });
    mount(reset, { intensity: 1 }).update({ intensity: undefined });
    for (const step of PLAY[id]) {
      if (typeof step === "number") frames(step);
      else for (const el of els) el.dispatchEvent(new MouseEvent("pointermove", { clientX: step[0], clientY: step[1], bubbles: true }));
    }
    expect(svg(half)).toBe(svg(base));
    expect(svg(reset)).toBe(svg(base));
    expect(svg(none)).not.toBe(svg(base));
    expect(svg(full)).not.toBe(svg(base));
    expect(svg(text)).toBe(svg(full));
  });

  it("keeps the intensity when update leaves it out", () => {
    const els = [host(), host()];
    terrain(els[0], { intensity: 1 }).update({ theme: "dark" });
    terrain(els[1], { intensity: 1 });
    for (const el of els) el.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160, bubbles: true }));
    frames(20);
    expect(svg(els[0])).toBe(svg(els[1]));
  });
});

describe("the caption", () => {
  it("calls onRead once at mount with the rest caption", () => {
    for (const [id, rest] of [["riffle", "rest"], ["terrain", "rest"], ["slow", "rate 1.00×"]] as const) {
      const onRead = vi.fn();
      ALL[id](host(), { onRead });
      expect(onRead.mock.calls).toEqual([[rest]]);
    }
  });

  it("does not repeat a caption that has not changed", () => {
    const onRead = vi.fn();
    slow(host(), { onRead });
    frames(30);
    expect(onRead.mock.calls).toEqual([["rate 1.00×"]]);
  });

  it("reads a pulled card out by its number alone, in the caption and the live region", () => {
    const el = host(), onRead = vi.fn();
    /* the old option, from a caller without types: ignored */
    const f = riffle(el, { onRead, labels: ["Radial menu", "Drum"] } as never);
    key(el, "ArrowLeft");
    expect(onRead).toHaveBeenLastCalledWith("01");
    expect(el.querySelector("[data-hairline-live]")!.textContent).toBe("01");
    f.update({ labels: ["Radial menu"] } as never);
    key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("02");
    for (let i = 0; i < 7; i++) key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("08");
    expect(el.querySelector("[data-hairline-live]")!.textContent).toBe("08");
    key(el, "Escape");
    expect(onRead).toHaveBeenLastCalledWith("rest");
  });

  // Review Focus 2: every figure on the page shares one frame loop
  it("reports an onRead that throws and keeps every figure running", () => {
    const reported = vi.fn();
    vi.stubGlobal("reportError", reported);
    const boom = new Error("consumer bug");
    const other = vi.fn();
    const a = host(), b = host();
    expect(() => slow(a, { onRead: () => { throw boom; } })).not.toThrow();
    slow(b, { onRead: other });
    a.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160 }));
    b.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160 }));
    expect(() => frames(120)).not.toThrow();
    expect(reported.mock.calls.length).toBeGreaterThan(1);
    expect(reported).toHaveBeenCalledWith(boom);
    expect(other.mock.calls.length).toBeGreaterThan(1);
    expect(other.mock.calls[other.mock.calls.length - 1][0]).toMatch(/^rate 0\.20×/);
  });
});

describe("teardown", () => {
  it("destroys twice without complaint", () => {
    const f = riffle(host());
    f.destroy();
    expect(() => f.destroy()).not.toThrow();
  });

  // Review Focus 3: a handle kept after its figure is gone
  it("ignores update on a destroyed figure", () => {
    const el = host();
    const f = terrain(el);
    f.destroy();
    f.update({ theme: "dark", label: "late", intensity: 1 });
    expect(el.outerHTML).toBe("<div></div>");
  });

  it("ignores a stale handle once another figure has taken the element", () => {
    const el = host();
    const old = riffle(el);
    terrain(el);
    old.update({ theme: "dark", label: "late" });
    old.destroy();
    expect(el.getAttribute("data-hairline")).toBe("terrain");
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    expect(el.getAttribute("aria-label")).not.toBe("late");
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.querySelector("svg")!.childElementCount).toBeGreaterThan(0);
  });

  it("leaves no frame and no observer behind the last figure", () => {
    const a = slow(host()), b = phosphor(host());
    frames(2);
    expect(pending()).toBe(1);
    expect(observers.size).toBe(1);
    a.destroy();
    frames(2);
    expect(pending()).toBe(1);
    b.destroy();
    expect(pending()).toBe(0);
    expect(observers.size).toBe(0);
  });

  it("stops listening to the element", () => {
    const el = host(), onRead = vi.fn();
    riffle(el, { onRead }).destroy();
    onRead.mockClear();
    key(el, "ArrowLeft");
    expect(onRead).not.toHaveBeenCalled();
  });
});
```

Replace `packages/hairline/test/react.test.tsx`. "puts intensity back to 0.5 when the prop is removed" is Review Focus 2.

`packages/hairline/test/react.test.tsx`
```tsx
// @vitest-environment jsdom
import { StrictMode, createRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { frames, observers, pending } from "./dom";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "../src/react";

afterEach(cleanup);

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
/** The rendered div, sized as dom.ts's host() is, so a client point is a viewBox point. */
const sized = (el: Element) => {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 320, right: 400, bottom: 320, x: 0, y: 0, toJSON() {} });
  return el;
};
const svg = (el: Element) => el.querySelector("svg")!.innerHTML.replace(/hl-fd\d+/g, "hl-fd");

describe("components", () => {
  it("renders each figure into one div", () => {
    const { container } = render(<><Riffle /><Terrain /><Exploded /><Phosphor /><Slow /><Turntable /></>);
    const ids = [...container.children].map((el) => el.getAttribute("data-hairline"));
    expect(ids).toEqual(["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"]);
    for (const el of container.children) expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
  });

  it("passes div attributes through, forwards the ref, and keeps the options off the DOM", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Riffle ref={ref} id="cards" className="w-80" data-x="1" style={{ width: 320 }} intensity={0.8} theme="dark" label="Cards" onRead={() => {}} />);
    const el = container.firstElementChild as HTMLDivElement;
    expect(ref.current).toBe(el);
    expect(el.id).toBe("cards");
    expect(el.className).toBe("w-80");
    expect(el.getAttribute("data-x")).toBe("1");
    expect(el.style.width).toBe("320px");
    expect(el.style.aspectRatio).toBe("5 / 4");
    for (const name of ["intensity", "theme", "label", "onread"]) expect(el.hasAttribute(name)).toBe(false);
    expect(el.getAttribute("data-hairline-theme")).toBe("dark");
    expect(el.getAttribute("aria-label")).toBe("Cards");
  });

  it("lets the style prop override the aspect ratio", () => {
    const { container } = render(<Terrain style={{ aspectRatio: "1 / 1" }} />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("1 / 1");
  });

  it("uses the label prop, and aria-label when the caller sets that instead", () => {
    const { container, rerender } = render(<Terrain label="Dunes" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute("aria-label")).toBe("Dunes");
    rerender(<Terrain aria-label="Hills" />);
    expect(el.getAttribute("aria-label")).toBe("Hills");
  });

  it("updates the running figure when a prop changes, without remounting", () => {
    const { container, rerender } = render(<Riffle theme="dark" />);
    const el = container.firstElementChild!, drawing = el.querySelector("svg");
    rerender(<Riffle theme="light" />);
    expect(el.getAttribute("data-hairline-theme")).toBe("light");
    rerender(<Riffle />);
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    expect(el.querySelector("svg")).toBe(drawing);
  });

  // Review Focus 2: a prop that is removed goes back to its default
  it("puts intensity back to 0.5 when the prop is removed", () => {
    const { container, rerender } = render(<><Terrain intensity={1} /><Terrain /><Terrain intensity={1} /></>);
    const [gone, standard, strong] = [...container.children].map(sized);
    rerender(<><Terrain /><Terrain /><Terrain intensity={1} /></>);
    for (const el of [gone, standard, strong]) el.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160, bubbles: true }));
    frames(20);
    expect(svg(gone)).toBe(svg(standard));
    expect(svg(gone)).not.toBe(svg(strong));
  });

  // Review Focus 4: a function written inline is new on every render
  it("does not remount, and does not loop, on an inline onRead", () => {
    const seen: string[] = [];
    let renders = 0;
    function App({ n }: { n: number }) {
      renders++;
      return <Riffle data-n={n} onRead={(t) => seen.push(`${n}:${t}`)} />;
    }
    const { container, rerender } = render(<App n={1} />);
    const el = container.firstElementChild!, drawing = el.querySelector("svg");
    rerender(<App n={2} />);
    rerender(<App n={3} />);
    expect(renders).toBe(3);
    expect(el.querySelector("svg")).toBe(drawing);
    key(el, "ArrowLeft");
    // one call at mount, and the latest function is the one called afterwards
    expect(seen).toEqual(["1:rest", "3:01"]);
  });

  it("calls a state setter from onRead without looping", () => {
    const onRead = vi.fn();
    const { container } = render(<Slow onRead={onRead} />);
    expect(onRead.mock.calls).toEqual([["rate 1.00×"]]);
    expect(container.firstElementChild!.querySelectorAll("svg")).toHaveLength(1);
  });

  it("survives StrictMode's double mount with one drawing", () => {
    const onRead = vi.fn();
    const { container } = render(<StrictMode><Riffle onRead={onRead} /></StrictMode>);
    const el = container.firstElementChild!;
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.querySelectorAll("[data-hairline-live]")).toHaveLength(1);
    expect(observers.size).toBe(1);
    key(el, "ArrowLeft");
    expect(onRead).toHaveBeenLastCalledWith("01");
  });

  it("cleans up on unmount", () => {
    const { container, unmount } = render(<><Slow /><Phosphor /></>);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    unmount();
    expect(pending()).toBe(0);
    expect(observers.size).toBe(0);
  });

  it("names the components for the dev tools", () => {
    expect([Riffle, Terrain, Exploded, Phosphor, Slow, Turntable].map((c) => c.displayName))
      .toEqual(["Riffle", "Terrain", "Exploded", "Phosphor", "Slow", "Turntable"]);
  });
});
```

Change the one server-rendering case in `packages/hairline/test/ssr.test.tsx` so it passes the new options, which must stay off the DOM:

`packages/hairline/test/ssr.test.tsx (diff)`
```diff
--- a/packages/hairline/test/ssr.test.tsx
+++ b/packages/hairline/test/ssr.test.tsx
@@ -13,7 +13,7 @@ describe("on the server", () => {
 
   it("renders a component as an empty box of the right shape", async () => {
     const { Riffle } = await import("../src/react");
-    const html = renderToString(createElement(Riffle, { className: "w-80", stagger: 60, labels: ["a"], onRead() {} }));
+    const html = renderToString(createElement(Riffle, { className: "w-80", intensity: 0.8, theme: "dark", label: "Cards", onRead() {} }));
     expect(html).toBe('<div class="w-80" style="aspect-ratio:5 / 4"></div>');
   });
 
```

Replace `packages/hairline/test/types.test-d.tsx`. It checks that the new options compile on every function and component, that every dropped option is a compile error on every one of them, and what each entry exports:

`packages/hairline/test/types.test-d.tsx`
```tsx
/**
 * Type tests. Nothing here runs: `pnpm typecheck` compiles this file, and an
 * `@ts-expect-error` line fails the build if the line below it stops being
 * an error. Vitest does not pick it up (it is not a `.test.` file).
 */
import { createRef } from "react";
import { exploded, phosphor, riffle, slow, terrain, turntable, type Figure, type HairlineOptions } from "../src/index";
import * as vanilla from "../src/index";
import * as components from "../src/react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable, type HairlineProps } from "../src/react";

declare const el: HTMLElement;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const yes = <T extends true>() => {};

/* every figure takes the same options */
riffle(el, { intensity: 0.8, theme: "dark", label: "Cards", onRead: (t: string) => t });
riffle(el);
for (const mount of [riffle, terrain, exploded, phosphor, slow, turntable]) {
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
yes<Equal<keyof typeof vanilla, "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable">>();
yes<Equal<keyof typeof components, "Riffle" | "Terrain" | "Exploded" | "Phosphor" | "Slow" | "Turntable">>();
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
for (const C of [Riffle, Terrain, Exploded, Phosphor, Slow, Turntable]) {
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
```

Delete the test of the module that goes away:

```bash
git rm packages/hairline/test/ranges.test.ts
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm --filter @lucasmarkes/hairline test`
Expected: FAIL, `Tests 10 failed | 82 passed (92)`:
- `mount.test.ts`: the six "reaches %s's engine, at mount and through update" (`expected '<g>…' not to be '<g>…'`: the old figures ignore `intensity`), and "reads a pulled card out by its number alone…" (`expected last "vi.fn()" call to have been called with [ '01' ]`).
- `react.test.tsx`: "passes div attributes through, forwards the ref, and keeps the options off the DOM" and "puts intensity back to 0.5 when the prop is removed".
- `ssr.test.tsx`: "renders a component as an empty box of the right shape" (`intensity` reaches the DOM as an attribute).

Run: `pnpm --filter @lucasmarkes/hairline typecheck`
Expected: FAIL, with `error TS2353: Object literal may only specify known properties, and 'intensity' does not exist in type …` in `mount.test.ts`, `error TS2322` for `intensity` on the components in `react.test.tsx`, and errors in `ssr.test.tsx` and `types.test-d.tsx`.

- [ ] **Step 3: Write the options type and the merge**

Replace `packages/hairline/src/mount.ts`:

`packages/hairline/src/mount.ts`
```ts
import { inject } from "./core/styles";
import type { FigureMount, Readout } from "./core/stage";
import { parameter, type FigureId } from "./intensity";

/**
 * Hairline — the public wrapper around an engine. An engine draws into an svg
 * it is handed and writes its caption to a read-out; this file makes both,
 * dresses the host element, and gives back the two calls a consumer needs.
 *
 * It only ever removes what it added: the svg, the live region, and the
 * attributes the host did not already have.
 */

/** What every figure takes. */
export type HairlineOptions = {
  /** How strongly the figure answers the pointer, from 0 (subtle) to 1 (strong). Default 0.5. */
  intensity?: number;
  /** `"auto"` follows the page: an ancestor with class `dark` or `data-theme="dark"`, then the page's `color-scheme`. Default `"auto"`. */
  theme?: "auto" | "light" | "dark";
  /** The accessible name. Each figure has a default description in English. */
  label?: string;
  /** The figure's caption, each time it changes. Called once at mount with the rest caption. */
  onRead?: (text: string) => void;
};

export type Figure = {
  /** Changes options on the running figure. A key set to `undefined` goes back to its default; a key left out stays as it was. */
  update(options: HairlineOptions): void;
  /** Stops the figure and removes what it added to the element. Safe to call twice. */
  destroy(): void;
};

/** What a figure is: its engine, and what it says about itself. */
export type Spec = {
  id: FigureId;
  /** The default accessible name. */
  label: string;
  /** The caption at rest, for an engine that writes none until it is touched. */
  rest: string;
  engine: FigureMount;
  /** Operable from the keyboard: a focusable group with a live region, not an image. */
  focusable?: boolean;
};

const NS = "http://www.w3.org/2000/svg";
const mounted = new WeakMap<Element, () => void>();

/** An error from a consumer's callback, reported as uncaught without unwinding the frame loop every figure shares. */
const report = (err: unknown) => {
  if (typeof reportError === "function") reportError(err);
  else setTimeout(() => { throw err; });
};

export function create(spec: Spec, el: HTMLElement, options?: HairlineOptions): Figure {
  if (typeof document === "undefined") {
    throw new Error(`hairline: ${spec.id}() needs a DOM. Call it in the browser, once the element exists: in an effect, in onMount, or in a script after the element.`);
  }
  if (!el || el.nodeType !== 1) {
    throw new TypeError(`hairline: ${spec.id}() takes an element as its first argument, and got ${el === null ? "null" : typeof el}.`);
  }
  mounted.get(el)?.();

  const opts: HairlineOptions = { ...options };
  const doc = el.ownerDocument;
  const root = el.getRootNode();
  inject(root.nodeType === 9 || "host" in root ? (root as Document | ShadowRoot) : doc);

  /* attributes: the host's own are left alone, ours are remembered */
  const owned = new Set<string>();
  const attr = (name: string, value: string | null) => {
    if (!owned.has(name) && el.hasAttribute(name)) return;
    if (value === null) { el.removeAttribute(name); owned.delete(name); }
    else { el.setAttribute(name, value); owned.add(name); }
  };
  const dress = () => {
    attr("data-hairline-theme", opts.theme === "light" || opts.theme === "dark" ? opts.theme : null);
    attr("aria-label", el.hasAttribute("aria-labelledby") ? null : typeof opts.label === "string" ? opts.label : spec.label);
  };
  attr("data-hairline", spec.id);
  attr("role", spec.focusable ? "group" : "img");
  if (spec.focusable) attr("tabindex", "0");
  dress();

  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 400 320");
  svg.setAttribute("aria-hidden", "true");
  el.appendChild(svg);
  let live: HTMLElement | null = null;
  if (spec.focusable) {
    live = doc.createElement("span");
    live.setAttribute("data-hairline-live", "");
    live.setAttribute("aria-live", "polite");
    el.appendChild(live);
  }

  /* the read-out: engines write it every frame, so only a change goes any further */
  let text: string | null = null;
  const read: Readout = {
    get textContent() { return text; },
    set textContent(value) {
      const next = value ?? "";
      if (next === text) return;
      text = next;
      if (live) live.textContent = next;
      const fn = opts.onRead;
      if (typeof fn === "function") try { fn(next); } catch (err) { report(err); }
    },
  };

  let value = parameter(spec.id, opts.intensity);
  const engine = spec.engine({ stage: el, svg, read }, value);
  if (text === null) read.textContent = spec.rest;

  let dead = false;
  const destroy = () => {
    if (dead) return;
    dead = true;
    if (mounted.get(el) === destroy) mounted.delete(el);
    engine.destroy();
    svg.remove();
    live?.remove();
    for (const name of owned) el.removeAttribute(name);
    owned.clear();
  };
  mounted.set(el, destroy);

  return {
    update(next) {
      if (dead || !next) return;
      /* a caller without types may send keys that are not options; they are kept and never read */
      const own = opts as Record<string, unknown>, given = next as Record<string, unknown>;
      for (const k in given) {
        if (given[k] === undefined) delete own[k];
        else own[k] = given[k];
      }
      const v = parameter(spec.id, opts.intensity);
      if (v !== value) { value = v; engine.set(v); }
      dress();
    },
    destroy,
  };
}
```

- [ ] **Step 4: Write the six functions**

Replace `packages/hairline/src/index.ts`. Each function maps `intensity` through `parameter` into the one number its engine takes, and mounts Riffle with no names:

`packages/hairline/src/index.ts`
```ts
import { create, type Figure, type HairlineOptions } from "./mount";
import { mount as explodedEngine } from "./figures/exploded";
import { mount as phosphorEngine } from "./figures/phosphor";
import { mount as riffleEngine } from "./figures/riffle";
import { mount as slowEngine } from "./figures/slow";
import { mount as terrainEngine } from "./figures/terrain";
import { mount as turntableEngine } from "./figures/turntable";

/**
 * @lucasmarkes/hairline — six isometric line figures that answer the pointer.
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
```

Delete the ranges module, which nothing imports now:

```bash
git rm packages/hairline/src/ranges.ts
```

- [ ] **Step 5: Write the React entry**

Replace `packages/hairline/src/react.tsx`:

`packages/hairline/src/react.tsx`
```tsx
import {
  forwardRef, useCallback, useEffect, useLayoutEffect, useRef,
  type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type RefAttributes,
} from "react";
import { exploded, phosphor, riffle, slow, terrain, turntable, type Figure, type HairlineOptions } from "./index";

/**
 * @lucasmarkes/hairline/react — the six figures as components.
 *
 * A component renders one empty `<div>` and mounts the figure on it in a
 * layout effect, so on the server the box is there and the drawing is not.
 * It mounts once: a changed option reaches the running figure as `update`,
 * and `onRead` is called through a ref, so an inline function never remounts.
 */

/** The figure's options, plus every `<div>` attribute except `children`. */
export type HairlineProps = HairlineOptions & Omit<ComponentPropsWithoutRef<"div">, "children" | keyof HairlineOptions>;
type HairlineComponent = ForwardRefExoticComponent<HairlineProps & RefAttributes<HTMLDivElement>>;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function make(name: string, mount: (el: HTMLElement, options?: HairlineOptions) => Figure): HairlineComponent {
  const Component = forwardRef<HTMLDivElement, HairlineProps>(function Hairline(props, ref) {
    const { intensity, theme, label, onRead, style, ...attrs } = props;
    /* aria-label stays on the div and is the figure's label too, so the two never disagree about the name */
    const named = label ?? props["aria-label"];

    const el = useRef<HTMLDivElement | null>(null);
    const figure = useRef<Figure | null>(null);
    const read = useRef(onRead);
    const set = useCallback((node: HTMLDivElement | null) => {
      el.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    useIsoLayoutEffect(() => { read.current = onRead; });

    useIsoLayoutEffect(() => {
      const f = mount(el.current!, { intensity, theme, label: named, onRead: (text) => read.current?.(text) });
      figure.current = f;
      return () => { f.destroy(); figure.current = null; };
      // mounts once; options reach the figure through the effect below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* every key is sent, so a prop that was removed goes back to its default */
    useIsoLayoutEffect(() => { figure.current?.update({ intensity, theme, label: named }); }, [intensity, theme, named]);

    return <div {...attrs} ref={set} style={{ aspectRatio: "5 / 4", ...style }} />;
  });
  Component.displayName = name;
  return Component;
}

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. `intensity` spreads the ripple further from the pulled card. */
export const Riffle = make("Riffle", riffle);
/** Eighty-one pillars on a plinth that rise around the pointer. `intensity` widens the area that rises. */
export const Terrain = make("Terrain", terrain);
/** An app window in four layers. Moving across opens the gap; moving down picks a layer. `intensity` opens the layers further. */
export const Exploded = make("Exploded", exploded);
/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. `intensity` makes the trail linger longer. */
export const Phosphor = make("Phosphor", phosphor);
/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. `intensity` slows it more. */
export const Slow = make("Slow", slow);
/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. `intensity` makes the spin coast longer. */
export const Turntable = make("Turntable", turntable);
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm --filter @lucasmarkes/hairline test && pnpm --filter @lucasmarkes/hairline typecheck`
Expected: PASS, `Tests 92 passed (92)`, and `tsc --noEmit` prints nothing.

- [ ] **Step 7: Bring the browser tests to the new API**

Replace `packages/hairline/test/browser/parity.spec.ts`. It strips Riffle's `<g class="bands">` group and the card names from both sides, and sets `INTENSITY[id]` at `set`:

`packages/hairline/test/browser/parity.spec.ts`
```ts
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { play } from "../parity/driver.mjs";
import { FIGURES, INTENSITY, SCRIPTS } from "../parity/scripts.mjs";

/**
 * The package draws what the site draws. Each golden is the site's svg at
 * every checkpoint of a pointer script (test/parity/capture.mjs); the same
 * script is played here against the package, on the same virtual clock.
 */
const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const clock = file("../parity/clock.js") + "\nwindow.__freeze(1000);";

/*
 * The goldens hold two things the package no longer draws or says: Riffle's
 * hidden hit bands, and the names the site gives its cards. Both come out of
 * both sides before the comparison, the way ids would; everything else must
 * match character for character.
 */
const strip = (svg: string) => svg.replace(/<g class="bands">.*?<\/g>/, "");
const unname = (id: string, read: string) => (id === "riffle" ? read.replace(/ · .*$/, "") : read);

type Checkpoint = { at: string; read: string; svg: string };

for (const id of FIGURES as string[]) {
  test(`${id} draws what the site draws`, async ({ context, page }) => {
    const golden = JSON.parse(file(`../parity/golden/${id}.json`)) as { checkpoints: Checkpoint[] };
    const intensity = (INTENSITY as Record<string, number>)[id];
    await context.addInitScript(clock);
    await page.goto("/");
    await page.evaluate((id) => { window.__hl.mount(id as "riffle"); }, id);
    const stage = page.locator("#host");
    await stage.locator("svg > *").first().waitFor();
    /* a figure sleeps until its IntersectionObserver reports it on screen, and that report comes on the browser's own time */
    await page.evaluate(() => new Promise((done) => window.__realTimeout(done, 500)));

    const got: Checkpoint[] = await play(page, {
      stage,
      snap: () => page.evaluate(() => ({ svg: document.querySelector("#host > svg")!.innerHTML, read: window.__hl.read() })),
      set: () => page.evaluate((intensity) => window.__hl.figure!.update({ intensity }), intensity),
    }, (SCRIPTS as Record<string, object[]>)[id]);

    expect(got.map((c) => c.at)).toEqual(golden.checkpoints.map((c) => c.at));
    for (const [i, want] of golden.checkpoints.entries()) {
      expect(got[i].read, `caption at "${want.at}"`).toBe(unname(id, want.read));
      expect(strip(got[i].svg), `drawing at "${want.at}"`).toBe(strip(want.svg));
    }
  });
}
```

In `packages/hairline/test/browser/figures.spec.ts`, Riffle's keyboard test mounts with no names and reads numbers only:

`packages/hairline/test/browser/figures.spec.ts (diff)`
```diff
--- a/packages/hairline/test/browser/figures.spec.ts
+++ b/packages/hairline/test/browser/figures.spec.ts
@@ -41,14 +41,14 @@ test("every figure mounts, answers the pointer and leaves, with nothing on the c
 });
 
 test("Riffle walks its cards from the keyboard and says each one in the live region", async ({ page }) => {
-  await mount(page, "riffle", { labels: ["Radial menu", "Drum"] });
+  await mount(page, "riffle");
   const host = page.locator("#host"), live = host.locator("[data-hairline-live]");
   await page.keyboard.press("Tab");
   await expect(host).toBeFocused();
   await page.keyboard.press("ArrowLeft");
-  await expect(live).toHaveText("01 · Radial menu");
+  await expect(live).toHaveText("01");
   await page.keyboard.press("ArrowRight");
-  await expect(live).toHaveText("02 · Drum");
+  await expect(live).toHaveText("02");
   await page.keyboard.press("ArrowRight");
   await expect(live).toHaveText("03");
   await page.keyboard.press("Escape");
```

Run: `pnpm --filter @lucasmarkes/hairline build && pnpm --filter @lucasmarkes/hairline test:browser`
Expected: PASS, `19 passed`. All six parity tests pass against the untouched goldens: at the default and at each `INTENSITY`, the package draws what the site drew.

If a parity test fails on a drawing, do not capture the goldens again. The map in Task 1 or the wiring in Step 4 is wrong: the default must draw exactly what it drew before.

- [ ] **Step 8: Commit**

```bash
git add packages/hairline/src packages/hairline/test
git commit -m "API: every figure takes HairlineOptions, with one intensity in place of six options

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 3: Riffle without names or drawn bands

**Files:**
- Modify: `packages/hairline/src/figures/riffle.ts` (drop `RiffleHandle`, the names and the band paths)
- Modify: `packages/hairline/src/core/styles.ts` (drop the `.bands` rules)
- Test: `packages/hairline/test/mount.test.ts` (one new test in the `mount` block)

**Interfaces:**
- Consumes from Task 2: `index.ts` mounts Riffle through `create` with no names, and nothing calls `bands()` or `labels()` any more.
- Produces: Riffle's engine `mount(els, value): FigureHandle`, the same handle type as the other five. The band geometry that decides which card is pulled (`hit`) is unchanged; only its drawing goes.

- [ ] **Step 1: Write the failing test**

Add this test to the `mount` block of `packages/hairline/test/mount.test.ts`, after "replaces a figure already on the element":

`packages/hairline/test/mount.test.ts (diff)`
```diff
--- a/packages/hairline/test/mount.test.ts
+++ b/packages/hairline/test/mount.test.ts
@@ -2,6 +2,7 @@
 import { describe, expect, it, vi } from "vitest";
 import { frames, host, observers, pending } from "./dom";
 import { exploded, phosphor, riffle, slow, terrain, turntable } from "../src/index";
+import { css } from "../src/core/styles";
 
 const ALL = { riffle, terrain, exploded, phosphor, slow, turntable };
 const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
@@ -79,6 +80,13 @@ describe("mount", () => {
     expect(el.querySelector("[data-hairline-live]")).toBeNull();
   });
 
+  it("draws no hit bands on Riffle, and the stylesheet has no rules for them", () => {
+    const el = host();
+    riffle(el);
+    expect(el.querySelector(".bands")).toBeNull();
+    expect(css(true) + css(false)).not.toMatch(/bands/);
+  });
+
   it("puts the stylesheet in the document once, however many figures mount", () => {
     riffle(host()); terrain(host()); slow(host());
     const sheets = document.adoptedStyleSheets?.length ?? 0;
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @lucasmarkes/hairline exec vitest run test/mount.test.ts -t "draws no hit bands"`
Expected: FAIL, `AssertionError: expected SVGGElement{ …(1) } to be null`.

- [ ] **Step 3: Take the names and the bands out of the engine**

In `packages/hairline/src/figures/riffle.ts`:

`packages/hairline/src/figures/riffle.ts (diff)`
```diff
--- a/packages/hairline/src/figures/riffle.ts
+++ b/packages/hairline/src/figures/riffle.ts
@@ -1,4 +1,4 @@
-import { clamp, poly, rad, type Vec2 } from "../core/iso";
+import { clamp, rad, type Vec2 } from "../core/iso";
 import { tdone, tset, tval, tween, type Tween } from "../core/motion";
 import { BACK, FWD, G, H, LIFT, N, REST, W, card, pose, scene, tray } from "./riffle-geometry";
 import { disposer, mk, place, pointer, reflect, register, type FigureEls, type FigureHandle } from "../core/stage";
@@ -10,21 +10,14 @@ import { disposer, mk, place, pointer, reflect, register, type FigureEls, type F
  *
  * Selection never reads the posed cards: it comes from static oblique bands
  * along the resting top edges, so a card moving out from under the pointer
- * can't flip the choice back and forth. `bands(true)` shows them. The stage
- * is a focusable group; the arrow keys walk the cards and the read-out names
- * the one pulled: its number, and its name when `labels` gave it one.
+ * can't flip the choice back and forth. The bands are geometry only; nothing
+ * draws them. The stage is a focusable group; the arrow keys walk the cards
+ * and the read-out names the one pulled by its number.
  *
  * The drawing itself — camera, tray, a card in any pose — is pure and lives in
  * riffle-geometry.ts; this file is the DOM, the tweens and the input.
  */
 
-export type RiffleHandle = FigureHandle & {
-  /** Shows or hides the hit bands. */
-  bands(on: boolean): void;
-  /** Names for the cards, card 01 first. A card without a name is read out by its number alone. */
-  labels(list: readonly string[]): void;
-};
-
 type Card = {
   n: number; t0: number; shape: Vec2[];
   back: SVGPathElement; face: SVGPathElement; head: SVGPathElement; rules: SVGPathElement;
@@ -33,10 +26,9 @@ type Card = {
   a: Tween; z: Tween;
 };
 
-export const mount = ({ stage, svg, read }: FigureEls, value: number): RiffleHandle => {
+export const mount = ({ stage, svg, read }: FigureEls, value: number): FigureHandle => {
   const bag = disposer();
   let stag = value;
-  let names: readonly string[] = [];
 
   const { P, front, outer, inner } = scene();
   const paths = tray(P, front, outer, inner);
@@ -64,9 +56,6 @@ export const mount = ({ stage, svg, read }: FigureEls, value: number): RiffleHan
   const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
   const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
   const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
-  const bandG = mk("g", { class: "bands" }, g), bands: SVGPathElement[] = [];
-  const at = (s: number, r: number): Vec2 => [c0[0] + s * d[0] + r * ex[0], c0[1] + s * d[1] + r * ex[1]];
-  for (let i = 0; i < N; i++) bands.push(mk("path", { d: poly([at(i - 0.5, -HALF), at(i - 0.5, HALF), at(i + 0.5, HALF), at(i + 0.5, -HALF)]) }, bandG));
 
   /** The card whose band holds the point, in the band's own (s, r) coordinates; -1 outside. */
   function hit([x, y]: Vec2) {
@@ -93,11 +82,7 @@ export const mount = ({ stage, svg, read }: FigureEls, value: number): RiffleHan
   bag.add(B.unregister);
 
   let act = -1;
-  const caption = (a: number) => {
-    if (a < 0) return "rest";
-    const n = N - a, name = names[n - 1];
-    return String(n).padStart(2, "0") + (name ? ` · ${name}` : "");
-  };
+  const caption = (a: number) => (a < 0 ? "rest" : String(N - a).padStart(2, "0"));
   /** Pulls card a (-1 puts them all back). The stagger spreads out from the card pulled, or the one let go. */
   function setActive(a: number) {
     if (a === act) return;
@@ -109,7 +94,6 @@ export const mount = ({ stage, svg, read }: FigureEls, value: number): RiffleHan
       tset(cd.a, th, now, delay); tset(cd.z, a === i ? LIFT : 0, now, delay);
       cd.face.classList.toggle("hi", i === a); cd.head.classList.toggle("hi", i === a); cd.punch[cd.n - 1].classList.toggle("m", i !== a);
     });
-    bands.forEach((b, i) => b.classList.toggle("on", i === a));
     read.textContent = caption(a);
     B.wake();
   }
@@ -126,8 +110,6 @@ export const mount = ({ stage, svg, read }: FigureEls, value: number): RiffleHan
 
   return {
     set: (v) => { stag = v; },
-    bands: (on) => { bandG.classList.toggle("show", on); },
-    labels: (list) => { names = list; if (act >= 0) read.textContent = caption(act); },
     destroy: bag.dispose,
   };
 };
```

In `packages/hairline/src/core/styles.ts`, remove the two rules for the bands:

`packages/hairline/src/core/styles.ts (diff)`
```diff
--- a/packages/hairline/src/core/styles.ts
+++ b/packages/hairline/src/core/styles.ts
@@ -47,10 +47,6 @@ export function css(lightDark: boolean): string {
     `${SVG} :where(.dot.m){fill:var(--hl-edge)}`,
     `${SVG} :where(.dot.off){fill:var(--hl-lo)}`,
     `${SVG} :where(.ghost path){fill:none;stroke:var(--hl-mid)}`,
-    `${SVG} :where(.bands){opacity:0;transition:opacity 240ms ${EASE};pointer-events:none}`,
-    `${SVG} :where(.bands.show){opacity:1}`,
-    `${SVG} :where(.bands path){fill:none;stroke:var(--hl-mid);stroke-dasharray:2 3}`,
-    `${SVG} :where(.bands path.on){stroke:var(--hl-hi);stroke-dasharray:none}`,
   ].join("");
 }
 
```

- [ ] **Step 4: Run the tests and the package's gates**

Run: `pnpm --filter @lucasmarkes/hairline test && pnpm --filter @lucasmarkes/hairline typecheck`
Expected: PASS, `Tests 93 passed (93)`, and `tsc --noEmit` prints nothing.

Run: `pnpm --filter @lucasmarkes/hairline build && pnpm --filter @lucasmarkes/hairline test:browser`
Expected: PASS, `19 passed`. Riffle's parity test still passes: the bands came out of both sides of the comparison in Task 2, and now the package simply has none to remove.

Run: `pnpm --filter @lucasmarkes/hairline size && pnpm --filter @lucasmarkes/hairline lint:package`
Expected: `All good!` from size-limit, with every size under its budget (about 11.3 kB of 12.8, 4.8 of 5.4, and 11.6 of 13.2). publint prints no problem, and attw shows 🟢 for `node16 (from ESM)` and `bundler` on both entries.

- [ ] **Step 5: Commit**

```bash
git add packages/hairline/src/figures/riffle.ts packages/hairline/src/core/styles.ts packages/hairline/test/mount.test.ts
git commit -m "Riffle: no card names and no drawn hit bands; a card is read out by its number

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 4: The fixtures, the README and CONTRIBUTING speak `intensity`

**Files:**
- Modify: `fixtures/next-app/app/page.tsx`, `fixtures/next-app/app/registry/page.tsx`, `fixtures/next-app/app/vanilla.tsx`, `fixtures/vite-vanilla/src/main.ts`
- Modify: `README.md`, `CONTRIBUTING.md`

**Interfaces:**
- Consumes from Task 2: the public API (`HairlineOptions`, the six functions and components). The registry item's source (`registry/src/hairline.tsx`, built by `registry/build.mjs` into the site's `/r/hairline.json`) wraps the components and takes its props from them through `ComponentProps<typeof …>`, so it follows the new props without a change.
- Produces: the real-consumer layer (base spec, layer 6) on the new API, and the README that npm shows.

This task's test is the existing consumer check, which packs the package, installs the tarball into copies of both fixtures, builds them with their own toolchains and opens them in Chrome. The fixtures still pass the old options, so it fails first.

- [ ] **Step 1: Run the consumer check to see it fail**

Run: `pnpm --filter @lucasmarkes/hairline build && node scripts/consumers.mjs`
Expected: FAIL, exit code 1, ending `2 consumer checks failed.` Both fixtures print `✗ build (the fixture's own typecheck and bundler)`:
- next-app: `error TS2322` for `labels` on `<Riffle>` and `rate` on `<Slow>` in `app/page.tsx`, and `error TS2353 … 'afterglow' does not exist in type 'HairlineOptions'` in `app/vanilla.tsx`.
- vite-vanilla: `error TS2305: Module '"@lucasmarkes/hairline"' has no exported member 'ranges'` (and `'RiffleOptions'`), `error TS2315: Type 'Figure' is not generic`, and `TS2353` for `stagger` and `radius`.

It needs the network: npm installs next, react and vite.

- [ ] **Step 2: Move the fixtures to `intensity`**

`fixtures/next-app/app/page.tsx (diff)`
```diff
--- a/fixtures/next-app/app/page.tsx
+++ b/fixtures/next-app/app/page.tsx
@@ -9,8 +9,8 @@ import { Vanilla } from "./vanilla";
 export default function Page() {
   return (
     <main style={{ display: "grid", gap: 24, width: 400, margin: "40px auto" }}>
-      <Riffle id="riffle" labels={["Radial menu", "Drum"]} />
-      <Slow id="slow" rate={0.4} theme="dark" />
+      <Riffle id="riffle" intensity={0.8} />
+      <Slow id="slow" intensity={0.25} theme="dark" />
       <Vanilla />
     </main>
   );
```

`fixtures/next-app/app/registry/page.tsx (diff)`
```diff
--- a/fixtures/next-app/app/registry/page.tsx
+++ b/fixtures/next-app/app/registry/page.tsx
@@ -1,5 +1,5 @@
 import type { CSSProperties } from "react";
-import { Terrain } from "@/components/ui/hairline";
+import { Riffle, Terrain } from "@/components/ui/hairline";
 
 /** shadcn's tokens, as a dark theme would define them. */
 const tokens = { "--background": "#101014", "--foreground": "#fafafa", "--muted-foreground": "#a1a1aa", "--border": "#27272a" } as CSSProperties;
@@ -13,6 +13,7 @@ export default function Page() {
   return (
     <main style={{ width: 400, margin: "40px auto", background: "var(--background)", ...tokens }}>
       <Terrain id="themed" />
+      <Riffle intensity={0.8} />
     </main>
   );
 }
```

`fixtures/next-app/app/vanilla.tsx (diff)`
```diff
--- a/fixtures/next-app/app/vanilla.tsx
+++ b/fixtures/next-app/app/vanilla.tsx
@@ -6,7 +6,7 @@ import { phosphor } from "@lucasmarkes/hairline";
 export function Vanilla() {
   const ref = useRef<HTMLDivElement>(null);
   useEffect(() => {
-    const figure = phosphor(ref.current!, { afterglow: 900 });
+    const figure = phosphor(ref.current!, { intensity: 0.8 });
     return () => figure.destroy();
   }, []);
   return <div id="phosphor" ref={ref} />;
```

`fixtures/vite-vanilla/src/main.ts (diff)`
```diff
--- a/fixtures/vite-vanilla/src/main.ts
+++ b/fixtures/vite-vanilla/src/main.ts
@@ -1,18 +1,17 @@
-import { exploded, phosphor, ranges, riffle, slow, terrain, turntable, type Figure, type RiffleOptions } from "@lucasmarkes/hairline";
+import { exploded, phosphor, riffle, slow, terrain, turntable, type Figure } from "@lucasmarkes/hairline";
 
 /** No framework: six elements, six calls. */
 const el = (id: string) => document.getElementById(id)!;
 const read = el("read");
 
-const cards: Figure<RiffleOptions> = riffle(el("riffle"), {
-  stagger: ranges.riffle.stagger.max,
-  labels: ["Radial menu", "Drum"],
+const cards: Figure = riffle(el("riffle"), {
+  intensity: 1,
   onRead: (text) => { read.textContent = text; },
 });
-terrain(el("terrain"), { radius: 4 });
+terrain(el("terrain"), { intensity: 0.75 });
 exploded(el("exploded"));
 phosphor(el("phosphor"), { theme: "dark" });
 slow(el("slow"));
 turntable(el("turntable"));
 
-cards.update({ bands: true });
+cards.update({ intensity: 0.8 });
```

- [ ] **Step 3: Run the consumer check to see it pass**

Run: `node scripts/consumers.mjs`
Expected: PASS. Every line under `▸ tarball`, `▸ fixtures/next-app` and `▸ fixtures/vite-vanilla` is a `✓`, and it ends `Both consumers install, build and draw.`

- [ ] **Step 4: Rewrite the README**

The README leads with the install, shows `<Terrain />` with no props, and documents the four options in one table. The ranges table, Riffle's `bands` and `labels`, and every per-figure option are gone.

`README.md`
````markdown
# hairline

Six isometric line figures that answer the pointer. For React and for anything with a DOM.

[![npm](https://img.shields.io/npm/v/@lucasmarkes/hairline)](https://www.npmjs.com/package/@lucasmarkes/hairline)
[![CI](https://github.com/lucasmarkes/hairline/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasmarkes/hairline/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@lucasmarkes/hairline)](./LICENSE)

![The six figures: a tray of cards, a field of pillars, a window in layers, a dot matrix, a conveyor belt and a turntable](https://raw.githubusercontent.com/lucasmarkes/hairline/main/assets/hero.gif)

Live, with a slider for `intensity`: **[hairline.lucasmarkes.com](https://hairline.lucasmarkes.com)**

## Install

```sh
npm i @lucasmarkes/hairline
```

No dependencies. ESM only. React 18 or later is an optional peer, needed only by `@lucasmarkes/hairline/react`.

With shadcn, which adds the package and a wrapper that reads your theme's tokens:

```sh
npx shadcn@latest add https://hairline.lucasmarkes.com/r/hairline.json
```

## Use

### React

```tsx
import { Terrain } from "@lucasmarkes/hairline/react";

export function Hero() {
  return <Terrain />;
}
```

The figure fills its parent's width at a 5:4 aspect ratio. The entry is a client module, so a Server Component can render it with no `"use client"` of its own. Every component takes the options below and every `<div>` attribute, and forwards its ref to the `<div>`.

### Anything else

```ts
import { terrain } from "@lucasmarkes/hairline";

const figure = terrain(document.getElementById("figure")!);

figure.update({ intensity: 0.8 });
figure.destroy();
```

A figure draws into the element you give it, at the element's width and a 5:4 aspect ratio. `update` changes options on the running figure; `destroy` removes what the figure added. That is the shape of a Svelte action, so `use:terrain={{ intensity }}` works as it is.

## The figures

| Function | Component | What it is | A stronger `intensity` |
| --- | --- | --- | --- |
| `riffle` | `Riffle` | A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. | The ripple spreads further from the pulled card. |
| `terrain` | `Terrain` | Eighty-one pillars on a plinth that rise around the pointer. | A wider area rises. |
| `exploded` | `Exploded` | An app window in four layers. Moving across opens the gap; moving down picks a layer. | The layers open further. |
| `phosphor` | `Phosphor` | A dot matrix that plays a loop, and fades like phosphor where the pointer paints it. | The trail lingers longer. |
| `slow` | `Slow` | Crates riding a belt through a gate. Hovering slows the clock without stopping it. | Time slows down more. |
| `turntable` | `Turntable` | Blocks on a turntable. A flick spins it; it settles on the nearest quarter turn. | The spin coasts longer. |

## Options

Every figure takes the same four, all optional:

| Option | Type | Default | |
| --- | --- | --- | --- |
| `intensity` | `number` | `0.5` | How strongly the figure answers the pointer, from 0 (subtle) to 1 (strong). A number outside 0…1 is clamped; anything that is not a number is 0.5. |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | `"auto"` follows the page: an ancestor with class `dark` or `data-theme="dark"`, then the page's `color-scheme`. |
| `label` | `string` | a description in English | The accessible name. In React, `aria-label` does the same. |
| `onRead` | `(text: string) => void` | | The figure's caption, each time it changes: `"03"`, `"gap 28.0"`, `"rate 0.20×"`. |

In `update`, a key set to `undefined` goes back to its default, and a key left out stays as it is.

## Theme

Six custom properties, set on the figure or on anything above it:

```css
.figures {
  --hairline-plate: #101014; /* the fill of every plate: the colour the figure sits on */
  --hairline-hi: #fafafa;    /* what is lit */
  --hairline-edge: #a1a1aa;  /* silhouettes */
  --hairline-mid: #52525b;   /* every other stroke */
  --hairline-lo: #27272a;    /* what recedes */
  --hairline-stroke: 0.9;    /* stroke width, in CSS pixels at any size */
}
```

`--hairline-plate` is the one to get right. Plates are filled, not transparent, because a plate hides what is drawn behind it; on a background that is neither white nor `#08090a`, set it to that background.

The figure's styles have no specificity, so any rule of yours wins without `!important`.

## Notes

- **Accessibility.** A figure is an image with a description you can replace with `label`. Riffle is the exception: it is a focusable group, the arrow keys walk its cards, and a live region reads the card out.
- **Reduced motion.** With `prefers-reduced-motion`, the figures that play on their own (Phosphor and Slow) hold still, and every figure still answers the pointer.
- **Performance.** Every figure on a page shares one `requestAnimationFrame` loop. A figure off screen, or at rest, does no work, and the loop stops when nothing is moving.
- **Server rendering.** On the server a component is an empty box with a 5:4 aspect ratio, so nothing shifts when it draws. The functions need a DOM: call them in an effect, in `onMount`, or in a script after the element.
- **Shadow DOM.** A figure mounted inside a shadow root styles itself there.

## More

- [hairline.lucasmarkes.com](https://hairline.lucasmarkes.com): every figure live, an inspector that writes the snippet for you, and a CDN example.
- [The essay](https://lucasmarkes.com/lab/hairline): how the figures are drawn, and why with lines.
- [CHANGELOG.md](https://github.com/lucasmarkes/hairline/blob/main/CHANGELOG.md) and [CONTRIBUTING.md](https://github.com/lucasmarkes/hairline/blob/main/CONTRIBUTING.md).

The style is a study of the illustrations on [Linear](https://linear.app)'s home page.

## License

MIT © Lucas Marques
````

- [ ] **Step 5: Update CONTRIBUTING**

The parity paragraph says what the comparison strips and where the intensities come from, and "Adding an option" becomes "Tuning `intensity`":

`CONTRIBUTING.md`
````markdown
# Contributing

## Setup

Node 22 or later, pnpm 10 (`corepack enable` picks the right one), and Google Chrome for the browser tests.

```sh
pnpm install
pnpm build
```

## Layout

```
packages/hairline   the package: src/core (maths, stage, styles), src/figures (six engines),
                    src/mount.ts (the public lifecycle), src/index.ts and src/react.tsx (the two entries)
apps/site           hairline.lucasmarkes.com (Next.js)
registry            the shadcn item: its source, and the scripts that build and validate it
fixtures            two apps that install the packed tarball: Next.js and Vite
scripts             the release gate and what it calls
```

## Commands

| | |
| --- | --- |
| `pnpm build` | Builds the package, then the site. |
| `pnpm typecheck` | TypeScript, including the type tests in `packages/hairline/test/types.test-d.tsx`. |
| `pnpm test` | Unit and component tests (Vitest, jsdom). |
| `pnpm test:browser` | Browser tests in Chrome (Playwright): the figures, the theme, parity, the site. |
| `pnpm dev` | The site on `localhost:3000`, with the package rebuilding on change. |
| `pnpm release --static` | The release gate without the steps that need the network. CI runs this. |
| `pnpm release` | The whole gate. It never publishes. |
| `node scripts/consumers.mjs` | Packs the package and installs it in both fixtures. |

## The engines, and why their comments mention "the study"

The six engines in `packages/hairline/src/figures`, and `src/core/iso.ts`, `motion.ts` and `stage.ts`, were ported from the essay at [lucasmarkes.com/lab/hairline](https://lucasmarkes.com/lab/hairline), where they are figures 9.1 to 9.6. Their comments still say "the study" and "Fig 9.n": that is the essay.

The port is held to the essay by the parity tests. `packages/hairline/test/parity/golden` holds the SVG each figure drew on the essay's page, under a frozen clock, at four moments of a scripted pointer path; `test/browser/parity.spec.ts` replays the same script against the package, on the same frozen clock, and expects the same SVG and the same caption, character for character. Two things come out of both sides first, because the package no longer has them: Riffle's hidden hit bands, and the names the essay gives Riffle's cards. Where the script changes the option, the package is set to the `intensity` in `test/parity/scripts.mjs` that maps exactly onto the essay's value.

So a change to an engine that moves a line fails parity, and that is the point. If the change is meant, say so in the pull request and update the golden file for that figure by hand. The goldens are not regenerated from the package: `pnpm -C packages/hairline capture <commit> [url]` records them from the essay's site at that commit, and exists for the day the essay changes.

## Tuning `intensity`

Every figure takes one tuning option, `intensity`, from 0 to 1. Each figure turns it into its own number through the table in `packages/hairline/src/intensity.ts`: three values per figure, at 0, 0.5 and 1, joined by two straight lines. The value at 0.5 is the figure's default, so the default drawing never changes.

To change how strongly a figure answers:

1. Change its row in `src/intensity.ts`. `test/intensity.test.ts` checks the row still moves one way only, and that each parity intensity still lands on its golden value.
2. Change the same row in `apps/site/lib/figures.ts`, which keeps a copy for the site's copy. `apps/site/test/docs.test.ts` fails until the two agree.

There are no per-figure options, by design. A new option is a new key in `HairlineOptions` (`src/mount.ts`), for every figure at once.

## Pull requests

- One change per pull request, with a test that fails without it.
- `pnpm typecheck && pnpm test && pnpm test:browser` pass.
- A change a user can see gets a line in `CHANGELOG.md`, under the next version.

## Releasing

Maintainers only.

1. Bump `version` in `packages/hairline/package.json` and add a `## <version> - <date>` section to `CHANGELOG.md`.
2. `pnpm release` passes.
3. Commit, then `git tag v<version> && git push origin main v<version>`.

The tag starts `.github/workflows/publish.yml`, which waits for approval in the `release` environment, publishes to npm with provenance, and creates the GitHub Release from the changelog section. A version with a hyphen (`0.2.0-rc.0`) is published under the `next` dist-tag.
````

Run: `grep -nwE "stagger|radius|afterglow|coast|bands|labels|ranges|w-80" README.md`
Expected: no output, exit code 1. (`-w` matches whole words, so "coasts" in Turntable's row does not count; `gap` and `rate` appear in the `onRead` captions, which is correct.)

- [ ] **Step 6: Commit**

```bash
git add fixtures README.md CONTRIBUTING.md
git commit -m "Docs and fixtures: one intensity option, and the README leads with the install

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 5: The site's copy, snippets and llms.txt speak `intensity`

**Files:**
- Create: `apps/site/lib/size.ts` (the Tiny card's number)
- Modify: `apps/site/lib/figures.ts` (the figures, the intensity mirror, the options table, the theme table, the cards, the links)
- Modify: `apps/site/lib/snippets.ts` (the install commands, the inspector's snippet, the four quickstart tabs)
- Modify: `apps/site/lib/highlight.ts` (no live span any more)
- Modify: `apps/site/lib/llms.ts` (`/llms.txt` with one option and each figure's scale)
- Test: `apps/site/test/docs.test.ts`

**Interfaces:**
- Consumes from Task 1: `TABLE` from `packages/hairline/src/intensity.ts` (the test only, through a relative path, since the package does not export it). From Task 2: the public API and the type `HairlineOptions`.
- Produces, for Task 6's page and components:
  - `apps/site/lib/figures.ts`: `type FigureId`, `type FigureDoc = { id: FigureId; name: string; summary: string; stronger: string; parameter: { name: string; unit: string } }`, `FIGURES: FigureDoc[]` (in the package's order), `INTENSITY: Record<FigureId, readonly [number, number, number]>` (a copy of `TABLE`), `type Row = { name; type; default; description }`, `OPTIONS: Row[]` (intensity, theme, label, onRead), `THEME`, `CARDS: { title; body }[]` and `LINKS`.
  - `apps/site/lib/size.ts`: `tiny(): string`, for example `"16.3 kB"`.
  - `apps/site/lib/snippets.ts`: `PACKAGE`, `install(base: string): { label: string; code: string }[]` (npm, pnpm, yarn, bun, shadcn), `type Theme = "auto" | "light" | "dark"`, `snippet(name: string, state: { intensity: number; theme: Theme }): string`, `REACT`, `VANILLA`, `CDN`, `CSS`, and `PASTE: { label; lang; code }[]` (React, Vanilla, CDN, CSS).
  - `apps/site/lib/highlight.ts`: `highlight(code: string, lang: string): Promise<string>` and `plain(code: string): string`. `LIVE` and the third argument of `highlight` are gone.
  - `apps/site/lib/llms.ts`: `scale(id, parameter): string` and `llms(base: string): string`.

The old `figures.ts` exported `CARDS`, `span`, `shown`, `rows`, `SHARED` and `NOTES`, which the page and the components still import. They go here, so the site's typecheck and build stay red until Task 6 replaces the page. Only `docs.test.ts` has to pass at the end of this task.

- [ ] **Step 1: Write the failing test**

Replace `apps/site/test/docs.test.ts`. It holds the site's copy of the intensity table equal to the package's, ties the options table to the keys of `HairlineOptions` at compile time, pins the inspector's snippet, and checks that no page or file mentions an option the package dropped. "leaves out an intensity that reads as 0.5…" and "shows an intensity of 0…" are Review Focus 3.

`apps/site/test/docs.test.ts`
````ts
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as components from "@lucasmarkes/hairline/react";
import * as figures from "@lucasmarkes/hairline";
import type { HairlineOptions } from "@lucasmarkes/hairline";
import { TABLE } from "../../../packages/hairline/src/intensity";
import { FIGURES, INTENSITY, OPTIONS } from "@/lib/figures";
import { llms, scale } from "@/lib/llms";
import { tiny } from "@/lib/size";
import { PASTE, install, snippet } from "@/lib/snippets";

/** The docs describe the package, and these check that nothing was written by hand around it. */

/* a key added to or taken from HairlineOptions fails the typecheck here, before the table can drift */
const KEYS = { intensity: true, theme: true, label: true, onRead: true } satisfies Record<keyof HairlineOptions, true>;

describe("the figures", () => {
  it("are the package's six, each with a function and a component", () => {
    expect(FIGURES.map((f) => f.id).sort()).toEqual(Object.keys(figures).sort());
    for (const doc of FIGURES) expect(components).toHaveProperty(doc.name);
  });

  it("copy the package's intensity table exactly", () => {
    expect(INTENSITY).toEqual(TABLE);
  });
});

describe("the options table", () => {
  it("has the four keys of HairlineOptions, in that order", () => {
    expect(OPTIONS.map((r) => r.name)).toEqual(Object.keys(KEYS));
  });

  it("gives intensity's default as 0.5", () => {
    expect(OPTIONS[0]).toMatchObject({ name: "intensity", type: "number", default: "0.5" });
  });
});

describe("the inspector's snippet", () => {
  it("is the bare component at the defaults", () => {
    expect(snippet("Terrain", { intensity: 0.5, theme: "auto" })).toContain("<Terrain />");
  });

  it("leaves out an intensity that reads as 0.5 at the slider's precision", () => {
    expect(snippet("Terrain", { intensity: 0.1 + 0.4, theme: "auto" })).toContain("<Terrain />");
    expect(snippet("Terrain", { intensity: 0.5000001, theme: "auto" })).toContain("<Terrain />");
  });

  it("shows an intensity of 0, which is not the default", () => {
    expect(snippet("Riffle", { intensity: 0, theme: "auto" })).toContain("<Riffle intensity={0} />");
  });

  it("shows what differs, intensity first, at two decimals", () => {
    expect(snippet("Slow", { intensity: 0.1 + 0.2, theme: "dark" })).toContain('<Slow intensity={0.3} theme="dark" />');
    expect(snippet("Slow", { intensity: 0.55, theme: "light" })).toContain('<Slow intensity={0.55} theme="light" />');
    expect(snippet("Slow", { intensity: 1, theme: "auto" })).toContain("<Slow intensity={1} />");
  });

  it("imports what it renders", () => {
    expect(snippet("Exploded", { intensity: 0.5, theme: "auto" })).toMatch(/^import \{ Exploded \} from "@lucasmarkes\/hairline\/react";/);
  });
});

describe("the install commands", () => {
  it("put npm first and install from the address the site is built for", () => {
    const commands = install("https://example.test");
    expect(commands.map((c) => c.label)).toEqual(["npm", "pnpm", "yarn", "bun", "shadcn"]);
    expect(commands[0].code).toBe("npm i @lucasmarkes/hairline");
    expect(commands[4].code).toBe("npx shadcn@latest add https://example.test/r/hairline.json");
  });
});

describe("the quickstart", () => {
  it("pastes React, Vanilla, CDN and CSS, and none of them sets an option the package dropped", () => {
    expect(PASTE.map((p) => p.label)).toEqual(["React", "Vanilla", "CDN", "CSS"]);
    for (const p of PASTE) expect(p.code).not.toMatch(/stagger|radius|afterglow|coast|bands|labels|ranges|className/);
  });

  it("sets all six theme properties in the CSS tab", () => {
    const css = PASTE[3].code;
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(css).toContain(`--hairline-${key}:`);
  });
});

describe("the Tiny card", () => {
  it("is the gzip size of the vanilla entry, to a tenth of a kB", () => {
    const bytes = gzipSync(readFileSync(new URL("../../../packages/hairline/dist/index.js", import.meta.url))).length;
    expect(tiny()).toBe(`${(bytes / 1000).toFixed(1)} kB`);
    expect(tiny()).toMatch(/^\d+\.\d kB$/);
  });
});

describe("/llms.txt", () => {
  const text = llms("https://example.test");

  it.each(FIGURES)("names $name with its row of the intensity table", (doc) => {
    expect(text).toContain(`### ${doc.name}`);
    expect(text).toContain(doc.stronger);
    expect(text).toContain(scale(doc.id, doc.parameter));
    for (const n of INTENSITY[doc.id]) expect(scale(doc.id, doc.parameter)).toContain(String(n));
  });

  it("documents the four options, every theme property and the registry item", () => {
    for (const row of OPTIONS) expect(text).toContain(`- \`${row.name}\``);
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(text).toContain(`--hairline-${key}`);
    expect(text).toContain("https://example.test/r/hairline.json");
  });

  it("mentions no option the package dropped", () => {
    expect(text).not.toMatch(/stagger=|radius=|\bbands\b|\blabels\b|\branges\b/);
  });

  it("has no hole in it", () => {
    // outside the code blocks, where `undefined` is a word TypeScript uses
    const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`undefined`/g, "");
    expect(prose).not.toMatch(/undefined|NaN|\[object/);
  });
});
````

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @lucasmarkes/hairline build && pnpm --filter @hairline/site test`
Expected: FAIL. `test/docs.test.ts` fails to load with `TypeError: Cannot convert undefined or null to object` (the old `figures.ts` has no `INTENSITY`), and no test runs.

- [ ] **Step 3: Write the site's library**

Replace `apps/site/lib/figures.ts`. `INTENSITY` is a copy of the package's table, because the package does not export it; the test above keeps the two equal.

`apps/site/lib/figures.ts`
```ts
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
```

Create `apps/site/lib/size.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * The vanilla entry's gzip size with all six figures, as the Tiny card says
 * it: "16.3 kB". Measured at build from the package's own dist, which turbo
 * builds before the site. Next runs the build from apps/site.
 */
export function tiny(): string {
  const file = readFileSync(join(process.cwd(), "../../packages/hairline/dist/index.js"));
  return `${(gzipSync(file).length / 1000).toFixed(1)} kB`;
}
```

Replace `apps/site/lib/snippets.ts`. `snippet` writes only the props that differ from the default, and reads the slider at two decimals, so `0.1 + 0.4` counts as the default and `0` does not:

`apps/site/lib/snippets.ts`
```ts
import { THEME } from "./figures";

/**
 * Every piece of code the page shows, as plain text. The page highlights it;
 * /llms.txt prints it as it is.
 */

export const PACKAGE = "@lucasmarkes/hairline";

/** npm first: it is the command a stranger already knows. */
export function install(base: string): { label: string; code: string }[] {
  return [
    { label: "npm", code: `npm i ${PACKAGE}` },
    { label: "pnpm", code: `pnpm add ${PACKAGE}` },
    { label: "yarn", code: `yarn add ${PACKAGE}` },
    { label: "bun", code: `bun add ${PACKAGE}` },
    { label: "shadcn", code: `npx shadcn@latest add ${base}/r/hairline.json` },
  ];
}

export type Theme = "auto" | "light" | "dark";

/**
 * The inspector's snippet: the component with only the props that differ
 * from the default. The intensity is read to two decimals, the slider's
 * precision, so 0.5 and a float a hair away from it both leave it out.
 */
export function snippet(name: string, state: { intensity: number; theme: Theme }): string {
  const intensity = Math.round(state.intensity * 100) / 100;
  const props = [
    intensity !== 0.5 ? ` intensity={${intensity}}` : "",
    state.theme !== "auto" ? ` theme="${state.theme}"` : "",
  ].join("");
  return `import { ${name} } from "${PACKAGE}/react";\n\n<${name}${props} />\n`;
}

export const REACT = `import { Terrain } from "${PACKAGE}/react";

export default function Page() {
  return <Terrain />;
}
`;

export const VANILLA = `import { terrain } from "${PACKAGE}";

const figure = terrain(document.getElementById("figure")!);

figure.update({ intensity: 0.8 });
figure.destroy();
`;

export const CDN = `<div id="figure" style="width: 400px"></div>

<script type="module">
  import { terrain } from "https://esm.sh/${PACKAGE}";

  terrain(document.getElementById("figure"));
</script>
`;

export const CSS = `/* On a figure or anything above it. Without them a figure is light,
   or dark when the page says so. --hairline-plate must be the colour
   the figure sits on: it hides what is drawn behind each plate. */
.figures {
${THEME.map((t) => `  ${t.property}: ${t.light};`).join("\n")}
}
`;

/** The quickstart's second step. */
export const PASTE: { label: string; lang: string; code: string }[] = [
  { label: "React", lang: "tsx", code: REACT },
  { label: "Vanilla", lang: "ts", code: VANILLA },
  { label: "CDN", lang: "html", code: CDN },
  { label: "CSS", lang: "css", code: CSS },
];
```

Replace `apps/site/lib/highlight.ts`. The inspector's snippet is plain text now, so nothing needs a live span:

`apps/site/lib/highlight.ts`
```ts
import { codeToHtml } from "shiki";

/** Highlighting happens here, at build, so no highlighter reaches the browser. */

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function highlight(code: string, lang: string): Promise<string> {
  return codeToHtml(code.trimEnd(), { lang, theme: "min-light" });
}

/** Plain text in the same wrapper the highlighter writes. */
export function plain(code: string): string {
  return `<pre class="shiki"><code>${escape(code.trimEnd())}</code></pre>`;
}
```

Replace `apps/site/lib/llms.ts`:

`apps/site/lib/llms.ts`
````ts
import { FIGURES, INTENSITY, LINKS, OPTIONS, THEME, type Row } from "./figures";
import { CDN, PACKAGE, REACT, VANILLA, install } from "./snippets";

/** The page as plain text, for a model to read: the same data, the same copy. */

const table = (list: Row[]) => list.map((r) => `- \`${r.name}\` (${r.type}${r.default ? `, default ${r.default}` : ""}): ${r.description}`).join("\n");
const fence = (lang: string, code: string) => "```" + lang + "\n" + code.trimEnd() + "\n```";

/** "stagger 0 ms at 0, 40 ms at 0.5, 90 ms at 1" */
export function scale(id: keyof typeof INTENSITY, parameter: { name: string; unit: string }): string {
  const unit = parameter.unit.startsWith("×") ? parameter.unit : ` ${parameter.unit}`;
  const [lo, mid, hi] = INTENSITY[id];
  return `${parameter.name} ${lo}${unit} at 0, ${mid}${unit} at 0.5, ${hi}${unit} at 1`;
}

export function llms(base: string): string {
  const out: string[] = [
    "# hairline",
    "",
    `> ${PACKAGE}: six isometric line figures that answer the pointer. SVG, no dependencies, ESM only. A function per figure, and a React component per figure. Every figure takes the same four options.`,
    "",
    "## Install",
    "",
    fence("sh", install(base).map((i) => i.code).join("\n")),
    "",
    "## Use",
    "",
    `React: \`import { ${FIGURES.map((f) => f.name).join(", ")} } from "${PACKAGE}/react"\`. Each component renders a \`<div>\`, takes the options below and any \`<div>\` attribute, and forwards its ref. The entry is a client module: render it from a Server Component without writing "use client".`,
    "",
    fence("tsx", REACT),
    "",
    `Vanilla: \`import { ${FIGURES.map((f) => f.id).join(", ")} } from "${PACKAGE}"\`. Each function takes an element and the options, draws into the element, and returns \`{ update(options), destroy() }\`. In \`update\`, a key set to \`undefined\` goes back to its default and a key left out stays as it is.`,
    "",
    fence("ts", VANILLA),
    "",
    "Without a bundler:",
    "",
    fence("html", CDN),
    "",
    "A figure fills its element's width at a 5:4 aspect ratio.",
    "",
    "## Options",
    "",
    table(OPTIONS),
    "",
    "## Figures",
    "",
    "What a higher `intensity` does to each figure, and the number it sets inside the figure (two straight lines through these three points):",
  ];
  for (const doc of FIGURES) {
    out.push("", `### ${doc.name}`, "", doc.summary, "", `Higher intensity: ${doc.stronger} (${scale(doc.id, doc.parameter)}.)`);
  }
  out.push(
    "", "## Theme", "",
    "Six CSS custom properties, set on the figure or on any ancestor. Without them a figure is light, or dark when an ancestor has class `dark` or `data-theme=\"dark\"`, or when the page's `color-scheme` is dark.",
    "", THEME.map((t) => `- \`${t.property}\` (light: ${t.light}): ${t.role}`).join("\n"),
    "", "## Accessibility", "",
    "A figure is an image with a description you can replace with `label`. Riffle is a focusable group: the arrow keys walk its cards and a live region reads out the card's number. Under prefers-reduced-motion, Phosphor and Slow hold still, and every figure still answers the pointer.",
    "", "## Links", "",
    `- Site: ${base}`, `- Source: ${LINKS.github}`, `- npm: ${LINKS.npm}`, `- The essay the figures come from: ${LINKS.essay}`, `- shadcn registry item: ${base}/r/hairline.json`, "",
  );
  return out.join("\n");
}
````

- [ ] **Step 4: Run the test to see it pass**

Run: `pnpm --filter @hairline/site test`
Expected: PASS, `Tests 22 passed (22)` in `test/docs.test.ts`.

Do not run the site's typecheck or build yet: they still fail on `app/page.tsx` and the components, which Task 6 replaces.

- [ ] **Step 5: Commit**

```bash
git add apps/site/lib apps/site/test/docs.test.ts
git commit -m "Site: the copy, the snippets and llms.txt speak one intensity option

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 6: The page: install first, the inspector, the quickstart

**Files:**
- Create: `apps/site/components/copy.tsx` (`useCopy` and `CopyButton`, with the select-the-text fallback)
- Create: `apps/site/components/install.tsx` (the install pill: `$`, the manager, the command, copy)
- Create: `apps/site/components/inspector.tsx` (one figure, its chips, the intensity slider, the theme switch and the live snippet)
- Modify: `apps/site/components/tabs.tsx` (copy through `CopyButton`)
- Delete: `apps/site/components/tile.tsx`, `apps/site/components/figure-demo.tsx`, `apps/site/components/theme-editor.tsx`
- Modify: `apps/site/app/page.tsx`, `apps/site/app/layout.tsx` (Instrument Serif, and the Open Graph alt), `apps/site/app/globals.css`, `apps/site/app/og/page.tsx`
- Test: `apps/site/test/site.spec.ts`

**Interfaces:**
- Consumes from Task 5: `FIGURES`, `OPTIONS`, `CARDS`, `LINKS` and `FigureId` from `@/lib/figures`; `tiny` from `@/lib/size`; `install`, `snippet`, `PASTE`, `PACKAGE` and `Theme` from `@/lib/snippets`; `highlight` and `plain` from `@/lib/highlight`. From Task 2: the six components and `HairlineOptions`.
- Produces:
  - `apps/site/components/copy.tsx`: `useCopy(): [copied: boolean, copy: (text: string, fallback?: Element | null) => void]` and `CopyButton({ text: string | (() => string); select?: RefObject<Element | null>; label?: string; className?: string })`. When the clipboard is missing or refuses, `copy` selects `fallback`'s text and throws nothing.
  - `apps/site/components/install.tsx`: `Install({ commands: { label: string; code: string }[] })`, marked `data-install={label}`.
  - `apps/site/components/inspector.tsx`: `Inspector()`, marked `data-inspector`, Terrain first. The stage is `data-figure={id}`, the read-out `data-read`, the snippet `data-snippet`.
  - The page at `/`, top to bottom: the top bar (version, GitHub, `llms.txt`), the hero (headline, one sentence, the install pill, "Get started" and "GitHub"), the inspector, "One prop, six figures" (one row per figure, with no "Fig. N"), four cards (Tiny, No dependencies, Accessible, Themeable), "Two steps" (install, then paste in four tabs, then the options table with four rows), and the footer. Seven figures mount in all: six in the rows and one in the inspector.
  - `/og`: the headline and one Terrain, which Task 7 photographs.

- [ ] **Step 1: Write the failing test**

Replace `apps/site/test/site.spec.ts`. It runs against the built site in Chrome. "without a clipboard, copy selects the text instead and throws nothing" is Review Focus 4, and "the page fits a phone, with the longest install command and every control" is Review Focus 5. The shadcn command carries `http://localhost:3000`, because off Vercel the build's base URL is `localhost:3000` (`resolveBase()` in `scripts/base-url.mjs`) even though the tests serve on 4320.

`apps/site/test/site.spec.ts`
```ts
import { expect, test, type Page } from "@playwright/test";

const IDS = ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"];
const MANAGERS = [
  ["npm", "npm i @lucasmarkes/hairline"],
  ["pnpm", "pnpm add @lucasmarkes/hairline"],
  ["yarn", "yarn add @lucasmarkes/hairline"],
  ["bun", "bun add @lucasmarkes/hairline"],
  // the build's base URL, which is localhost:3000 off Vercel
  ["shadcn", "npx shadcn@latest add http://localhost:3000/r/hairline.json"],
] as const;

function watch(page: Page): string[] {
  const noise: string[] = [];
  page.on("console", (m) => {
    // Vercel Analytics' script exists only on Vercel
    if (m.location().url.includes("/_vercel/")) return;
    if (m.type() === "error" || m.type() === "warning") noise.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`pageerror: ${e}`));
  return noise;
}

/** The figure's drawing, without the ids that differ between mounts. */
const drawing = (page: Page) => page.locator("[data-inspector] [data-hairline] > svg").evaluate((svg) => svg.innerHTML.replace(/hl-fd\d+/g, ""));

test("the page prerenders empty boxes, then draws seven figures with a clean console", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  // every figure's box is empty on the server (the GitHub icon is the only svg)
  expect(html.match(/<div style="aspect-ratio:5 \/ 4"><\/div>/g)).toHaveLength(7);
  expect(html).not.toMatch(/aspect-ratio:5 \/ 4"[^>]*><svg/);
  expect(html).not.toMatch(/Fig\. \d/);

  const noise = watch(page);
  await page.goto("/");
  // the inspector's, and one per row
  await expect(page.locator("[data-hairline] > svg")).toHaveCount(7);
  for (const id of IDS) await expect(page.locator(`[data-row="${id}"] [data-hairline] > svg > *`).first()).toBeAttached();
  await expect(page.locator("[data-install]").first()).toHaveText(/npm i @lucasmarkes\/hairline/);
  await expect(page.locator("[data-size]")).toHaveText(/^\d+\.\d kB$/);
  await expect(page.locator("[data-version]")).toHaveText(/^v\d+\.\d+\.\d+/);
  expect(noise).toEqual([]);
});

test("the inspector's chips pick the figure, and the snippet follows", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain />");
  await inspector.getByRole("button", { name: "Riffle" }).click();
  await expect(inspector.locator("[data-figure]")).toHaveAttribute("data-figure", "riffle");
  await expect(inspector.locator("[data-hairline]")).toHaveCount(1);
  await expect(inspector.locator("[data-read]")).toHaveText("rest");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText('import { Riffle } from "@lucasmarkes/hairline/react";');
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Riffle />");
});

test("the inspector's slider reaches the figure, and the snippet shows it", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  const slider = inspector.getByRole("slider", { name: "intensity" });
  const stage = inspector.locator("[data-hairline]");
  const box = (await stage.boundingBox())!;
  const hover = async () => {
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(1200);
  };

  await slider.fill("0");
  await expect(inspector.locator("output")).toHaveText("0.00");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain intensity={0} />");
  await hover();
  const subtle = await drawing(page);

  await slider.fill("1");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain intensity={1} />");
  await hover();
  expect(await drawing(page)).not.toBe(subtle);

  await slider.fill("0.5");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain />");
});

test("the inspector's theme switch repaints the figure", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  await inspector.getByRole("button", { name: "Dark" }).click();
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText('<Terrain theme="dark" />');
  const plate = () => inspector.locator("[data-hairline] svg path").first().evaluate((el) => getComputedStyle(el).fill);
  await expect.poll(plate).toBe("rgb(8, 9, 10)");
  await inspector.getByRole("button", { name: "Auto" }).click();
  await expect.poll(plate).toBe("rgb(255, 255, 255)");
});

test("the install pill copies every manager's command", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const pill = page.locator("[data-install]").first();
  for (const [label, code] of MANAGERS) {
    await expect(pill).toHaveAttribute("data-install", label);
    await expect(pill.locator("code")).toHaveText(code);
    await pill.getByRole("button", { name: "Copy" }).click();
    await expect(pill.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await pill.getByRole("button", { name: new RegExp(`^${label}: switch to`) }).click();
  }
  await expect(pill).toHaveAttribute("data-install", "npm");
});

test("without a clipboard, copy selects the text instead and throws nothing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) } });
  });
  const noise = watch(page);
  await page.goto("/");
  const pill = page.locator("[data-install]").first();
  await pill.getByRole("button", { name: "Copy" }).click();
  await expect(pill.getByRole("button", { name: "Copy" })).toBeVisible();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("npm i @lucasmarkes/hairline");

  const snippet = page.locator("[data-snippet]");
  await snippet.getByRole("button", { name: "Copy" }).click();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("<Terrain />");
  expect(noise).toEqual([]);
});

test("the quickstart pastes four ways and lists the four options", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/#quickstart$/);
  const quick = page.locator("section[aria-labelledby=quickstart]");
  await expect(quick.getByRole("tab")).toHaveText(["React", "Vanilla", "CDN", "CSS"]);
  await quick.getByRole("tab", { name: "CSS" }).click();
  await expect(quick.locator(".code-panel")).toContainText("--hairline-plate: #ffffff;");
  await quick.locator(".code").getByRole("button", { name: "Copy" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("--hairline-stroke: 0.9;");
  await expect(quick.locator("[data-options] tbody tr td:first-child")).toHaveText(["intensity", "theme", "label", "onRead"]);
});

test("llms.txt and the registry item are served", async ({ request }) => {
  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  expect(await llms.text()).toContain("# hairline");

  const item = await (await request.get("/r/hairline.json")).json();
  expect(item.name).toBe("hairline");
  expect(item.dependencies).toEqual(["@lucasmarkes/hairline"]);
  expect(item.files[0].path).toBe("components/ui/hairline.tsx");
  expect(item.files[0].content).toContain('"use client"');
});

test("the page fits a phone, with the longest install command and every control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const width = () => page.evaluate(() => document.documentElement.scrollWidth);
  expect(await width()).toBeLessThanOrEqual(390);

  const pill = page.locator("[data-install]").first();
  for (let i = 0; i < 4; i++) await pill.getByRole("button", { name: /: switch to/ }).click();
  await expect(pill).toHaveAttribute("data-install", "shadcn");
  expect(await width()).toBeLessThanOrEqual(390);

  const inspector = page.locator("[data-inspector]");
  for (const name of ["Turntable", "Dark"]) {
    const control = inspector.getByRole("button", { name });
    await control.click();
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await inspector.getByRole("slider", { name: "intensity" }).fill("0.85");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText('<Turntable intensity={0.85} theme="dark" />');
  expect(await width()).toBeLessThanOrEqual(390);
});
```

- [ ] **Step 2: Run the site's typecheck to see it fail**

The browser test needs a build, and the build cannot run yet, so the typecheck is this task's red.

Run: `pnpm --filter @hairline/site typecheck`
Expected: FAIL. Among the errors, all in files this task replaces or deletes:
- `app/page.tsx`: `error TS2305: Module '"@/lib/figures"' has no exported member 'NOTES'` (and `'SHARED'`), `error TS2724: '"@/lib/figures"' has no exported member named 'rows'`, `error TS2305: Module '"@/lib/highlight"' has no exported member 'LIVE'`, `error TS2339: Property 'range' does not exist on type 'FigureDoc'`, and `error TS2322` for `labels` on `<Riffle>`.
- `components/figure-demo.tsx`: no exported member `shown` from `@/lib/figures`, and none named `Range` from `@lucasmarkes/hairline`.
- `components/theme-editor.tsx`: no exported member `themeCss` from `@/lib/snippets`.

`test/site.spec.ts` has no error.

- [ ] **Step 3: Write the copy button and the install pill**

Create `apps/site/components/copy.tsx`. `copy` writes to the clipboard, and when that fails or does not exist it selects the text so the reader can copy it by hand:

`apps/site/components/copy.tsx`
```tsx
"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Copies text, and says so for a moment. Without clipboard permission, or on
 * a page served without a secure context where there is no clipboard at all,
 * it selects the text instead, so the keyboard can copy it.
 */
export function useCopy(): [copied: boolean, copy: (text: string, fallback?: Element | null) => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async (text: string, fallback?: Element | null) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      if (!fallback) return;
      const range = document.createRange();
      range.selectNodeContents(fallback);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  return [copied, copy];
}

/**
 * A button that copies `text`, or selects what `select` points at when it
 * cannot. `text` can be a function, read at the click, for text the button
 * does not own.
 */
export function CopyButton({ text, select, label = "Copy", className = "copy" }: { text: string | (() => string); select?: RefObject<Element | null>; label?: string; className?: string }) {
  const [copied, copy] = useCopy();
  return (
    <button type="button" className={className} onClick={() => copy(typeof text === "function" ? text() : text, select?.current)} aria-live="polite">
      {copied ? "Copied" : label}
    </button>
  );
}
```

Create `apps/site/components/install.tsx`. The manager's name is the button that moves to the next manager; shadcn's shows `npx`:

`apps/site/components/install.tsx`
```tsx
"use client";

import { useRef, useState } from "react";
import { CopyButton } from "./copy";

/**
 * The install command in a pill. The command's first word is a button that
 * moves to the next package manager; the copy button copies the whole line.
 */
export function Install({ commands }: { commands: { label: string; code: string }[] }) {
  const [at, setAt] = useState(0);
  const line = useRef<HTMLElement>(null);
  const { label, code } = commands[at];
  const head = code.slice(0, code.indexOf(" "));
  const next = commands[(at + 1) % commands.length].label;

  return (
    <div className="pill" data-install={label}>
      <span aria-hidden="true" className="select-none text-faint">$</span>
      <code ref={line} className="pill-line">
        <button type="button" className="pill-manager" onClick={() => setAt((at + 1) % commands.length)} aria-label={`${label}: switch to ${next}`} title={`Switch to ${next}`}>
          {head}
        </button>
        {code.slice(head.length)}
      </code>
      <CopyButton text={code} select={line} />
    </div>
  );
}
```

Change `apps/site/components/tabs.tsx` to copy through `CopyButton`:

`apps/site/components/tabs.tsx (diff)`
```diff
--- a/apps/site/components/tabs.tsx
+++ b/apps/site/components/tabs.tsx
@@ -1,41 +1,17 @@
 "use client";
 
-import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
+import { useId, useRef, useState, type KeyboardEvent } from "react";
+import { CopyButton } from "./copy";
 
 export type Tab = { label: string; html: string };
 
-/**
- * Code behind tabs, with a copy button. The HTML is highlighted at build; when
- * `live` is given, every span marked data-live shows it, so a snippet follows
- * a slider without a highlighter in the browser.
- */
-export function Tabs({ tabs, label, live }: { tabs: Tab[]; label: string; live?: string }) {
+/** Code behind tabs, with a copy button. The HTML is highlighted at build. */
+export function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
   const [at, setAt] = useState(0);
-  const [copied, setCopied] = useState(false);
   const panel = useRef<HTMLDivElement>(null);
   const list = useRef<HTMLDivElement>(null);
   const id = useId();
 
-  useEffect(() => {
-    if (live === undefined) return;
-    panel.current?.querySelectorAll("[data-live]").forEach((node) => { node.textContent = live; });
-  }, [live, at]);
-
-  useEffect(() => {
-    if (!copied) return;
-    const timer = setTimeout(() => setCopied(false), 1600);
-    return () => clearTimeout(timer);
-  }, [copied]);
-
-  const copy = async () => {
-    try {
-      await navigator.clipboard.writeText(panel.current?.textContent ?? "");
-      setCopied(true);
-    } catch {
-      // no clipboard permission: the text is still selectable
-    }
-  };
-
   const onKeyDown = (event: KeyboardEvent) => {
     const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
     if (!step) return;
@@ -55,11 +31,11 @@ export function Tabs({ tabs, label, live }: { tabs: Tab[]; label: string; live?:
             </button>
           ))}
         </div>
-        <button type="button" onClick={copy} className="code-copy" aria-live="polite">
-          {copied ? "Copied" : "Copy"}
-        </button>
+        {/* read at the click, so it is always the tab on screen */}
+        <CopyButton text={() => panel.current?.textContent ?? ""} select={panel} />
       </div>
       <div ref={panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${at}`} tabIndex={0} className="code-panel" dangerouslySetInnerHTML={{ __html: tabs[at].html }} />
     </div>
   );
 }
+
```

- [ ] **Step 4: Write the inspector**

Create `apps/site/components/inspector.tsx`. It mounts one figure at a time, Terrain first; the chips pick the figure, the slider sets `intensity` from 0 to 1 in steps of 0.05, the switch sets `theme`, and the snippet below is `snippet(name, { intensity, theme })` as plain text:

`apps/site/components/inspector.tsx`
```tsx
"use client";

import { useId, useRef, useState } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FIGURES, type FigureId } from "@/lib/figures";
import { snippet, type Theme } from "@/lib/snippets";
import { CopyButton } from "./copy";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };
const THEMES: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * One large figure and its three controls: which figure, how intense, which
 * theme. The snippet under them is the code for what is on screen.
 */
export function Inspector() {
  const [id, setId] = useState<FigureId>("terrain");
  const [intensity, setIntensity] = useState(0.5);
  const [theme, setTheme] = useState<Theme>("auto");
  const [read, setRead] = useState("");
  const slider = useId();
  const code = useRef<HTMLPreElement>(null);
  const doc = FIGURES.find((f) => f.id === id)!;
  const Figure = COMPONENTS[id];
  const text = snippet(doc.name, { intensity, theme });

  return (
    <div className="panel grid gap-px md:grid-cols-[3fr_2fr] [&>*]:min-w-0" data-inspector>
      <div className="stage" data-figure={id} data-dark={theme === "dark" || undefined}>
        <Figure key={id} intensity={intensity} theme={theme} onRead={setRead} />
        <span className="cap" data-read aria-hidden="true">{read}</span>
      </div>
      <div className="grid content-start gap-7 bg-white p-6">
        <fieldset>
          <legend className="label">Figure</legend>
          <div className="flex flex-wrap gap-1.5">
            {FIGURES.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={f.id === id} onClick={() => { setId(f.id); setRead(""); }}>
                {f.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={slider} className="label">intensity</label>
            <output htmlFor={slider} className="font-mono text-[12px] tabular-nums text-muted">{intensity.toFixed(2)}</output>
          </div>
          <input id={slider} type="range" className="slider" min={0} max={1} step={0.05} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} />
          <p className="mt-2 text-[13px] leading-[1.5] text-muted">{doc.stronger}</p>
        </div>
        <fieldset>
          <legend className="label">theme</legend>
          <div className="segmented">
            {THEMES.map((t) => (
              <button key={t.value} type="button" aria-pressed={t.value === theme} onClick={() => setTheme(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="code md:col-span-2" data-snippet>
        <div className="code-bar">
          <span className="code-tab" aria-selected="true">React</span>
          <CopyButton text={text} select={code} />
        </div>
        <pre ref={code} className="code-panel">{text}</pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Remove the old components**

```bash
git rm apps/site/components/tile.tsx apps/site/components/figure-demo.tsx apps/site/components/theme-editor.tsx
```

- [ ] **Step 6: Write the page, the layout, the styles and the OG page**

Replace `apps/site/app/page.tsx`:

`apps/site/app/page.tsx`
```tsx
import pkg from "@lucasmarkes/hairline/package.json";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { CopyButton } from "@/components/copy";
import { Inspector } from "@/components/inspector";
import { Install } from "@/components/install";
import { Tabs } from "@/components/tabs";
import { CARDS, FIGURES, LINKS, OPTIONS } from "@/lib/figures";
import { highlight } from "@/lib/highlight";
import { tiny } from "@/lib/size";
import { PASTE, install } from "@/lib/snippets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;
const SMALL = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

function GitHub() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function Heading({ id, title, children }: { id: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-10 max-w-[56ch]">
      <h2 id={id} className="scroll-mt-20 text-[30px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[36px]">{title}</h2>
      {children ? <p className="mt-3 text-[16px] leading-[1.55] text-muted">{children}</p> : null}
    </header>
  );
}

/**
 * The whole site. A Server Component: every figure on it is the package's
 * React component rendered from here, so every deploy runs them through
 * server rendering and hydration.
 */
export default async function Page() {
  const commands = install(SITE);
  const paste = await Promise.all(PASTE.map(async (p) => ({ label: p.label, html: await highlight(p.code, p.lang) })));
  const size = tiny();

  return (
    <>
      <header className="topbar">
        <a href="#top" className="text-[15px] font-medium tracking-[-0.02em]">hairline</a>
        <nav className="flex items-center gap-1">
          <span className="px-2 font-mono text-[12px] text-muted" data-version>v{pkg.version}</span>
          <a className="icon-link" href={LINKS.github} aria-label="GitHub"><GitHub /></a>
          <CopyButton text={`${SITE}/llms.txt`} label="llms.txt" className="btn btn-quiet" />
        </nav>
      </header>

      <main id="top" className="mx-auto grid max-w-[1080px] gap-32 px-[clamp(18px,5vw,28px)] pb-24 pt-16 md:pt-24 [&>*]:min-w-0">
        <section aria-labelledby="hairline" className="grid grid-cols-[minmax(0,1fr)] justify-items-center text-center">
          <h1 id="hairline" className="max-w-[16ch] text-[44px] font-medium leading-[1.02] tracking-[-0.045em] md:text-[64px]">
            Line drawings that <em className="font-serif text-[1.08em] font-normal tracking-[-0.02em]">answer</em> the pointer.
          </h1>
          <p className="mt-5 max-w-[44ch] text-[18px] leading-[1.5] text-muted">
            Six isometric figures for the web. SVG, no dependencies, React or plain DOM.
          </p>
          <div className="mt-9 w-full max-w-[460px]"><Install commands={commands} /></div>
          <div className="mt-5 flex gap-2">
            <a className="btn btn-primary" href="#quickstart">Get started</a>
            <a className="btn" href={LINKS.github}><GitHub /> GitHub</a>
          </div>
        </section>

        <section aria-label="Try it">
          <Inspector />
        </section>

        <section aria-labelledby="figures">
          <Heading id="figures" title="One prop, six figures">
            Every figure takes <code className="font-mono text-[14px] text-ink">intensity</code>, from 0 to 1. Here is what it turns up.
          </Heading>
          <ul className="grid">
            {FIGURES.map((doc) => {
              const Small = SMALL[doc.id];
              return (
                <li key={doc.id} className="figure-row" data-row={doc.id}>
                  <div>
                    <h3 className="font-serif text-[30px] leading-none">{doc.name}</h3>
                    <p className="mt-3 text-[16px] leading-[1.5]">{doc.stronger}</p>
                    <p className="mt-1 max-w-[52ch] text-[14px] leading-[1.55] text-muted">{doc.summary}</p>
                  </div>
                  <div className="tile w-full max-w-[240px] justify-self-end"><Small /></div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Why" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => (
            <div key={card.title} className="card" data-card={card.title}>
              <h3 className="text-[15px] font-medium">{card.title}</h3>
              {card.title === "Tiny" ? <p className="mt-3 font-serif text-[34px] leading-none" data-size>{size}</p> : null}
              <p className="mt-2 text-[14px] leading-[1.5] text-muted">{card.body}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="quickstart">
          <Heading id="quickstart" title={<>Two <em className="font-serif font-normal">steps</em></>} />
          <ol className="grid gap-12">
            <li className="step">
              <h3 className="step-title"><span className="step-n">1</span>Install</h3>
              <div className="max-w-[460px]"><Install commands={commands} /></div>
            </li>
            <li className="step">
              <h3 className="step-title"><span className="step-n">2</span>Paste</h3>
              <p className="mb-4 max-w-[60ch] text-[14px] leading-[1.55] text-muted">
                A figure fills its parent&rsquo;s width at a 5:4 aspect ratio. The React entry is a client module, so a Server Component can render it as it is.
              </p>
              <Tabs tabs={paste} label="Paste" />
            </li>
          </ol>
          <div className="mt-14 overflow-x-auto">
            <table className="props" data-options>
              <thead>
                <tr><th>Option</th><th>Type</th><th>Default</th><th>What it does</th></tr>
              </thead>
              <tbody>
                {OPTIONS.map((row) => (
                  <tr key={row.name}><td>{row.name}</td><td>{row.type}</td><td>{row.default}</td><td>{row.description}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-3 border-t border-line pt-8 text-[13px] text-muted">
          <p>
            MIT licensed. Built by Lucas Marques. After <a className="text-ink" href={LINKS.linear}>Linear</a>&rsquo;s figures.
          </p>
          <nav className="flex gap-5 md:ml-auto">
            <a className="text-ink" href={LINKS.npm}>npm</a>
            <a className="text-ink" href={LINKS.github}>GitHub</a>
            <a className="text-ink" href="/llms.txt">llms.txt</a>
            <a className="text-ink" href={LINKS.essay}>The essay</a>
          </nav>
        </footer>
      </main>
    </>
  );
}
```

In `apps/site/app/layout.tsx`, load Instrument Serif for the headline's one italic word, and describe the new card in the Open Graph alt:

`apps/site/app/layout.tsx (diff)`
```diff
--- a/apps/site/app/layout.tsx
+++ b/apps/site/app/layout.tsx
@@ -2,9 +2,13 @@ import type { Metadata } from "next";
 import type { ReactNode } from "react";
 import { GeistMono } from "geist/font/mono";
 import { GeistSans } from "geist/font/sans";
+import { Instrument_Serif } from "next/font/google";
 import { Analytics } from "@vercel/analytics/next";
 import "./globals.css";
 
+/** The headline's one serif word, and the figure names. */
+const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-instrument-serif" });
+
 const SITE = process.env.NEXT_PUBLIC_SITE_URL!;
 const DESCRIPTION = "Six isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else.";
 
@@ -13,14 +17,14 @@ export const metadata: Metadata = {
   title: "hairline",
   description: DESCRIPTION,
   alternates: { canonical: "/" },
-  openGraph: { title: "hairline", description: DESCRIPTION, url: "/", siteName: "hairline", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "The six hairline figures on a board." }] },
+  openGraph: { title: "hairline", description: DESCRIPTION, url: "/", siteName: "hairline", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Line drawings that answer the pointer: the Terrain figure, its pillars rising." }] },
   twitter: { card: "summary_large_image", title: "hairline", description: DESCRIPTION, images: ["/og.png"], creator: "@lucasmarkes" },
   icons: { icon: "/icon.svg" },
 };
 
 export default function RootLayout({ children }: { children: ReactNode }) {
   return (
-    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
+    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}>
       <body className="font-sans antialiased">
         {children}
         <Analytics />
```

Replace `apps/site/app/globals.css`. The hero's grid column and every step are `minmax(0, 1fr)` and `min-width: 0`, so the shadcn command scrolls inside its pill instead of widening a phone's page, and under 640 px the options table stacks one option per block:

`apps/site/app/globals.css`
```css
@import "tailwindcss";

/* After cuelume: a light canvas, white panels with a soft lift, one serif accent, mono for code. */
@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, monospace;
  --font-serif: var(--font-instrument-serif), Georgia, serif;
  --color-canvas: #fbfaf9;
  --color-stone: #f2f0ed;
  --color-ink: #121212;
  --color-muted: #7e7e7d;
  --color-faint: #a9a7a3;
  --color-line: rgba(18, 18, 18, 0.07);
}

:root {
  --lift: 0 1px 2px #12121208, 0 10px 28px -16px #12121224;
  --lift-lg: 0 1px 2px #12121208, 0 2px 6px #12121208, 0 32px 64px -34px #12121238;
}

html { color-scheme: light; scroll-behavior: smooth; }
body { min-height: 100vh; color: var(--color-ink); background: var(--color-canvas); }
em { font-style: italic; }

.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px clamp(18px, 5vw, 28px);
  background: color-mix(in srgb, var(--color-canvas) 82%, transparent);
  backdrop-filter: blur(12px);
}

.btn {
  display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px;
  border-radius: 9px; font-size: 14px; font-weight: 500;
  background: #fff; box-shadow: inset 0 0 0 1px var(--color-stone), var(--lift);
}
.btn-primary { background: var(--color-ink); color: #fff; box-shadow: var(--lift); }
.btn-quiet { height: 30px; padding: 0 10px; font: 500 12px/1 var(--font-mono); color: var(--color-muted); }
.btn-quiet:hover, .icon-link:hover { color: var(--color-ink); }
.icon-link { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: var(--color-muted); }

.pill {
  display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 6px 0 16px;
  border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1px var(--color-stone), var(--lift);
  font: 400 14px/1 var(--font-mono); text-align: left;
}
.pill-line { flex: 1; min-width: 0; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
.pill-line::-webkit-scrollbar { display: none; }
.pill-manager { border-radius: 5px; padding: 3px 4px; margin: -3px -4px; color: var(--color-ink); text-decoration: underline dotted var(--color-faint); text-underline-offset: 4px; cursor: pointer; }
.pill-manager:hover { background: var(--color-stone); }

.copy { flex: none; border-radius: 7px; padding: 7px 10px; font: 500 12px/1 var(--font-mono); color: var(--color-muted); }
.copy:hover { color: var(--color-ink); background: var(--color-stone); }

.panel { overflow: hidden; border-radius: 16px; background: var(--color-stone); box-shadow: inset 0 0 0 1px var(--color-stone), var(--lift-lg); }
.stage { position: relative; display: grid; place-items: center; padding: clamp(12px, 4vw, 40px); background: #fff; }
.stage > [data-hairline] { width: 100%; max-width: 520px; }
.stage[data-dark] { background: #08090a; }
.cap { position: absolute; left: 18px; bottom: 14px; font: 500 11px/1 var(--font-mono); letter-spacing: 0.02em; color: var(--hairline-edge, #a4a4ac); font-variant-numeric: tabular-nums; pointer-events: none; }
.stage[data-dark] .cap { color: #5b5d64; }

.label { display: block; margin-bottom: 10px; font: 500 11px/1 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); }
.chip { border-radius: 8px; padding: 7px 11px; font-size: 13px; color: var(--color-muted); box-shadow: inset 0 0 0 1px var(--color-stone); }
.chip:hover { color: var(--color-ink); }
.chip[aria-pressed="true"] { background: var(--color-ink); color: #fff; box-shadow: none; }
.segmented { display: inline-flex; padding: 2px; border-radius: 9px; background: var(--color-stone); }
.segmented button { border-radius: 7px; padding: 6px 12px; font-size: 13px; color: var(--color-muted); }
.segmented button[aria-pressed="true"] { background: #fff; color: var(--color-ink); box-shadow: var(--lift); }

.slider { width: 100%; height: 18px; appearance: none; background: transparent; cursor: pointer; }
.slider::-webkit-slider-runnable-track { height: 2px; border-radius: 1px; background: rgba(18, 18, 18, 0.16); }
.slider::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; margin-top: -7px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px rgba(18, 18, 18, 0.2), var(--lift); }
.slider::-moz-range-track { height: 2px; border-radius: 1px; background: rgba(18, 18, 18, 0.16); }
.slider::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px rgba(18, 18, 18, 0.2); }

.code { overflow: hidden; border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1px var(--color-stone); }
.panel .code { border-radius: 0; box-shadow: none; }
.code-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 6px 6px 8px; border-bottom: 1px solid var(--color-line); }
.code-tab { border-radius: 7px; padding: 6px 10px; font: 500 12px/1 var(--font-mono); color: var(--color-muted); }
.code-tab[aria-selected="true"] { background: var(--color-stone); color: var(--color-ink); }
.code-tab:hover { color: var(--color-ink); }
.code-panel { margin: 0; overflow-x: auto; padding: 16px 18px; font: 400 13px/1.65 var(--font-mono); }
.code-panel pre { margin: 0; background: transparent !important; }
.code-panel code { font: inherit; }

.tile { overflow: hidden; border-radius: 14px; background: #fff; box-shadow: inset 0 0 0 1px var(--color-stone), var(--lift); }
.figure-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(120px, 240px); align-items: center; gap: 24px; padding: 28px 0; border-top: 1px solid var(--color-line); }
.figure-row:last-child { border-bottom: 1px solid var(--color-line); }
.card { border-radius: 14px; padding: 20px; background: #fff; box-shadow: inset 0 0 0 1px var(--color-stone); }

.step { min-width: 0; }
.step-title { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 17px; font-weight: 500; }
.step-n { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--color-ink); color: #fff; font: 500 12px/1 var(--font-mono); }

.props { width: 100%; border-collapse: collapse; font-size: 13px; }
.props th { padding: 8px 14px 8px 0; text-align: left; font: 500 11px/1 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); }
.props td { padding: 12px 14px 12px 0; vertical-align: top; border-top: 1px solid var(--color-line); line-height: 1.5; }
.props td:nth-child(-n + 3) { font-family: var(--font-mono); white-space: nowrap; }
.props td:nth-child(2), .props td:nth-child(3) { color: var(--color-muted); }

:is(button, a, input, .code-panel):focus-visible { outline: 1.5px solid var(--color-ink); outline-offset: 2px; }

@media (max-width: 640px) {
  .figure-row { grid-template-columns: minmax(0, 1fr) 120px; gap: 16px; }
  /* one option per block: name, type and default on a line, the description under them */
  .props thead { display: none; }
  .props tr { display: flex; flex-wrap: wrap; column-gap: 12px; padding: 14px 0; border-top: 1px solid var(--color-line); }
  .props td { padding: 0; border: 0; }
  .props td:nth-child(4) { flex-basis: 100%; margin-top: 6px; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

Replace `apps/site/app/og/page.tsx`, which imported the deleted `Tile`, with the headline and one Terrain:

`apps/site/app/og/page.tsx`
```tsx
import type { Metadata } from "next";
import { Terrain } from "@lucasmarkes/hairline/react";

/** The Open Graph card, as a page: scripts/og.mjs photographs it at 1200 × 630 into public/og.png. */
export const metadata: Metadata = { robots: { index: false } };

export default function Og() {
  return (
    <main className="flex h-[630px] w-[1200px] items-center gap-16 overflow-hidden px-20">
      <div className="w-[470px] shrink-0">
        <h1 className="text-[64px] font-medium leading-[1.02] tracking-[-0.045em]">
          Line drawings that <em className="font-serif text-[1.08em] font-normal tracking-[-0.02em]">answer</em> the pointer.
        </h1>
        <p className="mt-8 font-mono text-[18px] text-muted">npm i @lucasmarkes/hairline</p>
      </div>
      <div className="tile flex-1 p-6"><Terrain /></div>
    </main>
  );
}
```

- [ ] **Step 7: Run the site's gates to see them pass**

Run: `pnpm --filter @hairline/site typecheck && pnpm --filter @hairline/site test`
Expected: PASS. `tsc --noEmit` prints nothing, and `Tests 22 passed (22)`.

Run: `pnpm build && pnpm --filter @hairline/site test:browser`
Expected: the build ends with `/`, `/og` and `/llms.txt` prerendered as static (○), then `9 passed`.

Run: `pnpm typecheck && pnpm test`
Expected: every turbo task succeeds, with `Tests 93 passed (93)` for the package and `Tests 22 passed (22)` for the site.

Open `http://localhost:3000` after `pnpm --filter @hairline/site start` and look once at 1200 px and at 390 px (devtools): the install pill is the first thing under the headline, no tile says "Fig.", and Riffle's cards carry no names.

- [ ] **Step 8: Commit**

```bash
git add apps/site/app apps/site/components apps/site/test/site.spec.ts
git commit -m "Site: install first, a live inspector, and the figures without numbers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 7: The Open Graph card, and the preview

**Files:**
- Modify: `scripts/og.mjs` (wait for one figure, not six)
- Modify: `apps/site/public/og.png` (photographed again)

**Interfaces:**
- Consumes from Task 6: the `/og` page (the headline and one Terrain) and the Open Graph alt in `app/layout.tsx`.
- Produces: the pushed branch `site-on-vercel`, its Vercel preview, and the address Lucas reviews. After their approval the base plan resumes at Task 14 Step 7.

The card's script waited for six figures to draw, and the card has one now.

- [ ] **Step 1: Wait for the one figure**

`scripts/og.mjs (diff)`
```diff
--- a/scripts/og.mjs
+++ b/scripts/og.mjs
@@ -24,8 +24,8 @@ try {
   await browser.close();
   process.exit(1);
 }
-await page.waitForFunction(() => document.querySelectorAll("[data-hairline] > svg > *").length >= 6 && document.fonts.status === "loaded");
-// Phosphor and Slow play on their own: give them a moment to be mid-loop.
+await page.waitForFunction(() => document.querySelectorAll("[data-hairline] > svg > *").length >= 1 && document.fonts.status === "loaded");
+// let the figure finish its first frames
 await page.waitForTimeout(1200);
 const out = join(SITE, "public/og.png");
 await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
```

- [ ] **Step 2: Photograph the card**

Run, in one terminal: `pnpm build && pnpm --filter @hairline/site start`
Run, in another: `node scripts/og.mjs`
Expected: `wrote …/apps/site/public/og.png`, exit code 0. Stop the server afterwards.

Open `apps/site/public/og.png`: 2400 × 1260 (1200 × 630 at twice the density), the headline "Line drawings that *answer* the pointer." with "answer" in Instrument Serif italic, `npm i @lucasmarkes/hairline` under it, and Terrain's grid on the right. No "Fig." and no six tiles.

- [ ] **Step 3: Run every gate once more**

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm test:browser`
Expected: every turbo task succeeds: `Tests 93 passed (93)` and `Tests 22 passed (22)`, then `19 passed` for the package and `9 passed` for the site.

Run: `node scripts/consumers.mjs`
Expected: `Both consumers install, build and draw.`

- [ ] **Step 4: Commit**

```bash
git add scripts/og.mjs apps/site/public/og.png
git commit -m "OG card: the headline and one figure, photographed again

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 5: Push and watch the checks**

```bash
git push origin site-on-vercel
gh pr checks 1 --watch
```

Expected: every check on PR #1 passes, the Vercel preview among them.

- [ ] **Step 6: Check the preview**

Run: `vercel ls hairline --scope lucasmarkes-team-projects | head -5`
Expected: the newest row is a Preview deployment in state `● Ready`. Its URL is `PREVIEW` below.

Previews are protected, so read them through the CLI, which bypasses the protection:

Run: `vercel curl /llms.txt --deployment PREVIEW | head -3`
Expected: `# hairline`, a blank line, then the summary ending `Every figure takes the same four options.`

Run: `vercel curl /r/hairline.json --deployment PREVIEW | grep -o '"docs":"[^"]*"'`
Expected: `"docs":"Docs: https://` followed by the preview's own host. A host of `localhost:3000` means the build did not see `VERCEL_URL` (see `scripts/base-url.mjs`).

Run: `vercel curl / --deployment PREVIEW | grep -o '<meta property="og:image"[^>]*>'`
Expected: one tag whose `content` is the preview's own `https://` address ending `/og.png`.

- [ ] **Step 7: Ask Lucas to review the preview**

Send Lucas `PREVIEW` and ask them to look at it on a laptop and on a phone: the install pill first, the inspector (chips, slider, theme, snippet), the six figures with no "Fig. N", Riffle with no names, and the options table. Their changes go back through the task that owns the code. When they approve, the base plan resumes at Task 14 Step 7, where Lucas merges PR #1 themselves. When it reaches Task 15, the 0.1.0 changelog entry describes this API: one `intensity` option for all six figures, no per-figure options, and no `ranges` export.
