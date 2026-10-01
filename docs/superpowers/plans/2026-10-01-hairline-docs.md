# Hairline Docs Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's interim `/docs` with one page of real documentation: a sidebar of anchors, nine sections fed by the data in `lib/`, grayscale code blocks with line numbers, and the six figures live.

**Architecture:** `app/docs/page.tsx` stays an async Server Component. It highlights every snippet at build with shiki, using a CSS-variables theme, and passes the HTML to three server section components in `app/docs/sections.tsx`. Two small client components do the interactive parts. `CodeBlock` copies code, and `Tabs` remembers the chosen tab. `Sidebar` marks the section in view with an IntersectionObserver. `SECTIONS` in `lib/docs.ts` is the one list that both the sidebar and the page map over.

**Tech Stack:** Next 16.3.8 App Router, React 19.3, Tailwind 4.3.3 (`@theme` tokens in `app/globals.css`), shiki 4.5.0, vitest 5.0.3, Playwright 1.63.0 (Chrome).

**Spec:** `docs/superpowers/specs/2026-10-01-hairline-docs-design.md`

## Global Constraints

- Repo `~/estudos/hairline`, branch `site-on-vercel`. The app is `apps/site`. Every path below is relative to `apps/site` unless it starts with `docs/`, and every command runs from `apps/site`.
- Prefix every shell command with `rtk`.
- No new dependency. The page stays a static Server Component, and no highlighter reaches the browser.
- Black and white. Geist Sans everywhere, Geist Mono only inside `code` and `pre`, and Instrument Serif only in the home's `h1 em`.
- Code, comments and copy are in English. Comments follow the house style: one plain sentence saying why, not what.
- Every commit message ends with a blank line, then `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Never stage `.vercel/`, `.superpowers/`, `.claude/`, `AGENTS.md`, `CLAUDE.md` or `.vitest/`. Stage files by name, never with `git add .` or `-A`.
- Run `rtk pnpm build` before any Playwright run; Playwright serves the built site with `next start -p 4320`.
  - It reuses a server already on 4320, so first check that `lsof -ti:4320` prints nothing. If it prints a PID, kill it.
  - `pnpm build` needs `../../packages/hairline/dist/index.js`. If that is missing, run `rtk pnpm --filter @lucasmarkes/hairline build` first.
- Exact copy for the page header and every section: see the spec's "Layout" and "Sections". It is repeated in the code below; the code is what you paste.

## Review Focus

1. **Opening `/docs#theme` directly.** The browser lands with the Theme heading clear of the sticky chrome, and Theme is marked in the sidebar on the first observer callback. Pinned in Task 4.
2. **Storage that throws** (private mode, blocked). The quick start stays on React, every tab still switches, and the console stays clean. Pinned in Task 3.
3. **A long code line, the intensity table or the tab bar at 320px.** Each scrolls or shrinks inside its own box, and the page never scrolls sideways. Pinned in Task 3.
4. **No JavaScript.** The sidebar and strip are plain links that still move the hash, and the quick start shows React. Pinned in Task 4.
5. **The end of the page, where Accessibility can never reach the band.** Scrolling to the bottom marks Accessibility. Pinned in Task 4.

---

### Task 1: Grayscale highlighting

**Files:**
- Modify: `lib/highlight.ts`
- Modify: `app/globals.css` (`:root`, and the `.t-*` rules at lines 120–124)
- Test: `test/docs.test.ts`, `test/site.spec.ts`

**Interfaces:**
- Consumes: `REACT`, `VANILLA`, `CDN`, `CSS` from `lib/snippets.ts`, all existing.
- Produces: `highlight(code: string, lang: string): Promise<string>`. The signature is unchanged. Its output now colors tokens only with `var(--code-…)`, and its `<pre>` has no `tabindex`. It also produces the `--code-*` custom properties on `:root`. Task 2 extends the `SAMPLES` array in `test/docs.test.ts`.

- [ ] **Step 1: Write the failing vitest tests**

In `test/docs.test.ts`, add `import { highlight } from "@/lib/highlight";` to the imports. Change the snippets import line to:

```ts
import { CDN, CSS, PASTE, REACT, VANILLA, install, snippet } from "@/lib/snippets";
```

Append at the end of the file:

```ts
/** Every snippet the docs highlight, with its language. */
const SAMPLES: [code: string, lang: string][] = [[REACT, "tsx"], [VANILLA, "ts"], [CDN, "html"], [CSS, "css"]];

describe("highlighting", () => {
  it("colours tokens with the --code- variables only, and leaves the block one tab stop", async () => {
    for (const [code, lang] of SAMPLES) {
      const html = await highlight(code, lang);
      expect(html).toContain("var(--code-");
      // the CSS sample holds #ffffff as text, so only colours set in a style count
      expect(html).not.toMatch(/(?:color|background-color):\s*#/i);
      expect(html).not.toContain("tabindex");
    }
  });

  it("writes only variables globals.css defines", async () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const used = new Set<string>();
    for (const [code, lang] of SAMPLES) for (const m of (await highlight(code, lang)).matchAll(/var\((--code-[a-z-]+)\)/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(3);
    for (const name of used) expect(css).toContain(`${name}:`);
  });
});
```

- [ ] **Step 2: Write the failing Playwright test**

In `test/site.spec.ts`, add after the test "the docs prerender six empty boxes…":

```ts
test("the docs' code is in greys: every token's colour has equal red, green and blue", async ({ page }) => {
  await page.goto("/docs");
  const colours = await page.locator("main pre span").evaluateAll((spans) => spans.map((s) => getComputedStyle(s).color));
  expect(colours.length).toBeGreaterThan(20);
  const tinted = colours.filter((c) => {
    const [r, g, b] = c.match(/\d+(\.\d+)?/g)!.map(Number);
    return !(r === g && g === b);
  });
  expect(tinted).toEqual([]);
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `rtk pnpm exec vitest run -t "highlighting"`
Expected: FAIL. Both tests fail: shiki's `min-light` writes hex colours and `tabindex="0"`, and `globals.css` defines no `--code-` variable.

Run: `lsof -ti:4320; rtk pnpm build && rtk pnpm exec playwright test -g "in greys"`
Expected: FAIL. `tinted` lists `min-light`'s coloured tokens, for example `rgb(…)` values with unequal channels.

- [ ] **Step 4: Highlight with the CSS-variables theme**

Replace the whole of `lib/highlight.ts` with:

```ts
import { codeToHtml, createCssVariablesTheme } from "shiki";

/** shiki writes var(--code-…) instead of colours; globals.css sets them, in greys. */
const theme = createCssVariablesTheme({ name: "hairline", variablePrefix: "--code-" });

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The block around the code is its tab stop, so shiki's own tabindex on the pre goes. */
export async function highlight(code: string, lang: string): Promise<string> {
  const html = await codeToHtml(code.trimEnd(), { lang, theme });
  return html.replace(' tabindex="0"', "");
}

