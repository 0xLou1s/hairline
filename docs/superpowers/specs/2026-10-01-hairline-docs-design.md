# Hairline: the docs page

The site's `/docs` today is an interim page: a two-step quickstart, the options table, six small figures in rows, and four cards. This spec replaces it with real documentation in the structure of https://cuelume.dev/docs. It is one long page with a sidebar of anchors, written in the site's black-and-white look.

It builds on `2026-10-01-hairline-dx-redesign-design.md`. Nothing here changes the package.

## Goals

- A reader can install, paste and tune a figure without leaving `/docs`.
- The page says what `/llms.txt` says. Both read the same data in `lib/`, so the two cannot drift.
- The page is black and white. Geist Sans is used everywhere, and Geist Mono only for code. That includes the syntax highlighting, which becomes grayscale.
- It stays a static Server Component with no new dependency.

## Non-goals

- Search, an on-this-page table of contents, previous/next links, or a dark mode for the site.
- Multiple docs pages, MDX, or rendering the page from `llms.txt`.
- Per-figure controls on the docs. The home inspector already has them.

## Decisions taken in brainstorming

| Question | Decision |
| --- | --- |
| Structure | One page, sidebar of anchors (cuelume) |
| Figure catalog | One row per figure, small and live, text beside it, then one intensity table |
| Quick start | One code block with tabs: React, Vanilla, CDN |
| Build approach | Sections in TSX fed by the existing data in `lib/`; no MDX |

## Layout

The top bar and footer are the home's (`components/chrome.tsx`). The page background is `--color-canvas` (white).

**Desktop, 1024px and up.** The two columns sit inside the 1080px container.
- **Sidebar column.** 220px wide, `position: sticky` just under the top bar.
- **Content column.** Prose is capped at 64ch. Code blocks and tables take the column's full width.

**The sidebar.** It has three groups, read from `SECTIONS` (below):
- **Getting started:** Install · Quick start · Options
- **API:** React · Vanilla · CDN
- **Reference:** Figures · Theme · Accessibility

Styling:
- **Group label:** Geist Sans 12px, weight 500, `--color-muted`, sentence case. It is not mono and not uppercase.
- **Item:** 14px, `--color-muted`, with a 32px row and an 8px radius.
- **Hover:** the item turns `--color-ink`.
- **Active item:** `--color-ink` on a `--color-stone` background, with `aria-current="location"`.
- The background change is a 150ms `background-color, color` transition. Nothing slides, since this changes many times a visit.

**Phone, below 1024px.**
- The sidebar becomes one sticky horizontal strip under the top bar. It shows the nine items without group labels and scrolls sideways.
- A 24px fade masks the strip's left and right edges while there is more strip to scroll that way.
- When the active section changes, the active item is scrolled into the strip with `scrollIntoView({ block: "nearest", inline: "nearest" })`.

**The active section.**
- An IntersectionObserver watches the nine `<section>` elements, using a band that runs from just under the sticky chrome to 30% down the viewport.
- The active section is the first, in page order, that intersects the band. When the page is scrolled to its end, the last section is active.
- Before the first section reaches the band, Install is active.

**Anchor links.**
- Clicking an item is a plain `<a href="#id">`. The browser scrolls and the hash lands in the URL.
- `html { scroll-behavior: smooth }` applies only under `prefers-reduced-motion: no-preference`.
- Every section has `scroll-margin-top`, set from a CSS variable: the top bar on desktop, and the top bar plus the strip on a phone.

**The header of the content column.** It has no eyebrow.
- **h1:** "Six figures, one set of options." (36px; 44px from `md`)
- **Lead:** "Every figure takes the same four options and draws itself in SVG, with no dependencies. Install the package, paste a figure, and turn `intensity` up or down." (16px, `--color-muted`)

## Sections

Every section is a `<section id={id} aria-labelledby={id + "-title"}>` with an h2 (Sans, 24px, weight 500). A paragraph under an h2 is 15–16px.

1. **Install** (`install`)
   - "Install the package, then import a figure wherever your interface runs."
   - Below it, the `Install` pill (npm, pnpm, yarn, bun, shadcn), unchanged.
   - Then a muted note: "Click the command to switch package manager. ESM only, no dependencies, {tiny()} gzipped for all six; a bundle that imports one carries one."
2. **Quick start** (`quick-start`)
   - "Paste a figure. It fills its parent's width at a 5:4 aspect ratio."
   - Below it, `Tabs` with React (`app/page.tsx`, `REACT`), Vanilla (`main.ts`, `VANILLA`) and CDN (`index.html`, `CDN`).
   - The chosen tab is kept in `localStorage` under `hairline:docs-tab`. The server renders React; after mount the stored tab is read inside a try/catch, and if storage fails the tab stays React.
3. **Options** (`options`)
   - "Every figure takes the same four options, all optional."
   - Below it, the `OPTIONS` table: Option · Type · Default · What it does, with the first three columns in mono. It is the existing `.props` table and its phone layout.
