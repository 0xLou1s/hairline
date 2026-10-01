# Hairline: one prop, and a site that leads with the install

An amendment to `2026-10-01-hairline-package-design.md` (the base spec). It comes from Lucas's review of the first Vercel preview (Task 14 of the base plan). Nothing is published yet, so the API can still change without a major version.

Where this document speaks to a topic, it replaces the base spec on that topic. Everything else in the base spec stands.

## Why

Lucas's review, in short:

1. The six figures each take a differently named option: `stagger`, `radius`, `gap`, `afterglow`, `rate`, `coast`. A consumer has to learn six words and six units to do one thing, which is to make a figure react more or less.
2. Riffle's `bands` and `labels` make no sense to a consumer. The cards should carry no names at all.
3. The "Fig. 1 … Fig. 6" corner labels on the site's tiles should go.
4. The install command should come first.
5. The site should take its structure from https://cuelume-site.pages.dev/.

## Goals

- One options type for all six figures, with one tuning prop, `intensity`.
- `<Riffle />` with no props is the complete minimal example.
- The visual at the default is exactly today's, so the parity goldens still hold.
- A one-page site, in cuelume's structure: install first, a live inspector, then a two-step quickstart.

## Non-goals

- New figures, new behaviour, or a new look for the figures.
- Per-figure fine tuning. A consumer who needs a 37 ms stagger is not served by 0.1.0.
- Changing the theme, the styles, the mount, SSR, the build, the gates or the release flow.

## The package API

### Options

Every figure takes the same options:

```ts
type HairlineOptions = {
  /** How strongly the figure answers the pointer, from 0 (subtle) to 1 (strong). Default 0.5. */
  intensity?: number;
  /** "auto" follows the page. Default "auto". */
  theme?: "auto" | "light" | "dark";
  /** The accessible name. Each figure has a default description in English. */
  label?: string;
  /** The figure's caption, each time it changes. Called once at mount with the rest caption. */
  onRead?: (text: string) => void;
};

type Figure = {
  update(options: HairlineOptions): void;
  destroy(): void;
};
```

```ts
import { riffle } from "@lucasmarkes/hairline";

const fig = riffle(el);
fig.update({ intensity: 0.8 });
fig.destroy();
```

The vanilla entry exports the six functions and the types `HairlineOptions` and `Figure`. Each function is `(el: HTMLElement, options?: HairlineOptions) => Figure`.

### What `intensity` does to each figure

Each figure turns `intensity` into its own parameter, internally. The map is two straight lines that meet at 0.5. At 0.5 each parameter has today's default, and 0 and 1 give today's limits:

| Figure | Parameter (internal) | 0 | 0.5 | 1 | What "stronger" means |
| --- | --- | --- | --- | --- | --- |
| Riffle | stagger (ms) | 0 | 40 | 90 | The ripple spreads further from the pulled card |
| Terrain | radius (cells) | 1.5 | 3 | 5 | A wider area rises |
| Exploded | gap (viewBox units) | 12 | 28 | 40 | The layers open further |
| Phosphor | afterglow (ms) | 150 | 520 | 1500 | The trail lingers longer |
| Slow | rate (× normal speed) | 0.6 | 0.2 | 0.05 | Time slows down more |
| Turntable | coast (ms) | 200 | 650 | 1500 | The spin coasts longer |

For `i` at or below 0.5, the value is `lo + (i / 0.5) * (mid - lo)`. Above 0.5 it is `mid + ((i - 0.5) / 0.5) * (hi - mid)`. The result is rounded to three decimal places, so `0.7` gives Riffle exactly 60 ms and not 59.99999999999999.

The map lives in one internal module, `src/intensity.ts`, with a table of these six rows and one function, `parameter(figure, intensity): number`. It is not exported from either entry.

### Values `intensity` accepts

- A finite number is clamped to 0…1.
- A numeric string is read as a number, as an attribute or a form field would give it.
- Anything else (`undefined`, `NaN`, `Infinity`, `""`, an object) means the default, 0.5.
- `update({ intensity: undefined })` puts the figure back to 0.5. A key absent from `update` leaves that option as it was. The base spec's rule for `theme`, `label` and `onRead` is unchanged.