export function plain(code: string): string {
  return `<pre class="shiki"><code>${escape(code.trimEnd())}</code></pre>`;
}
```

- [ ] **Step 5: Define the variables and move the inspector's snippet onto them**

In `app/globals.css`, replace the `:root` block (lines 16–21) with:

```css
:root {
  --lift: 0 1px 2px #00000008, 0 10px 28px -16px #00000024;
  --lift-lg: 0 1px 2px #00000008, 0 2px 6px #00000008, 0 32px 64px -34px #00000038;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-icon: cubic-bezier(0.2, 0, 0, 1);
  /* Code in greys, each at least 4.5:1 on the code frame's #fafafa. shiki writes these names. */
  --code-foreground: #0a0a0a;
  --code-background: transparent;
  --code-token-constant: #0a0a0a;
  --code-token-function: #404040;
  --code-token-parameter: #404040;
  --code-token-string: #525252;
  --code-token-string-expression: #525252;
  --code-token-keyword: #6b6b6b;
  --code-token-comment: #6b6b6b;
  --code-token-punctuation: #6b6b6b;
  --code-token-link: #6b6b6b;
}
```

Then replace these lines:

```css
.t-kw { color: var(--color-muted); }
.t-tag { font-weight: 500; }
.t-attr { color: #525252; }
```

with:

```css
.t-kw { color: var(--code-token-keyword); }
.t-str { color: var(--code-token-string); }
.t-tag { color: var(--code-token-constant); font-weight: 500; }
.t-attr { color: var(--code-token-function); }
.t-val { color: var(--code-foreground); }
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `rtk pnpm exec vitest run`
Expected: PASS, 18 tests in `test/docs.test.ts`: the 16 existing ones plus the 2 new ones.

Run: `lsof -ti:4320; rtk pnpm build && rtk pnpm exec playwright test -g "in greys|prerender six"`
Expected: PASS, 2 passed.

- [ ] **Step 7: Commit**

```bash
rtk git add lib/highlight.ts app/globals.css test/docs.test.ts test/site.spec.ts
rtk git commit -m "Docs: code is highlighted in greys through shiki's CSS-variables theme, and the inspector's snippet uses the same variables

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: The docs' data

**Files:**
- Create: `lib/docs.ts`
- Modify: `lib/snippets.ts`, `lib/figures.ts`, `lib/llms.ts`
- Test: `test/docs.test.ts`

**Interfaces:**
- Consumes: `OPTIONS`, `THEME`, `INTENSITY`, `FIGURES` from `lib/figures.ts`. `SAMPLES` and `highlight` from Task 1, in the test file.
- Produces, all used by Task 3:
  - `lib/docs.ts`:
    - `type Group = "Getting started" | "API" | "Reference"`
    - `type Section = { id: string; group: Group; title: string }`
    - `SECTIONS: Section[]`, nine entries in page order.
  - `lib/snippets.ts`:
    - `QUICKSTART: { label: string; lang: string; file: string; code: string }[]`, with React/`app/page.tsx`, Vanilla/`main.ts` and CDN/`index.html`.
    - `REACT_SIGNATURE: string` and `VANILLA_SIGNATURE: string`.
    - `PASTE` stays for now; the old page still imports it, and Task 3 deletes it.
  - `lib/figures.ts`: `measure(value: number, unit: string): string`, which returns `"40 ms"` or `"0.2× normal speed"`. `CARDS` stays for now; Task 3 deletes it.

- [ ] **Step 1: Write the failing tests**

In `test/docs.test.ts`:

1. Change the imports to:

   ```ts
   import { SECTIONS } from "@/lib/docs";
   import { FIGURES, INTENSITY, OPTIONS, measure } from "@/lib/figures";
   import { CDN, CSS, QUICKSTART, REACT, REACT_SIGNATURE, VANILLA, VANILLA_SIGNATURE, install, snippet } from "@/lib/snippets";
   ```

   This drops `PASTE`.

2. Replace the whole `describe("the quickstart", …)` block and the whole `describe("the Tiny card", …)` block with:

```ts
describe("the quick start", () => {
  it("pastes React, Vanilla and CDN, each under a file name, and none of them sets an option the package dropped", () => {
    expect(QUICKSTART.map((q) => [q.label, q.file])).toEqual([["React", "app/page.tsx"], ["Vanilla", "main.ts"], ["CDN", "index.html"]]);
    expect(QUICKSTART.map((q) => q.code)).toEqual([REACT, VANILLA, CDN]);
    for (const q of QUICKSTART) expect(q.code).not.toMatch(/stagger|radius|afterglow|coast|bands|labels|ranges|className/);
  });
});

describe("the theme's CSS", () => {
  it("sets all six theme properties", () => {
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(CSS).toContain(`--hairline-${key}:`);
  });
});

describe("the signatures", () => {
  it("list the component's four options with their types, read from the options table", () => {
    expect(REACT_SIGNATURE).toBe(`<Terrain
  intensity?: number
  theme?: "auto" | "light" | "dark"
  label?: string
  onRead?: (text: string) => void
  {...divProps}
/>
`);
  });

  it("give the function's handle its two methods", () => {
    expect(VANILLA_SIGNATURE).toBe(`terrain(element: HTMLElement, options?: HairlineOptions): {
  update(options: HairlineOptions): void
  destroy(): void
}
`);
  });
});

describe("the Install note's size", () => {
  it("is the gzip size of the vanilla entry, to a tenth of a kB", () => {
    const bytes = gzipSync(readFileSync(new URL("../../../packages/hairline/dist/index.js", import.meta.url))).length;
    expect(tiny()).toBe(`${(bytes / 1000).toFixed(1)} kB`);
    expect(tiny()).toMatch(/^\d+\.\d kB$/);
  });
});

describe("the docs' sections", () => {
  it("are nine, in three groups in order, with unique ids that work as fragments", () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(["install", "quick-start", "options", "react", "vanilla", "cdn", "figures", "theme", "accessibility"]);
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(9);
    for (const s of SECTIONS) expect(s.id).toMatch(/^[a-z-]+$/);
    expect(SECTIONS.map((s) => s.group)).toEqual([
      "Getting started", "Getting started", "Getting started",
      "API", "API", "API",
      "Reference", "Reference", "Reference",
    ]);
  });

  it("share their headings with /llms.txt", () => {
    const text = llms("https://example.test");
    for (const title of ["Install", "Options", "Figures", "Theme", "Accessibility"]) {
      expect(SECTIONS.map((s) => s.title)).toContain(title);
      expect(text).toContain(`\n## ${title}\n`);
    }
  });
});

