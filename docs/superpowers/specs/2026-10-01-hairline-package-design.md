# hairline — design

Six isometric line figures that answer the pointer, as an npm package. Drop-in for React and for anything with a DOM.

The figures already exist: they are the essay at `lucasmarkes.com/lab/hairline`. People who saw them asked to use them. This project takes them out of the website and ships them as `@lucasmarkes/hairline`, with a site of their own at `hairline.lucasmarkes.com`.

## Goal and success

Someone who saw the tweet installs a figure in their own project with one command and one line of code, and it looks and moves exactly as it did in the video.

Done means:

- `@lucasmarkes/hairline@0.1.0` is on npm with provenance.
- `hairline.lucasmarkes.com` is live, with every figure running and documented.
- A clean Next.js project and a clean Vite project install the package and draw a figure with no configuration.
- `lucasmarkes.com/lab/hairline` is unchanged.

## Locked decisions

Do not reopen without asking.

| Decision | Choice |
| --- | --- |
| Name | `@lucasmarkes/hairline`. One package, two entries: `.` (vanilla) and `./react`. |
| Scope of v1 | The six figures, ready to use: Riffle, Terrain, Exploded, Phosphor, Slow, Turntable. The maths and the loop stay private. |
| What a figure draws | Only the drawing. No frame, no corner text, no slider. |
| Construction | Port and wrap. The engines move as they are; the public API is a thin layer over them. Parity with the website is tested. |
| Module format | ESM only. |
| Repository | New, `lucasmarkes/hairline`. pnpm workspaces and Turborepo, as in motes. |
| Site | One page, showcase and docs together. Next.js App Router, prerendered. |
| Distribution | npm, plus one shadcn registry item served by the site. |
| Website | `lucasmarkes.com/lab/hairline` keeps its own copy of the code. It does not migrate. |
| Licence | MIT. |
| Language | TypeScript, strict. English in code, docs and site. |

### Out of scope for v1

- A public kit for drawing your own figures (camera, prisms, springs, loop).
- The rest pose rendered on the server.
- CommonJS output.
- Web Components.
- Wrappers for Vue, Svelte or Astro. The site shows how to use the vanilla entry in each.
- A linter or formatter, and Changesets.
- A Claude skill.

## Source

The code to port is in the website repository, on `main` at `edfebe9`:

| Website path | What it is |
| --- | --- |
| `lib/hairline/iso.ts` | Projection and path maths. No DOM. |
| `lib/hairline/motion.ts` | Springs, tweens, the reduced-motion flag. |
| `lib/hairline/riffle-geometry.ts`, `turntable-geometry.ts` | Geometry two figures share with their tests. |
| `lib/hairline/figures.ts` | Labels, hints, slider ranges and defaults. |
| `components/hairline/stage.ts` | SVG helpers, the shared frame loop, the pointer, tear-down. |
| `components/hairline/figures/*.ts` | The six engines. Each exports `mount(els, value) → { set, destroy }`. |
| `components/hairline-figure.tsx` | The React frame. Not ported: it is the website's chrome. |
| `app/globals.css`, the `.hairline` block | The drawing's styles. |
| `tests/hairline.spec.ts`, `tests/hairline-geometry.spec.ts` | Existing tests, to port. |

About 1,650 lines, with no dependencies.

## Repository layout

```
packages/hairline/        @lucasmarkes/hairline
  src/
    core/                 iso.ts, motion.ts, stage.ts, styles.ts
    figures/              riffle.ts, terrain.ts, exploded.ts, phosphor.ts, slow.ts, turntable.ts
    mount.ts              the public wrapper around an engine
    ranges.ts             option ranges and defaults
    index.ts              entry "."
    react.tsx             entry "./react"
  test/
    parity/               golden SVGs, the pointer scripts, the virtual clock
apps/site/                hairline.lucasmarkes.com
registry/                 src/hairline.tsx, build.mjs
fixtures/                 next-app/, vite-vanilla/
scripts/                  release.mjs, capture-golden.mjs, base-url.mjs, og.mjs
.github/workflows/        ci.yml, publish.yml
```

## The package

### Vanilla entry

```ts
import { riffle } from "@lucasmarkes/hairline";

const fig = riffle(el, { stagger: 40, onRead: (text) => {} });
fig.update({ stagger: 60 });
fig.destroy();
```

One function per figure: `riffle`, `terrain`, `exploded`, `phosphor`, `slow`, `turntable`. A project that uses one figure does not bundle the other five, and each function accepts only its own options.

```ts
type Figure<O> = {
  update(options: Partial<O>): void;
  destroy(): void;
};

type BaseOptions = {
  /** "auto" follows the page. Default "auto". */
  theme?: "auto" | "light" | "dark";
  /** The accessible name. Each figure has a default description in English. */
  label?: string;
  /** The figure's caption, each time it changes. Called once at mount with the rest caption. */
  onRead?: (text: string) => void;
};
```