### Riffle

- `bands` and `labels` are removed.
- The caption is the card's number only: `"03"` for the third card, `"rest"` at rest.
- The live region names the pulled card by its number only.
- The engine no longer draws the hit bands. The band geometry that decides which card is pulled stays as it is: selection does not change.

### Removed from the public API

- The options `stagger`, `radius`, `gap`, `afterglow`, `rate`, `coast`, `bands` and `labels`.
- The exports `ranges` and `Range`.
- The types `BaseOptions`, `Theme`, `RiffleOptions`, `TerrainOptions`, `ExplodedOptions`, `PhosphorOptions`, `SlowOptions` and `TurntableOptions`.
- From the React entry: `FigureProps`, `FigureComponent`, and the six `*Props` types.

### React entry

```tsx
import { Riffle } from "@lucasmarkes/hairline/react";

<Riffle />
<Riffle intensity={0.8} onRead={setText} />
```

Every component takes `HairlineProps`: `HairlineOptions` plus every `<div>` attribute except `children`. `ref` reaches the `<div>`. The React entry exports the six components and the type `HairlineProps`.

The figure fills its parent's width at an aspect ratio of 5 / 4, so no example needs a width class. The site's snippets and the README drop `className="w-80"`.

The rest of the base spec's React section stands: `"use client"`, the inline aspect ratio, the layout effect, StrictMode, the empty box under SSR.

### What is public API

Covered by semver: the six functions, the six components, the types `HairlineOptions`, `Figure` and `HairlineProps`, the six custom property names, and the `data-hairline` and `data-hairline-theme` attributes. The internal parameters behind `intensity`, and the class names inside the SVG, are not.

## Testing

What changes in the base spec's six layers.

1. **Parity.**
   - The goldens stay as they are. They are not captured again.
   - The checkpoints before `set` already run at the default, which is now `intensity: 0.5`.
   - At `set`, the package side sets the `intensity` whose mapped value is the golden's value:

     | Figure | Golden value | `intensity` |
     | --- | --- | --- |
     | Riffle | 60 | 0.7 |
     | Terrain | 4 | 0.75 |
     | Exploded | 36 | 5/6 |
     | Phosphor | 900 | 0.5 + 190/980 |
     | Slow | 0.4 | 0.25 |
     | Turntable | 1000 | 0.5 + 175/850 |

     `scripts.mjs` keeps the golden's raw value next to each intensity.
   - A unit test asserts that `parameter(figure, intensity)` returns that raw value exactly, for all six.
   - The comparison removes the golden's `<g class="bands">…</g>` group before comparing, the way it already normalises ids. The package no longer draws it.
2. **Maths.** Unchanged, plus `src/intensity.ts`:
   - For each figure, 0, 0.5 and 1 give the table's three values.
   - The map is monotonic. It rises for five figures and falls for Slow.
   - Clamping, numeric strings, and the default for anything else, with the cases the old `ranges` test had.
3. **Lifecycle.**
   - The old option tests become `intensity` tests: bad values fall back to 0.5, and `update({ intensity: undefined })` resets.
   - The `bands` and `labels` tests are removed.
   - A new test: Riffle's caption and live region carry only the number.
   - A new test, per figure: `intensity: 0` and `intensity: 1` produce different markup from the default after the same pointer move. This pins that the prop reaches every engine.
4. **Browser.** Unchanged.
5. **Types.**
   - `riffle(el, { intensity: 0.8 })` and `<Riffle intensity={0.8} />` compile.
   - `{ stagger: 60 }`, `{ bands: true }`, `{ labels: [] }` and `{ radius: 3 }` are compile errors, on every figure and every component.
   - `HairlineOptions`, `Figure` and `HairlineProps` are exported. `ranges` and the old types are not.
6. **Real consumers.** The fixtures use `intensity` where they used an option. The rest is unchanged.