describe("the intensity table", () => {
  it("writes each number with its unit, as /llms.txt does", () => {
    expect(measure(40, "ms")).toBe("40 ms");
    expect(measure(0.2, "× normal speed")).toBe("0.2× normal speed");
    for (const doc of FIGURES) {
      const [lo, mid, hi] = INTENSITY[doc.id].map((n) => measure(n, doc.parameter.unit));
      expect(scale(doc.id, doc.parameter)).toBe(`${doc.parameter.name} ${lo} at 0, ${mid} at 0.5, ${hi} at 1`);
    }
  });
});
```

3. Extend `SAMPLES` from Task 1 so the signatures go through the variables test too:

```ts
const SAMPLES: [code: string, lang: string][] = [[REACT, "tsx"], [VANILLA, "ts"], [CDN, "html"], [CSS, "css"], [REACT_SIGNATURE, "tsx"], [VANILLA_SIGNATURE, "ts"]];
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `rtk pnpm exec vitest run`
Expected: FAIL. vitest cannot resolve `@/lib/docs`, and `QUICKSTART`, `REACT_SIGNATURE`, `VANILLA_SIGNATURE` and `measure` are not exported.

- [ ] **Step 3: Create `lib/docs.ts`**

```ts
/**
 * The docs' sections, in page order. The sidebar and the page both map over
 * this list, so an anchor cannot exist on one side only.
 */

export type Group = "Getting started" | "API" | "Reference";

export type Section = { id: string; group: Group; title: string };

export const SECTIONS: Section[] = [
  { id: "install", group: "Getting started", title: "Install" },
  { id: "quick-start", group: "Getting started", title: "Quick start" },
  { id: "options", group: "Getting started", title: "Options" },
  { id: "react", group: "API", title: "React" },
  { id: "vanilla", group: "API", title: "Vanilla" },
  { id: "cdn", group: "API", title: "CDN" },
  { id: "figures", group: "Reference", title: "Figures" },
  { id: "theme", group: "Reference", title: "Theme" },
  { id: "accessibility", group: "Reference", title: "Accessibility" },
];
```

- [ ] **Step 4: Add `measure` to `lib/figures.ts` and use it in `scale`**

In `lib/figures.ts`, add directly after the `INTENSITY` constant:

```ts
/** A number with its unit, as the docs' table and /llms.txt write it: "40 ms", "0.2× normal speed". */
export function measure(value: number, unit: string): string {
  return `${value}${unit.startsWith("×") ? "" : " "}${unit}`;
}
```

In `lib/llms.ts`:

1. Change the first import to:

   ```ts
   import { FIGURES, INTENSITY, LINKS, OPTIONS, THEME, measure, type Row } from "./figures";
   ```

2. Replace the body of `scale` with:

   ```ts
   export function scale(id: keyof typeof INTENSITY, parameter: { name: string; unit: string }): string {
     const [lo, mid, hi] = INTENSITY[id].map((n) => measure(n, parameter.unit));
     return `${parameter.name} ${lo} at 0, ${mid} at 0.5, ${hi} at 1`;
   }
   ```

- [ ] **Step 5: Add the quick start and the signatures to `lib/snippets.ts`**

1. Change the first line to:

   ```ts
   import { OPTIONS, THEME } from "./figures";
   ```

2. Insert this block directly above the `/** The quickstart's second step. */` comment. Leave `PASTE` where it is; Task 3 removes it.

```ts
/** The quick start's tabs: the same figure three ways, each under the file it goes in. */
export const QUICKSTART: { label: string; lang: string; file: string; code: string }[] = [
  { label: "React", lang: "tsx", file: "app/page.tsx", code: REACT },
  { label: "Vanilla", lang: "ts", file: "main.ts", code: VANILLA },
  { label: "CDN", lang: "html", file: "index.html", code: CDN },
];

/** The component's props, read from the options table so the two cannot drift. */
export const REACT_SIGNATURE = `<Terrain
${OPTIONS.map((o) => `  ${o.name}?: ${o.type}`).join("\n")}
  {...divProps}
/>
`;

export const VANILLA_SIGNATURE = `terrain(element: HTMLElement, options?: HairlineOptions): {
  update(options: HairlineOptions): void
  destroy(): void
}
`;
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `rtk pnpm exec vitest run`
Expected: PASS, 23 tests. Task 1 left 18. This task removes the 2 quickstart tests and the Tiny test, and adds 8.

Run: `rtk pnpm typecheck`
Expected: no errors. `PASTE` and `CARDS` still exist, so the old page still compiles.

- [ ] **Step 7: Commit**

```bash
rtk git add lib/docs.ts lib/snippets.ts lib/figures.ts lib/llms.ts test/docs.test.ts
rtk git commit -m "Docs: the sections, the quick start's three files, the two signatures and the intensity table's units come from lib, beside llms.txt

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Code blocks and the docs page, without the sidebar

**Files:**
- Create: `components/code-block.tsx`, `app/docs/sections.tsx`
- Modify: `components/tabs.tsx`, `app/docs/page.tsx`, `app/page.tsx`, `app/globals.css`
- Modify: `lib/snippets.ts` (delete `PASTE`) and `lib/figures.ts` (delete `CARDS`)
- Test: `test/site.spec.ts`

**Interfaces:**
- Consumes:
  - `highlight` (Task 1).
  - `SECTIONS`, `QUICKSTART`, `REACT_SIGNATURE`, `VANILLA_SIGNATURE` and `measure` (Task 2).
  - `CopyIcon({ text, select, label })` from `components/copy.tsx` and `Install({ commands })` from `components/install.tsx`, both existing.
- Produces, used by Task 4:
  - `CodeBlock({ title, html, plain? }: { title: string; html: string; plain?: boolean })`.
  - `type Tab = { label: string; file: string; html: string }`, and `Tabs({ tabs, label }: { tabs: Tab[]; label: string })`.
  - `GettingStarted`, `Api` and `Reference`, server components.
  - The DOM hooks:
    - `section#{id}[aria-labelledby={id}-title]` with `h2#{id}-title`.
    - `.docs`, the page grid that Task 4 puts the sidebar into.
    - `.docs-main`.
    - `[data-code]` on every code frame, `.code-title`, and `.code-body`.
  - The CSS variables `--topbar` (on `:root`) and `--doc-offset` (on `.docs`).

- [ ] **Step 1: Write the failing Playwright tests**

In `test/site.spec.ts`:

1. Replace the whole test "Get started leads to the docs, whose quickstart pastes four ways and lists the four options" with:

```ts
test("Get started leads to the docs, whose quick start pastes three ways and copies the tab on show", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  const quick = page.locator("#quick-start");
  await expect(quick.getByRole("tab")).toHaveText(["React", "Vanilla", "CDN"]);
  await expect(quick.locator(".code-title")).toHaveText("app/page.tsx");
  await quick.getByRole("tab", { name: "CDN" }).click();
  await expect(quick.locator(".code-title")).toHaveText("index.html");
  await expect(quick.getByRole("tabpanel")).toContainText("https://esm.sh/@lucasmarkes/hairline");
  await quick.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^<div id="figure"/);
  await expect(page.locator("#options [data-options] tbody tr td:first-child")).toHaveText(["intensity", "theme", "label", "onRead"]);
});
```

2. Replace the whole test "one family outside the hero: …" with this version, which also checks `/docs`:

```ts
/** Every element that holds text of its own, outside code, the hero's serif word and the figures, with its family. */
const families = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      // the install pill is code, prompt and all
      .filter((el) => !el.closest("h1 em, code, pre, .pill, [data-hairline]") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
      .map((el) => `${el.tagName} ${getComputedStyle(el).fontFamily}`),
  );

test("one family outside the hero: the serif is the headline's one word, mono is code", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1 em")).toHaveCSS("font-family", /Instrument Serif/);
  const home = await families(page);
  expect(home.length).toBeGreaterThan(5);
  expect(home.filter((f) => !/geist/i.test(f) || /mono/i.test(f))).toEqual([]);

  await page.goto("/docs");
  const docs = await families(page);
  expect(docs.length).toBeGreaterThan(40);
  expect(docs.filter((f) => !/geist/i.test(f) || /mono/i.test(f))).toEqual([]);
  for (const id of IDS) await expect(page.locator(`[data-row="${id}"] h3`)).toHaveCSS("font-style", "normal");
});
```

3. Append these tests at the end of the file:

```ts
test("a code block copies its code without the line numbers, and a signature has none", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs");
  const blocks = page.locator("#react [data-code]");
  await expect(blocks.locator(".code-title")).toHaveText(["Signature", "app/page.tsx"]);
  const usage = blocks.last();
  await usage.getByRole("button", { name: "Copy code" }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n")[0]).toBe('import { Terrain } from "@lucasmarkes/hairline/react";');
  expect(text).not.toMatch(/^\s*\d/m);
  const number = (block: typeof usage) => block.locator(".line").first().evaluate((el) => getComputedStyle(el, "::before").content);
  expect(await number(usage)).not.toBe("none");
  expect(await number(blocks.first())).toBe("none");
});

test("the quick start remembers the tab a reader picked", async ({ page }) => {
  await page.goto("/docs");
  const quick = page.locator("#quick-start");
  await quick.getByRole("tab", { name: "Vanilla" }).click();
  await page.reload();
  await expect(quick.getByRole("tab", { name: "Vanilla" })).toHaveAttribute("aria-selected", "true");
  await expect(quick.locator(".code-title")).toHaveText("main.ts");
});

test("when storage throws, the quick start stays on React and still switches, with a clean console", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  const noise = watch(page);
  await page.goto("/docs");
  const quick = page.locator("#quick-start");
  await expect(quick.getByRole("tab", { name: "React" })).toHaveAttribute("aria-selected", "true");
  await quick.getByRole("tab", { name: "CDN" }).click();
  await expect(quick.getByRole("tab", { name: "CDN" })).toHaveAttribute("aria-selected", "true");
  expect(noise).toEqual([]);
});

test("the docs fit a phone down to 320px: rows stack text first, and wide code and tables scroll in their own box", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/docs");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const row = page.locator('[data-row="terrain"]');
    const text = (await row.locator("h3").boundingBox())!;
    const tile = (await row.locator(".tile").boundingBox())!;
    expect(tile.y).toBeGreaterThan(text.y + text.height);
  }
});

test("the figures' link goes to the home's figure", async ({ page }) => {
  await page.goto("/docs");
  await page.getByRole("link", { name: "Try them on the home page →" }).click();
  await expect(page).toHaveURL(/\/#try$/);
  await expect(page.locator("#try [data-inspector]")).toBeInViewport();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `lsof -ti:4320; rtk pnpm build && rtk pnpm exec playwright test -g "quick start|one family|code block copies|storage throws|320px|home's figure"`
Expected: FAIL, 7 failing tests: the 6 new or rewritten ones, plus "one family", which finds the `.props` cells in mono. Most time out because `#quick-start`, `#react` and the "Try them" link do not exist yet.

- [ ] **Step 3: Create `components/code-block.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { CopyIcon } from "./copy";

/**
 * A code sample in its frame: a bar with its title and a copy icon, then the
 * code, which is the block's one tab stop so the keyboard can scroll it.
 * Line numbers are drawn in CSS, so they are never selected or copied;
 * `plain` leaves them off.
 */
export function CodeBlock({ title, html, plain = false }: { title: string; html: string; plain?: boolean }) {
  const body = useRef<HTMLDivElement>(null);
  return (
    <div className="code" data-code>
      <div className="code-bar">
        <span className="code-title">{title}</span>
        <CopyIcon text={() => body.current?.textContent ?? ""} select={body} label="Copy code" />
      </div>
      <div ref={body} tabIndex={0} className="code-body" data-plain={plain || undefined} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `components/tabs.tsx`**

```tsx
"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CopyIcon } from "./copy";

export type Tab = { label: string; file: string; html: string };

/** Where the reader's tab is kept between visits. */
const KEY = "hairline:docs-tab";

/**
 * Code under tabs, in the same frame as CodeBlock: the tabs on the left, the
 * shown tab's file name and the copy icon on the right. The server renders
 * the first tab; the stored one is read after mount, and storage that throws
 * (private mode, blocked) leaves the first tab on.
 */