| Function | Options | Range | Default |
| --- | --- | --- | --- |
| `riffle` | `stagger` (ms) | 0–90 | 40 |
| | `bands` (show the hit bands) | boolean | `false` |
| | `labels` (names for the eight cards) | up to 8 strings | none |
| `terrain` | `radius` (cells) | 1.5–5 | 3 |
| `exploded` | `gap` (viewBox units) | 12–40 | 28 |
| `phosphor` | `afterglow` (ms) | 150–1500 | 520 |
| `slow` | `rate` (× of normal speed) | 0.05–0.6 | 0.2 |
| `turntable` | `coast` (ms) | 200–1500 | 650 |

A number outside its range is clamped. Every option has JSDoc with its unit, range and default.

The entry also exports `ranges`: a typed constant with `min`, `max`, `step`, `default` and `unit` for every numeric option. A consumer builds a slider from it; the site builds its controls and its props tables from it.

The captions are the website's read-outs, unchanged (`"cell 3·4"`, `"az 045° · el 30°"`). Riffle reports `"03"` for the third card, or `"03 · Dock"` when `labels` is given.

### What a mount does to the element

`el` is any empty `HTMLElement`. The mount:

1. Destroys a figure already mounted on `el`, if there is one.
2. Injects the stylesheet into `el`'s root (the document or a shadow root), once per root.
3. Sets `data-hairline="<figure>"` and, when `theme` is not `"auto"`, `data-hairline-theme`.
4. Sets `role="img"` and `aria-label`. Riffle gets `role="group"` and `tabindex="0"` instead, because it works from the keyboard. An attribute already on the element is never overwritten.
5. Appends `<svg viewBox="0 0 400 320" aria-hidden="true">` and runs the engine on it.
6. For Riffle, appends a visually hidden `aria-live="polite"` element that names the pulled card.

`destroy` removes what the mount added and nothing else. It can be called more than once. Importing the package on a server touches no global; calling a figure function without a DOM throws an error that says so.

### React entry

```tsx
import { Riffle } from "@lucasmarkes/hairline/react";

<Riffle stagger={40} onRead={setText} className="w-80" />
```

Six components: `Riffle`, `Terrain`, `Exploded`, `Phosphor`, `Slow`, `Turntable`. Props are the figure's options plus every `<div>` attribute except `children`. `ref` reaches the `<div>`.

- The built file starts with `"use client"`, so a Server Component can render a figure directly.
- The `<div>` carries `aspect-ratio: 5 / 4` inline, so the box has its size before the stylesheet exists and the page does not shift.
- The engine mounts in a layout effect and is destroyed on unmount. A changed option reaches it as `update`. StrictMode's double mount is safe.
- On the server the box is empty. The drawing appears when the component mounts.

### Styles and theme

No CSS import. The stylesheet is about 1 KB and is injected on the first mount through `adoptedStyleSheets`, which a strict Content Security Policy allows and which works inside a shadow root. Where `adoptedStyleSheets` is missing, a `<style>` element is appended instead.

Every selector is wrapped in `:where()`, so the package's rules have zero specificity and any consumer rule wins.

The root is `display: block; position: relative; aspect-ratio: 5 / 4; touch-action: pan-y; user-select: none`. It takes its parent's width. Strokes do not scale: a figure has the same line weight at any size.

Six custom properties are the theme:

| Property | Role | Light | Dark |
| --- | --- | --- | --- |
| `--hairline-plate` | Fill of every solid. It hides the lines behind it. | `#ffffff` | `#08090a` |
| `--hairline-hi` | The lit stroke. | `#232327` | `#d0d6e0` |
| `--hairline-edge` | Silhouettes. | `#a4a4ac` | `#5b5d64` |
| `--hairline-mid` | Default stroke. | `#c3c3c9` | `#3e3e44` |
| `--hairline-lo` | Creases. | `#e0e0e4` | `#29292d` |
| `--hairline-stroke` | Stroke width, in px. | `0.9` | `0.9` |

Which palette applies, first match wins:

1. `theme: "light"` or `"dark"`.
2. An ancestor with class `dark` or `data-theme="dark"`.
3. The page's `color-scheme`, through `light-dark()`.
4. Light.

`prefers-color-scheme` is not read directly: a site with only a light theme must not get a dark figure because the visitor's system is dark. A browser without `light-dark()` skips step 3.

The root has no background. Solids are filled with `--hairline-plate`, so on a surface of another colour they read as paper shapes. Setting `--hairline-plate` to the surface colour blends them in; the docs say so at the top of the theme section.

### Behaviour kept from the website