## The site

It replaces the base spec's "The site" section. The stack is unchanged: Next.js App Router, statically prerendered, Tailwind, Geist and Geist Mono, the package imported through its public entries, and Shiki at build with a live span the client swaps.

The look follows cuelume: a light ground, generous white space, one centred column, a serif italic accent word in the headline, and mono for code. The figures keep their own palette. No tile carries a "Fig. N" label or a caption corner.

One page, top to bottom:

1. **Top bar.** `hairline` on the left. On the right: the version from the package's `package.json`, a GitHub icon link, and an `llms.txt` button that copies the file's URL.
2. **Hero, install first.**
   - The headline "Line drawings that *answer* the pointer.", with *answer* in an italic serif.
   - One sentence: "Six isometric figures for the web. SVG, no dependencies, React or plain DOM."
   - The install pill, `$ npm i @lucasmarkes/hairline`. Clicking the manager name cycles npm, pnpm, yarn, bun and shadcn. A copy button copies the current command.
   - Two buttons: "Get started", which scrolls to the quickstart, and "GitHub".
3. **Live panel.** It replaces the 3 × 2 grid.
   - A large figure on the left.
   - An inspector on the right: six chips naming the figures (one is selected), the `intensity` slider from 0 to 1 in steps of 0.05, and a theme switch for Auto, Light and Dark.
   - Under both, the snippet for the current state, which follows the controls. It shows only the props that differ from the default: `<Terrain />` at rest, `<Terrain intensity={0.8} theme="dark" />` after changes. It has a copy button.
4. **"One prop, six figures."** One row per figure: its name in italic, one sentence on what `intensity` does to it (from the table above), and a small live figure on the right. No props tables, no "Fig. N".
5. **Four cards.**
   - *Tiny*: the gzip size of the vanilla entry with all six figures, measured at build with Node's `zlib` from `packages/hairline/dist/index.js`, and rounded to a tenth of a kB.
   - *No dependencies*.
   - *Accessible*: keyboard, screen reader and reduced motion.
   - *Themeable*: six CSS variables.
6. **Quickstart, "Two steps".**
   - Step 1: install, the same pill as the hero.
   - Step 2: paste, with tabs React, Vanilla, CDN and CSS. CSS shows the six custom properties and the note about `--hairline-plate`.
   - One options table with four rows: `intensity`, `theme`, `label`, `onRead`.
7. **Footer.** "MIT licensed. Built by Lucas Marques. After Linear's figures." Links: npm, GitHub, `llms.txt`, and the essay at `lucasmarkes.com/lab/hairline`.

Removed from the base spec's page: the six per-figure sections with their props tables, the full theme editor (its job goes to the inspector's theme switch and the CSS tab), the Frameworks section (the CDN tab covers plain HTML), and the Notes section (the Accessible card carries the facts).

Also served, as in the base spec:

- `/llms.txt`, generated at build from `src/intensity.ts`'s table and the page's copy. It describes the four options and what `intensity` does to each figure.
- `/r/hairline.json`, the registry item.
- The Open Graph image, captured by `scripts/og.mjs` from a dedicated route, redrawn in the new style: the headline and one large figure.
- Vercel Analytics.

The site's tests:

- The quickstart's options table matches `HairlineOptions`'s four keys.
- `/llms.txt` names each figure with its row from the intensity table.
- The browser test checks that the inspector's slider and chips change the live figure and the snippet, and that copy works on every install manager.

## The shadcn registry item

Unchanged, except that the six re-exported components take `HairlineProps`. The item's file builds in `fixtures/next-app` with `<Riffle intensity={0.8} />`.

## Changelog

The 0.1.0 entry in the base plan's Task 15 describes this API: one `intensity` option for all six figures, no per-figure options, and no `ranges` export.

## Where the work happens

On the branch `site-on-vercel` (PR #1), before it merges. The PR's preview is what Lucas reviews again, which is the gate for phase 4. Tasks 15 and 16 of the base plan follow unchanged, except for the changelog text above.