export function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [at, setAt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    try {
      const stored = tabs.findIndex((tab) => tab.label === localStorage.getItem(KEY));
      if (stored > 0) setAt(stored);
    } catch {}
  }, [tabs]);

  const pick = (i: number) => {
    setAt(i);
    try {
      localStorage.setItem(KEY, tabs[i].label);
    } catch {}
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (at + step + tabs.length) % tabs.length;
    pick(next);
    list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className="code" data-code>
      <div className="code-bar">
        <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="code-tabs">
          {tabs.map((tab, i) => (
            <button key={tab.label} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={i === at} aria-controls={`${id}-panel`} tabIndex={i === at ? 0 : -1} onClick={() => pick(i)} className="code-tab">
              {tab.label}
            </button>
          ))}
        </div>
        <span className="code-title" title={tabs[at].file}>{tabs[at].file}</span>
        <CopyIcon text={() => panel.current?.textContent ?? ""} select={panel} label="Copy code" />
      </div>
      <div ref={panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${at}`} tabIndex={0} className="code-body" dangerouslySetInnerHTML={{ __html: tabs[at].html }} />
    </div>
  );
}
```

- [ ] **Step 5: Create `app/docs/sections.tsx`**

```tsx
import type { ReactNode } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { CodeBlock } from "@/components/code-block";
import { Install } from "@/components/install";
import { Tabs, type Tab } from "@/components/tabs";
import { SECTIONS } from "@/lib/docs";
import { FIGURES, INTENSITY, OPTIONS, THEME, measure } from "@/lib/figures";
import { PACKAGE } from "@/lib/snippets";

const SMALL = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

/** A section takes its title from SECTIONS, the list the sidebar reads, so the two always agree. */
function Section({ id, children }: { id: string; children: ReactNode }) {
  const { title } = SECTIONS.find((s) => s.id === id)!;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="doc-section">
      <h2 id={`${id}-title`} className="doc-h2">{title}</h2>
      {children}
    </section>
  );
}

const C = ({ children }: { children: ReactNode }) => <code className="doc-code">{children}</code>;

export function GettingStarted({ commands, size, quickstart }: { commands: { label: string; code: string }[]; size: string; quickstart: Tab[] }) {
  return (
    <>
      <Section id="install">
        <p className="doc-p">Install the package, then import a figure wherever your interface runs.</p>
        <div className="max-w-[460px]"><Install commands={commands} /></div>
        <p className="doc-note">
          Click the command to switch package manager. ESM only, no dependencies, <span data-size>{size}</span> gzipped for all six; a bundle that imports one carries one.
        </p>
      </Section>
      <Section id="quick-start">
        <p className="doc-p">Paste a figure. It fills its parent&rsquo;s width at a 5:4 aspect ratio.</p>
        <Tabs tabs={quickstart} label="Quick start" />
      </Section>
      <Section id="options">
        <p className="doc-p">Every figure takes the same four options, all optional.</p>
        <div className="overflow-x-auto">
          <table className="props" data-options>
            <thead>
              <tr><th>Option</th><th>Type</th><th>Default</th><th>What it does</th></tr>
            </thead>
            <tbody>
              {OPTIONS.map((row) => (
                <tr key={row.name}>
                  <td><code>{row.name}</code></td><td><code>{row.type}</code></td><td><code>{row.default}</code></td><td>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

export function Api({ code }: { code: { reactSignature: string; react: string; vanillaSignature: string; vanilla: string; cdn: string } }) {
  return (
    <>
      <Section id="react">
        <CodeBlock title="Signature" html={code.reactSignature} plain />
        <p className="doc-p">
          Import any of the six from <C>{PACKAGE}/react</C>. Each renders a <C>&lt;div&gt;</C>, takes any <C>&lt;div&gt;</C> attribute and forwards its ref. The entry is a client module, so a Server Component renders it without writing <C>&quot;use client&quot;</C>.
        </p>
        <CodeBlock title="app/page.tsx" html={code.react} />
      </Section>
      <Section id="vanilla">
        <CodeBlock title="Signature" html={code.vanillaSignature} plain />
        <p className="doc-p">
          One function per figure, named in lower case: {FIGURES.map((f, i) => <span key={f.id}>{i ? ", " : ""}<C>{f.id}</C></span>)}. In <C>update</C>, a key set to <C>undefined</C> goes back to its default and a key left out stays as it is. <C>destroy</C> removes the drawing and its listeners.
        </p>
        <CodeBlock title="main.ts" html={code.vanilla} />
      </Section>
      <Section id="cdn">
        <p className="doc-p">Without a bundler, import from esm.sh in a module script.</p>
        <CodeBlock title="index.html" html={code.cdn} />
      </Section>
    </>
  );
}

export function Reference({ css }: { css: string }) {
  return (
    <>
      <Section id="figures">
        <p className="doc-p">Every figure takes <C>intensity</C>, from 0 to 1. Here is what it turns up.</p>
        <ul className="grid">
          {FIGURES.map((doc) => {
            const Small = SMALL[doc.id];
            return (
              <li key={doc.id} className="figure-row" data-row={doc.id}>
                <div>
                  <h3 className="text-[20px] font-medium leading-none tracking-[-0.02em]">{doc.name}</h3>
                  <p className="mt-3 text-[15px] leading-[1.5]">Higher intensity: {doc.stronger}</p>
                  <p className="mt-1 max-w-[52ch] text-[14px] leading-[1.55] text-muted">{doc.summary}</p>
                </div>
                <div className="tile w-full max-w-[240px] justify-self-end"><Small /></div>
              </li>
            );
          })}
        </ul>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="What intensity sets in each figure">
          <table className="intensity" data-intensity>
            <thead>
              <tr><th>Figure</th><th>Parameter</th><th>0</th><th>0.5</th><th>1</th></tr>
            </thead>
            <tbody>
              {FIGURES.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td><code>{doc.parameter.name}</code></td>
                  {INTENSITY[doc.id].map((n, i) => <td key={i}><code>{measure(n, doc.parameter.unit)}</code></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a className="doc-more" href="/#try">Try them on the home page →</a>
      </Section>
      <Section id="theme">
        <p className="doc-p">
          Six custom properties, set on the figure or on any ancestor. Without them a figure is light, or dark when an ancestor has class <C>dark</C> or <C>data-theme=&quot;dark&quot;</C>, or when the page&rsquo;s <C>color-scheme</C> is dark.
        </p>
        <div className="overflow-x-auto">
          <table className="props" data-tokens>
            <thead>
              <tr><th>Property</th><th>Light</th><th>Role</th></tr>
            </thead>
            <tbody>
              {THEME.map((t) => (
                <tr key={t.property}><td><code>{t.property}</code></td><td><code>{t.light}</code></td><td>{t.role}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock title="globals.css" html={css} />
      </Section>
      <Section id="accessibility">
        <ul className="doc-list">
          <li>Each figure is an image with a description; <C>label</C> (or <C>aria-label</C> in React) replaces it.</li>
          <li>Riffle is a focusable group: the arrow keys walk its cards and a live region reads out the card&rsquo;s number.</li>
          <li>Under <C>prefers-reduced-motion</C>, Phosphor and Slow hold still, and every figure still answers the pointer.</li>
        </ul>
      </Section>
    </>
  );
}
```

- [ ] **Step 6: Rewrite `app/docs/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Footer, Topbar } from "@/components/chrome";
import { LINKS } from "@/lib/figures";
import { highlight } from "@/lib/highlight";
import { tiny } from "@/lib/size";
import { CDN, CSS, QUICKSTART, REACT, REACT_SIGNATURE, VANILLA, VANILLA_SIGNATURE, install } from "@/lib/snippets";
import { Api, GettingStarted, Reference } from "./sections";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;

export const metadata: Metadata = { title: "Docs · hairline", alternates: { canonical: "/docs" } };

/**
 * The docs: one page of sections. A Server Component, so every snippet is
 * highlighted at build and each figure goes through server rendering and
 * hydration on every deploy, as on the home.
 */
export default async function Docs() {
  const [quickstart, reactSignature, react, vanillaSignature, vanilla, cdn, css] = await Promise.all([
    Promise.all(QUICKSTART.map(async (q) => ({ label: q.label, file: q.file, html: await highlight(q.code, q.lang) }))),
    highlight(REACT_SIGNATURE, "tsx"),
    highlight(REACT, "tsx"),
    highlight(VANILLA_SIGNATURE, "ts"),
    highlight(VANILLA, "ts"),
    highlight(CDN, "html"),
    highlight(CSS, "css"),
  ]);

  return (
    <>
      <Topbar />
      <div className="docs">
        <main className="docs-main">
          <header className="max-w-[64ch]">
            <h1 className="text-[36px] font-medium leading-[1.05] tracking-[-0.035em] md:text-[44px]">Six figures, one set of options.</h1>
            <p className="mt-4 text-[16px] leading-[1.55] text-muted">
              Every figure takes the same four options and draws itself in SVG, with no dependencies. Install the package, paste a figure, and turn <code className="doc-code">intensity</code> up or down.
            </p>
          </header>
          <GettingStarted commands={install(SITE)} size={tiny()} quickstart={quickstart} />
          <Api code={{ reactSignature, react, vanillaSignature, vanilla, cdn }} />
          <Reference css={css} />
          <p className="doc-note">
            Anything missing? <a className="doc-more" href={`${LINKS.github}/issues`}>Open an issue on GitHub</a>.
          </p>
        </main>
      </div>
      <Footer />
    </>
  );
}
```

- [ ] **Step 7: Give the home's figure its anchor**

In `app/page.tsx`, replace:

```tsx
        <section aria-label="Try it">
```

with:

```tsx
        <section id="try" aria-label="Try it" className="scroll-mt-[calc(var(--topbar)+24px)]">
```

- [ ] **Step 8: Delete `PASTE` and `CARDS`**

- In `lib/snippets.ts`, delete the `/** The quickstart's second step. */` comment and the whole `PASTE` constant under it.
- In `lib/figures.ts`, delete the `/** The four cards under the figures. … */` comment and the whole `CARDS` constant under it.

- [ ] **Step 9: The CSS for the docs**

In `app/globals.css`:

1. Add `--topbar: 54px;` as the first line inside `:root`.

2. In `.topbar`, replace `padding: 12px clamp(18px, 5vw, 28px);` with:

   ```css
   height: var(--topbar); padding: 0 clamp(18px, 5vw, 28px);
   ```

3. Replace the 8 lines from `.code { overflow: hidden; …` through `.code-panel code { font: inherit; }` with:

```css
/* Code: a frame, a bar with the title and a copy icon, the code. Line numbers are a counter in ::before, so they are never selected or copied. */
.code { overflow: hidden; border-radius: 12px; background: #fafafa; box-shadow: inset 0 0 0 1px var(--color-stone); }
.code-bar { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 4px 4px 4px 14px; border-bottom: 1px solid var(--color-stone); }
.code-tabs { display: flex; flex: none; gap: 2px; margin-left: -8px; }
.code-tab { border-radius: 7px; padding: 6px 10px; font-size: 13px; font-weight: 500; line-height: 1; color: var(--color-muted); transition: background-color 150ms ease, color 150ms ease; }
.code-tab[aria-selected="true"] { background: #fff; color: var(--color-ink); box-shadow: 0 0 0 1px var(--color-stone); }
.code-tab:hover { color: var(--color-ink); }
.code-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--color-muted); }
.code-tabs + .code-title { text-align: right; }
.code-body { overflow-x: auto; padding: 16px 18px; font: 400 13px/1.65 var(--font-mono); }
.code-body pre { margin: 0; }
.code-body code { font: inherit; counter-reset: line; }
.code-body .line::before { counter-increment: line; content: counter(line); display: inline-block; width: 2ch; margin-right: 16px; text-align: right; color: var(--color-faint); }
.code-body[data-plain] .line::before { content: none; }
```

4. Delete these four lines:

   ```css
   .card { … }
   .step { min-width: 0; }
   .step-title { … }
   .step-n { … }
   ```

   Also delete the empty line that separates them from `.props`.

5. Replace the five `.props` lines with:

```css
.props, .intensity { width: 100%; border-collapse: collapse; font-size: 13px; }
:is(.props, .intensity) th { padding: 8px 14px 8px 0; text-align: left; font-size: 13px; font-weight: 500; color: var(--color-muted); }
:is(.props, .intensity) td { padding: 12px 14px 12px 0; vertical-align: top; border-top: 1px solid var(--color-line); line-height: 1.5; }
.props td:nth-child(-n + 3) { white-space: nowrap; }
.props td:nth-child(2), .props td:nth-child(3) { color: var(--color-muted); }
.props[data-tokens] td:nth-child(3) { white-space: normal; color: var(--color-ink); }
.intensity td { white-space: nowrap; }
.intensity td:nth-child(n + 3) { color: var(--color-muted); font-variant-numeric: tabular-nums; }
.table-scroll { overflow-x: auto; border-radius: 4px; }

/* The docs: the header and nine sections in one column. Prose stops at 64ch; code and tables take the column. */
.docs { --gutter: clamp(18px, 5vw, 28px); --doc-offset: calc(var(--topbar) + 24px); max-width: 1080px; margin: 0 auto; padding: 0 var(--gutter); }
.docs-main { display: grid; gap: 64px; min-width: 0; padding: 48px 0 96px; }
.docs-main > * { min-width: 0; }
.doc-section { display: grid; gap: 16px; scroll-margin-top: var(--doc-offset); }
.doc-section > * { min-width: 0; }
.doc-h2 { font-size: 24px; font-weight: 500; line-height: 1.2; letter-spacing: -0.02em; }
.doc-p, .doc-list { max-width: 64ch; font-size: 15px; line-height: 1.6; text-wrap: pretty; }
.doc-list { display: grid; gap: 8px; padding-left: 1.2em; list-style: disc; }
.doc-note { max-width: 64ch; font-size: 14px; line-height: 1.55; color: var(--color-muted); text-wrap: pretty; }
.doc-code { font-size: 0.9em; color: var(--color-ink); }
.doc-more { justify-self: start; font-size: 14px; color: var(--color-ink); text-decoration: underline; text-decoration-color: var(--color-faint); text-underline-offset: 4px; }
.doc-more:hover { text-decoration-color: currentColor; }
```

6. Replace the focus rule:

   ```css
   :is(button, a, input, .code-panel):focus-visible { outline: 1.5px solid var(--color-ink); outline-offset: 2px; }
   ```

   with:

   ```css
   :is(button, a, input, .code-body, .table-scroll):focus-visible { outline: 1.5px solid var(--color-ink); outline-offset: 2px; }
   ```

7. In `@media (max-width: 640px)`, replace:

   ```css
   .figure-row { grid-template-columns: minmax(0, 1fr) 120px; gap: 16px; }
   ```

   with:

   ```css
   /* a row stacks, text first, and the figure keeps its width */
   .figure-row { grid-template-columns: minmax(0, 1fr); gap: 16px; }
   .figure-row .tile { justify-self: start; }
   ```

   Then add this as the last line inside that media query:

   ```css
   .props[data-tokens] td:nth-child(3) { flex-basis: 100%; margin-top: 6px; }
   ```

- [ ] **Step 10: Typecheck, then run the Playwright tests to see them pass**

Run: `rtk pnpm typecheck`
Expected: no errors. If a file still imports `PASTE` or `CARDS`, the error names it. Remove that import, since nothing should use either any more.

Run: `lsof -ti:4320; rtk pnpm build && rtk pnpm exec playwright test`
Expected: PASS, 20 tests. Task 1 left 15. "Get started…" and "one family…" were replaced in place, and the 5 new tests ("code block copies", "remembers the tab", "storage throws", "320px", "home's figure") make 20.

Run: `rtk pnpm exec vitest run`
Expected: PASS, 23 tests.

- [ ] **Step 11: Commit**

```bash
rtk git add components/code-block.tsx components/tabs.tsx app/docs/sections.tsx app/docs/page.tsx app/page.tsx app/globals.css lib/snippets.ts lib/figures.ts test/site.spec.ts
rtk git commit -m "Docs: one page of nine sections, code in a frame with line numbers and a remembered tab, the figures live with their intensity table

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: The sidebar and the phone strip

**Files:**
- Create: `components/sidebar.tsx`
- Modify: `app/docs/page.tsx`, `app/globals.css`
- Test: `test/site.spec.ts`

**Interfaces:**
- Consumes:
  - `SECTIONS` and `Group` from `lib/docs.ts` (Task 2).
  - `.docs`, `--topbar`, `--doc-offset` and `section#{id}` from Task 3.
- Produces:
  - `Sidebar()`, a client component with no props, rendered as the first child of `.docs`.
  - Two `<nav aria-label="Docs">` landmarks. `.doc-sidebar` is displayed from 1024px and `.doc-strip` below it, so exactly one is in the accessibility tree at a time.
  - `.doc-strip-scroll`, which carries `data-start` and `data-end` while there is more strip to scroll that way.

- [ ] **Step 1: Write the failing Playwright tests**

Append to `test/site.spec.ts`:

```ts
test("the sidebar's links land on their section under the top bar and mark it, and scrolling moves the mark", async ({ page }) => {
  await page.goto("/docs");
  const nav = page.getByRole("navigation", { name: "Docs" });
  await expect(nav.getByRole("link")).toHaveText(["Install", "Quick start", "Options", "React", "Vanilla", "CDN", "Figures", "Theme", "Accessibility"]);
  await expect(nav.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");

  await nav.getByRole("link", { name: "Theme" }).click();
  await expect(page).toHaveURL(/\/docs#theme$/);
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  await expect(nav.locator("[aria-current]")).toHaveCount(1);
  await expect.poll(() => page.locator("#theme-title").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(54);

  await page.evaluate(() => document.getElementById("figures")!.scrollIntoView());
  await expect(nav.getByRole("link", { name: "Figures" })).toHaveAttribute("aria-current", "location");

  // Accessibility is too short to reach the band; the end of the page marks it
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(nav.getByRole("link", { name: "Accessibility" })).toHaveAttribute("aria-current", "location");
});

test("opening /docs#theme lands on Theme, clear of the top bar, with Theme marked", async ({ page }) => {
  await page.goto("/docs#theme");
  const nav = page.getByRole("navigation", { name: "Docs" });
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  const top = await page.locator("#theme-title").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(54);
  expect(top).toBeLessThan(200);
});

test("on a phone the sidebar is one strip under the top bar, and it follows the reader", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/docs");
  const strip = page.locator(".doc-strip");
  const scroller = strip.locator(".doc-strip-scroll");
  await expect(strip).toBeVisible();
  await expect(page.locator(".doc-sidebar")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(scroller).toHaveAttribute("data-end", "");
  await expect(scroller).not.toHaveAttribute("data-start");

  const inside = async (name: string) => {
    const s = (await scroller.boundingBox())!;
    const b = (await strip.getByRole("link", { name }).boundingBox())!;
    return b.x >= s.x - 1 && b.x + b.width <= s.x + s.width + 1;
  };
  // the page moves, not the strip: the strip has to bring Accessibility in by itself
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(strip.getByRole("link", { name: "Accessibility" })).toHaveAttribute("aria-current", "location");
  await expect.poll(() => inside("Accessibility")).toBe(true);
  await expect(scroller).toHaveAttribute("data-start", "");

  await strip.getByRole("link", { name: "Install" }).click();
  await expect(page).toHaveURL(/#install$/);
  await expect(strip.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");
  await expect.poll(() => inside("Install")).toBe(true);
  // the heading clears the top bar and the strip
  await expect.poll(async () => {
    const s = (await strip.boundingBox())!;
    const t = (await page.locator("#install-title").boundingBox())!;
    return t.y >= s.y + s.height;
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the sidebar is plain links that still move the page, and the quick start shows React", async ({ page }) => {
    await page.goto("/docs");
    const nav = page.getByRole("navigation", { name: "Docs" });
    await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("href", "#theme");
    await nav.getByRole("link", { name: "Theme" }).click();
    await expect(page).toHaveURL(/\/docs#theme$/);
    const quick = page.locator("#quick-start");
    await expect(quick.getByRole("tab", { name: "React" })).toHaveAttribute("aria-selected", "true");
    await expect(quick.locator(".code-title")).toHaveText("app/page.tsx");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `lsof -ti:4320; rtk pnpm build && rtk pnpm exec playwright test -g "sidebar|#theme|strip|without JavaScript"`
Expected: FAIL, 4 tests. There is no navigation named "Docs" and no `.doc-strip`, so each one times out on its first locator.

- [ ] **Step 3: Create `components/sidebar.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS, type Group } from "@/lib/docs";

const GROUPS = [...new Set(SECTIONS.map((s) => s.group))] as Group[];
const LAST = SECTIONS[SECTIONS.length - 1].id;

/**
 * The docs' anchors: grouped in a column beside the page from 1024px, one
 * sideways strip under the top bar below it. Both are plain links, so they
 * work without JavaScript; the script only marks the section in view, which
 * is the first one, in page order, inside a band from under the sticky
 * chrome to 30% down the viewport.
 */
export function Sidebar() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [edges, setEdges] = useState({ start: false, end: false });
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    // the band starts where a section lands after a click: its scroll-margin-top, under the top bar and on a phone the strip
    const offset = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0;
    const inBand = new Set<string>();
    const pick = () => {
      const end = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      // the last section is too short to reach the band, so the end of the page marks it
      if (end) return setActive(LAST);
      const first = SECTIONS.find((s) => inBand.has(s.id));
      if (first) setActive(first.id);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        pick();
      },
      { rootMargin: `-${offset}px 0px -70% 0px` },
    );
    for (const el of sections) observer.observe(el);
    window.addEventListener("scroll", pick, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, []);

  // Brings the marked item into the strip by scrolling the strip alone. scrollIntoView would also scroll the
  // page, and would cut short the smooth scroll a click on the strip has just started.
  useEffect(() => {
    const el = strip.current;
    const item = el?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!el || !item || !el.clientWidth) return;
    const pad = 24;
    if (item.offsetLeft - pad < el.scrollLeft) el.scrollTo({ left: item.offsetLeft - pad });
    else if (item.offsetLeft + item.offsetWidth + pad > el.scrollLeft + el.clientWidth) el.scrollTo({ left: item.offsetLeft + item.offsetWidth + pad - el.clientWidth });
  }, [active]);

  const link = (id: string, title: string) => (
    <li key={id}>
      <a href={`#${id}`} className="doc-link" aria-current={id === active ? "location" : undefined}>{title}</a>
    </li>
  );

  return (
    <>
      <nav aria-label="Docs" className="doc-sidebar">
        {GROUPS.map((group) => (
          <div key={group} className="doc-group">
            <p className="doc-group-label">{group}</p>
            <ul>{SECTIONS.filter((s) => s.group === group).map((s) => link(s.id, s.title))}</ul>
          </div>
        ))}
      </nav>
      <nav aria-label="Docs" className="doc-strip">
        <div ref={strip} className="doc-strip-scroll" data-start={edges.start || undefined} data-end={edges.end || undefined}>
          <ul>{SECTIONS.map((s) => link(s.id, s.title))}</ul>
        </div>
      </nav>
    </>
  );
}
```

Spec deviation: the spec names `scrollIntoView({ block: "nearest", inline: "nearest" })` for the strip. That call scrolls every scrolling ancestor, the page included, and in Chrome it cancels the page's smooth scroll that a click has just started. Scrolling the strip itself, with the same "nearest" rule, keeps the behaviour the spec asks for without that side effect.

- [ ] **Step 4: Put the sidebar on the page**

In `app/docs/page.tsx`:

1. Add the import:

   ```tsx
   import { Sidebar } from "@/components/sidebar";
   ```

2. Replace:

   ```tsx
         <div className="docs">
           <main className="docs-main">
   ```

   with:

   ```tsx
         <div className="docs">
           <Sidebar />
           <main className="docs-main">
   ```

- [ ] **Step 5: The CSS for the sidebar, the strip and smooth scrolling**

In `app/globals.css`:

1. Replace `html { color-scheme: light; scroll-behavior: smooth; }` with:

   ```css
   html { color-scheme: light; }
   @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
   ```

   Then delete `html { scroll-behavior: auto; }` from the `@media (prefers-reduced-motion: reduce)` block.

2. In the `.docs` rule from Task 3, change `--doc-offset: calc(var(--topbar) + 24px);` to `--doc-offset: calc(var(--topbar) + 60px);`. On a phone that is the top bar, the 44px strip and 16px of air.

3. Add after the `.doc-more:hover` rule:

```css
/* The sidebar: the same links twice, grouped in a column from 1024px, one sideways strip under the top bar below it. */
.doc-link { display: flex; align-items: center; height: 32px; padding: 0 10px; border-radius: 8px; font-size: 14px; color: var(--color-muted); white-space: nowrap; transition: background-color 150ms ease, color 150ms ease; }
.doc-link:hover { color: var(--color-ink); }
.doc-link[aria-current] { color: var(--color-ink); background: var(--color-stone); }
.doc-sidebar { display: none; }
.doc-group-label { margin-bottom: 4px; padding: 0 10px; font-size: 12px; font-weight: 500; color: var(--color-muted); }
.doc-strip { position: sticky; top: var(--topbar); z-index: 9; margin: 0 calc(-1 * var(--gutter)); background: color-mix(in srgb, var(--color-canvas) 82%, transparent); backdrop-filter: blur(12px); }
.doc-strip-scroll { overflow-x: auto; padding: 6px var(--gutter); scrollbar-width: none; }
.doc-strip-scroll::-webkit-scrollbar { display: none; }
.doc-strip-scroll ul { display: flex; gap: 2px; width: max-content; }
.doc-strip-scroll[data-start] { mask-image: linear-gradient(to right, transparent, #000 24px); }
.doc-strip-scroll[data-end] { mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent); }
.doc-strip-scroll[data-start][data-end] { mask-image: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent); }
@media (min-width: 1024px) {
  .docs { --doc-offset: calc(var(--topbar) + 24px); display: grid; grid-template-columns: 220px minmax(0, 1fr); column-gap: 56px; padding-top: 64px; }
  .docs-main { padding-top: 0; }
  .doc-strip { display: none; }
  .doc-sidebar { display: grid; gap: 24px; align-self: start; position: sticky; top: calc(var(--topbar) + 24px); }
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `rtk pnpm typecheck`
Expected: no errors.

Run: `lsof -ti:4320; rtk pnpm build && rtk pnpm exec playwright test`
Expected: PASS, 24 tests: Task 3's 20 plus the 4 new ones.

Run: `rtk pnpm exec vitest run`
Expected: PASS, 23 tests.

- [ ] **Step 7: Look at it**

With the server from the last run stopped, run `rtk pnpm exec next start -p 4320` in the background. Then take screenshots with Playwright's `page.screenshot` at three sizes:
- 1200×900 for `/docs`, the top of the page.
- 1200×900 for `/docs#figures`.
- 390×800 for `/docs`, after scrolling to Quick start.

Save them in `/Users/lucasmarques/.claude/jobs/bf2ea971/tmp`, read each one, and check:
- the sidebar sits beside the h1 and stays under the top bar while scrolling;
- the strip shows its right fade;
- code blocks show line numbers in a faint grey, and the signatures show none;
- the figure rows stack on the phone.

Then stop the server. Any defect goes back through a failing test first.

- [ ] **Step 8: Commit and push**

```bash
rtk git add components/sidebar.tsx app/docs/page.tsx app/globals.css test/site.spec.ts
rtk git commit -m "Docs: a sidebar of anchors marks the section in view, and on a phone it is one strip under the top bar that follows the reader

Co-Authored-By: Claude <noreply@anthropic.com>"
rtk git push origin site-on-vercel
```

Expected: the push updates PR #1's branch. Vercel builds a preview from it.