4. **React** (`react`)
   - A signature `CodeBlock` titled "Signature":
     ```tsx
     <Terrain
       intensity?: number
       theme?: "auto" | "light" | "dark"
       label?: string
       onRead?: (text: string) => void
       {...divProps}
     />
     ```
   - Then the prose from `llms.ts`: import any of the six from `@lucasmarkes/hairline/react`; it renders a `<div>`, takes any `<div>` attribute and forwards its ref; it is a client module, so a Server Component renders it without writing "use client".
   - Then `REACT` in a `CodeBlock` titled `app/page.tsx`.
5. **Vanilla** (`vanilla`)
   - A signature `CodeBlock`:
     ```ts
     terrain(element: HTMLElement, options?: HairlineOptions): {
       update(options: HairlineOptions): void
       destroy(): void
     }
     ```
   - Then the prose: one function per figure, named in lower case. In `update`, a key set to `undefined` goes back to its default and a key left out stays as it is. `destroy` removes the drawing and its listeners.
   - Then `VANILLA` in a `CodeBlock` titled `main.ts`.
6. **CDN** (`cdn`)
   - "Without a bundler, import from esm.sh in a module script."
   - Then `CDN` in a `CodeBlock` titled `index.html`.
7. **Figures** (`figures`)
   - "Every figure takes `intensity`, from 0 to 1. Here is what it turns up."
   - Six rows, one per `FIGURES` entry, reusing `.figure-row`, `.tile` and `data-row`.
     - Each row has the live figure at its defaults in a `.tile` up to 240px wide, and beside it:
       - an h3 with the name (Sans, upright);
       - "Higher intensity: {stronger}";
       - the summary, in muted text.
     - Below 640px a row stacks, text first.
   - Then a table, `data-intensity`: Figure · Parameter · 0 · 0.5 · 1.
     - One row per figure, from `INTENSITY` and `parameter`, with units (for example "stagger" · "0 ms" · "40 ms" · "90 ms"; "rate" · "0.6×" · "0.2×" · "0.05×").
     - The number cells are mono and `tabular-nums`.
   - Then a link: "Try them on the home page →", to `/#try`.
8. **Theme** (`theme`)
   - Lead from `llms.ts`: six custom properties, set on the figure or on any ancestor. Without them a figure is light, or dark when an ancestor has class `dark` or `data-theme="dark"`, or when the page's `color-scheme` is dark.
   - Then the `THEME` table: Property · Light · Role, with the first two columns in mono.
   - Then `CSS` in a `CodeBlock` titled `globals.css`.
9. **Accessibility** (`accessibility`). A list of three:
   - Each figure is an image with a description; `label` (or `aria-label` in React) replaces it.
   - Riffle is a focusable group: the arrow keys walk its cards and a live region reads out the card's number.
   - Under `prefers-reduced-motion`, Phosphor and Slow hold still, and every figure still answers the pointer.

After the last section, a muted line closes the page. It is not a section and not in the sidebar: "Anything missing? [Open an issue on GitHub](https://github.com/lucasmarkes/hairline/issues)."

## Code blocks

There is one `CodeBlock` client component (it needs `CopyIcon`). `Tabs` uses the same frame.

- **Frame:** background `#fafafa`, `box-shadow: inset 0 0 0 1px var(--color-stone)`, 12px radius, `overflow: hidden`.
- **Bar:**
  - The title (file name or "Signature") is in Sans 12px, `--color-muted`.
  - The `CopyIcon` is on the right.
  - In `Tabs`, the tabs sit on the left; the active tab's file name and the copy icon sit on the right.
- **Body:** Geist Mono 13px/1.65, padding 16px 18px, horizontal scroll. The body wrapper is the block's one tab stop (`tabIndex={0}`). `highlight()` strips the `tabindex` shiki writes on its `pre`, so there are never two stops.
- **Line numbers:**
  - They come from a CSS counter on shiki's `span.line`, drawn in `::before` in `--color-faint`.
  - They are right-aligned in a 2ch gutter with 16px of space after it.
  - A pseudo-element is in neither the selection nor `textContent`, so copying never carries them.
  - Signature blocks have no line numbers (`data-plain`).

**Grayscale highlighting.**
- `lib/highlight.ts` passes shiki a theme made by `createCssVariablesTheme({ name: "hairline", variablePrefix: "--code-" })`. So shiki writes `color: var(--code-…)` and no hex.
- The variables are defined once in `app/globals.css` `:root`. Every value is at least 4.5:1 on `#fafafa`. The mapping below is what shiki 4.5's CSS-variables theme emits for tsx, checked against real output:

| Variable | Value | Covers |
| --- | --- | --- |
| `--code-foreground` | `#0a0a0a` | plain text, identifiers, brackets |
| `--code-token-constant` | `#0a0a0a` | component names, numbers, constants |
| `--code-token-function` | `#404040` | function names, JSX attributes |
| `--code-token-parameter` | `#404040` | parameters |
| `--code-token-string`, `--code-token-string-expression` | `#525252` | strings |
| `--code-token-keyword`, `--code-token-comment`, `--code-token-punctuation`, `--code-token-link` | `#6b6b6b` | keywords, `=`, comments |
| `--code-background` | `transparent` | (the frame paints it) |

The home inspector's snippet (`components/code.tsx`) switches its colors to the same variables, keeping its markup:
- `.t-kw` → keyword
- `.t-str` → string
- `.t-tag` → constant (it keeps its weight of 500)
- `.t-attr` → function
- `.t-val` → foreground

## Data

- **`lib/docs.ts` (new)** exports `SECTIONS: { id: string; group: "Getting started" | "API" | "Reference"; title: string }[]`, with the nine entries above in page order. The sidebar and the page both map over it, so an anchor cannot exist on only one side.
- **`lib/snippets.ts`:**
  - `PASTE` becomes `QUICKSTART`: React, Vanilla and CDN, each with `{ label, lang, file, code }`.
  - `CSS` stays and is used by Theme.
  - Two new constants, `REACT_SIGNATURE` and `VANILLA_SIGNATURE`, hold the signature text above.
- **`lib/figures.ts`:** `CARDS` is removed.
- **`lib/llms.ts`** is not restructured. It keeps reading `FIGURES`, `OPTIONS`, `THEME` and the snippets.
- **Highlighting** happens at build in the page's Server Component, as now. No highlighter reaches the browser.

## Files

- **Create:**
  - `lib/docs.ts`
  - `components/sidebar.tsx` (client)
  - `components/code-block.tsx` (client)
  - `app/docs/sections.tsx`: one server component per group, so `GettingStarted`, `Api` and `Reference`, each rendering its sections from props it is given.
- **Modify:**
  - `app/docs/page.tsx`: the layout, the header, highlighting the snippets, and passing them down.
  - `components/tabs.tsx`: the `CodeBlock` frame, file names and the remembered tab.
  - `lib/highlight.ts`: the CSS-variables theme.
  - `lib/snippets.ts`
  - `lib/figures.ts`
  - `app/globals.css`: the `--code-*` variables, the docs layout, sidebar and strip, the code frame, line numbers, the `data-intensity` table, and a stacked `.figure-row` below 640px.
  - `components/code.tsx`: its CSS only, via the variables.
  - `app/page.tsx`: `id="try"` on the "Try it" section.
- **Remove:** the CSS for `.card`, `.step`, `.step-title` and `.step-n`, and the old `.code-bar`/`.code-tab` rules.

## Edge cases

- **No JavaScript.**
  - The sidebar is plain links and still works. Only the active highlight is missing.
  - The figures draw nothing, as on the home today.
  - The tabs show React.
- **Opening `/docs#theme`.** The browser scrolls to it, and `scroll-margin-top` clears the sticky chrome. The observer marks Theme on its first callback.
- **No clipboard.** `CopyIcon` already falls back to selecting the text.
- **Storage throws** (private mode, blocked). The tab stays React and nothing throws.
- **A long line in a code block.** The body scrolls horizontally and the page never does, down to 320px.

## Testing

**vitest (`test/docs.test.ts`)**
- `SECTIONS` has nine unique ids, in the three groups in order, and every id is a valid fragment (`/^[a-z-]+$/`).
- `/llms.txt` has a `## ` heading for each docs section it shares: Install, Options, Figures, Theme, Accessibility.
- Highlighting a snippet writes `var(--code-`, no `#` hex color and no `tabindex`.
- The quickstart test pastes three ways (React, Vanilla, CDN), each with a file name, and none sets an option the package dropped.
- "sets all six theme properties" moves from the CSS tab to `CSS`, unchanged.
- The Tiny-card test is renamed for the Install note; the assertion is unchanged.
- The intensity table's cells format units the way `scale()` does.

**Playwright (`test/site.spec.ts`)**, against `next start`:
- The docs prerender six empty boxes, then draw one figure per row with a clean console. This test exists and stays.
- Get started leads to `/docs`, and the quick start shows three tabs and copies the active one. This test exists; it changes from four tabs to three.
- Clicking "Theme" in the sidebar puts `#theme` in the URL and `aria-current="location"` on Theme.
- Scrolling to Accessibility moves `aria-current` to Accessibility.
- At 390px:
  - the strip is visible and the grouped sidebar is not;
  - `document.documentElement.scrollWidth <= innerWidth`;
  - after a click on Accessibility, its item is inside the strip's box.
- Copying a `CodeBlock` puts the code on the clipboard with no line numbers: the first line of `REACT` begins `import`.
- Every `span` inside a docs `pre` has a computed color with equal r, g and b.
- The one-family test still passes: Sans everywhere, mono only in `code` and `pre`, serif only in the home's `h1 em`.

Both suites, plus `pnpm typecheck` and `pnpm build`, must pass before the work is called done.