- One frame loop for every figure on the page. It stops when all of them have settled.
- A figure outside the viewport sleeps.
- `prefers-reduced-motion` is honoured: tweens land at once.
- Touch: a sideways drag reaches the figure; a vertical one scrolls the page. A lifted finger holds the pose for 1.4 s.

### Build

- tsup, two builds. The React build marks `react` and `@lucasmarkes/hairline` as external and imports the core by the package's own name, so both entries share one copy of the frame loop.
- ESM only, `target: es2020`, declarations, source maps.
- `"sideEffects": false`. Styles are injected at mount, not at import.
- No dependencies. `react >=18` is an optional peer dependency.

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  "./react": { "types": "./dist/react.d.ts", "default": "./dist/react.js" },
  "./package.json": "./package.json"
}
```

### What is public API

Covered by semver: the exports of the two entries, the six custom property names, and the `data-hairline` and `data-hairline-theme` attributes. The class names inside the SVG are not.

## Testing

Six layers.

1. **Parity with the website.** `scripts/capture-golden.mjs` opens a production build of the website's `/lab/hairline` under a virtual clock, runs a fixed pointer script on each figure, and writes the SVG markup and the caption at fixed checkpoints to `packages/hairline/test/parity/golden/<figure>.json`. Each script covers the rest pose, a hover, a leave, and a changed option. The package's Playwright test runs the same scripts on the package and must produce the same markup, with gradient and mask ids normalised. The goldens are committed. After 0.1.0 they are regression snapshots; the script is run again only to re-baseline on purpose.
2. **Maths** (Vitest, node). The five tests of `hairline-geometry.spec.ts`, ported.
3. **Lifecycle** (Vitest, jsdom, with `IntersectionObserver` and `matchMedia` stubbed). Mount then destroy leaves no node, listener or attribute. A second mount replaces the first. StrictMode. `renderToString` in node. The stylesheet is injected once per root. Options clamp. Host attributes are not overwritten.
4. **Behaviour in a browser** (Playwright). Turntable seats on a quarter turn after a flick. Riffle answers the arrow keys and announces the card. The palette follows each of the four theme rules. Reduced motion. No console output.
5. **Types.** Type tests for both entries: `riffle(el, { radius: 3 })` is a compile error.
6. **Real consumers.** The release gate packs the tarball and installs it in `fixtures/next-app` (App Router, the component rendered from a Server Component) and `fixtures/vite-vanilla`. Each is built and opened in a browser, and the test checks that the figure is drawn and the console is clean.

### Package gates

- `publint` and `@arethetypeswrong/cli`, with the ESM-only profile.
- `size-limit`, one budget per entry and one for a single figure imported alone. Each budget is the size of the first green build plus 10%, written into `package.json` in phase 3.
- Tarball inspection: only `dist`, `README.md`, `LICENSE` and `package.json`; no `workspace:` range; no dependencies; `react.js` starts with `"use client"`.

### CI

On every pull request and every push to `main`: install, build, typecheck, layers 1 to 5, and the static gates (`pnpm release --static`). Layer 6 runs in the release gate and on pull requests that touch `packages/`.

## Release

The motes flow.

1. Bump the version, add the entry to `CHANGELOG.md`, commit, tag `v<version>`.
2. The tag starts `publish.yml`, which waits for approval in the protected `release` environment.
3. The workflow checks that the tag matches the manifest, runs the full gate, runs `pnpm pack`, and publishes the tarball with `npm publish --provenance --access public`.
4. A version with a pre-release suffix (`0.1.0-rc.0`) is published under the `next` dist-tag. Any other goes to `latest`.
5. The workflow creates the GitHub Release from the changelog entry.

Authentication is an `NPM_TOKEN` secret scoped to the `release` environment.

## The site

`apps/site`, Next.js App Router, statically prerendered, Tailwind, Geist and Geist Mono. It imports the package from the workspace through its public entries only, so every deploy exercises Server Components and hydration against the real API.

The look is the tweet videos': warm paper ground, white tiles with a soft shadow, mono captions in the corners.

One page:

1. **Hero.** The name, one sentence, the six figures live in a 3 × 2 grid, and the install command with tabs for pnpm, npm, yarn, bun and shadcn, each with a copy button.
2. **One section per figure.** The live figure in a tile with its caption; a slider for its option, built from `ranges`; the code for React and for vanilla, which follows the slider; a copy button; the props table.
3. **Theme.** The six properties with a live editor, and the note about `--hairline-plate`.
4. **Frameworks.** Snippets for Next.js, Vue, Svelte, Astro, and plain HTML from a CDN.
5. **Notes.** Accessibility, reduced motion, performance, and the empty box under SSR.
6. **Footer.** GitHub, npm, the essay at `lucasmarkes.com/lab/hairline`, the credit to Linear's home page as the inspiration, MIT.

Also served:

- `/llms.txt`: the docs as plain text, generated at build from `ranges` and the same copy as the page.
- `/r/hairline.json`: the registry item.
- The Open Graph image, a screenshot of a dedicated route taken by `scripts/og.mjs` and committed.
- Vercel Analytics.

Code snippets are highlighted at build time. The live value is a marked span the client swaps, so no highlighter ships to the browser. A test asserts that the props tables match `ranges`.

## The shadcn registry item

```
npx shadcn@latest add https://hairline.lucasmarkes.com/r/hairline.json
```

One item. It adds `@lucasmarkes/hairline` as a dependency and writes `components/ui/hairline.tsx`: the six components, re-exported with the theme mapped to shadcn's tokens.

| Property | Token |
| --- | --- |
| `--hairline-plate` | `var(--background)` |
| `--hairline-hi` | `var(--foreground)` |
| `--hairline-edge` | `var(--muted-foreground)` |
| `--hairline-mid` | `color-mix(in oklab, var(--muted-foreground) 55%, var(--background))` |
| `--hairline-lo` | `var(--border)` |

The mapping is checked by eye against shadcn's default light and dark themes in phase 5 and adjusted there if a stroke disappears.

`registry/build.mjs` writes the JSON into `apps/site/public/r/` at build time. The item's URL comes from the environment (`HAIRLINE_REGISTRY_URL`, then Vercel's production host, then the deployment's own host, then localhost), as in motes, so a preview's item installs from that preview and no hostname is in the source.

## Deploy

- **GitHub.** `lucasmarkes/hairline`. Private from phase 0, so CI and Vercel previews work before launch. Made public in phase 6, before the first publish: provenance needs a public repository. The `release` environment, with Lucas as required reviewer, and its `NPM_TOKEN` are set up then.
- **Vercel.** A new project `hairline` in the same team as motes, root directory `apps/site`, connected to the GitHub repository: a preview per pull request, production from `main`.
- **Domain.** `vercel domains add hairline.lucasmarkes.com` on the project. `lucasmarkes.com` already uses Vercel's nameservers, so there is no DNS record to create.

## Phases

| # | Phase | Done when |
| --- | --- | --- |
| 0 | Repository, tooling, CI, private GitHub repository | `pnpm build`, `pnpm typecheck` and `pnpm test` pass on an empty package, locally and in CI |
| 1 | Goldens captured; engines ported | Parity passes for all six figures |
| 2 | Public API: vanilla entry, React entry, styles, theme, accessibility | Layers 2 to 5 pass |
| 3 | Gates and consumer fixtures | `pnpm release --static` passes and layer 6 passes locally |
| 4 | Site, Vercel project | Lucas has reviewed a Vercel preview |
| 5 | Registry item, `llms.txt`, README with the hero clip, CONTRIBUTING, CHANGELOG, LICENSE | The registry JSON validates against shadcn's schema and the item's file builds in `fixtures/next-app` |
| 6 | Launch | The checklist below is complete |

### Launch checklist

Each step marked **confirm** is public or hard to undo, and waits for Lucas.

1. Make the repository public; set its description, topics and homepage. **confirm**
2. Create the `release` environment. Lucas creates the npm token and stores it as `NPM_TOKEN`.
3. Tag `v0.1.0-rc.0`. Approve. It publishes under `next`. **confirm**
4. Verify the release candidate from outside the repository: install in a new Next.js project and a new Vite project; `shadcn add` from the preview URL; import from a CDN in a plain HTML file.
5. Tag `v0.1.0`. Approve. It publishes under `latest`. **confirm**
6. Add `hairline.lucasmarkes.com` to the Vercel project. **confirm**
7. Verify production: the npm page shows provenance and renders the README; the site answers on the domain; the Open Graph card renders; `/llms.txt` and `/r/hairline.json` answer; `shadcn add` works from the production URL.

### After 0.1.0

Not part of this plan: npm trusted publishing in place of the token, the rest pose under SSR, the kit.

## Risks

| Risk | Guard |
| --- | --- |
| The port changes how a figure moves. | Parity tests against the website's own SVG, written before the first engine is moved. |
| The two entries load two copies of the frame loop. | ESM only; the React entry imports the core by package name; the Next.js fixture mounts two figures and asserts one loop. |
| A bundler strips `"use client"`. | The tarball gate reads the first line of `react.js`; the Next.js fixture renders from a Server Component. |
| `light-dark()` or `adoptedStyleSheets` is missing. | Light is the fallback palette; a `<style>` element is the fallback injection. Both paths have a browser test. |
| The parity capture is not deterministic. | A virtual clock, one Chrome channel, and coordinates rounded to two decimals by the engines themselves. |
| The registry item points at localhost in production. | The build prints a warning when it falls back, as in motes; the launch checklist installs from the production URL. |
