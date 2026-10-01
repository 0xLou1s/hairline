# `/skill` Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/skill` page on the Hairline site that shows four figures the `hairline-create` skill drew, each live beside the prompt that produced it, and says how to install the skill, how it works and how to use it.

**Architecture:** The four generated pages are copied byte for byte into `apps/site/public/skill/` and shown in same-origin `iframe`s. One module, `lib/skill.ts`, holds the list and the page's copy; it reads each figure's `name` and `means` out of the generated page, so nothing about an example is written twice. The page is a Server Component; two small client components do the copying and fit each frame's height to the page inside it.

**Tech Stack:** Next 16 (App Router), React 19, Tailwind 4 with the site's own classes in `globals.css`, vitest 5, Playwright 1.63 driving Chrome, pnpm 10.20 + turbo, Node 22.

**Spec:** `docs/superpowers/specs/2026-10-01-hairline-skill-page-design.md`

## Global Constraints

- All copy, code and comments are in English, in the site's voice: short, plain, no exclamation marks.
- The site is light only (`html { color-scheme: light }`). Every frame is loaded with `?theme=light`.
- The generated pages in `apps/site/public/skill/` are never edited. They are copied from the skill's output and that is all.
- Nothing in `packages/hairline/src` changes. Nothing in `skills/hairline-create/` changes.
- No new dependency.
- The install command is exactly `npx skills add lucasmarkes/hairline`. The skill's command is exactly `/hairline-create`.
- The four ideas, in page order: `a sales funnel`, `a rate limiter`, `git branches`, `weather over a city`.
- Shell: prefix commands with `rtk`. The working directory resets after every command, so each command starts with `cd ~/estudos/hairline` (or a folder under it).
- Commits: stage files by name, never `git add .` or `-A`. Never commit `apps/site/.vitest/`, `apps/site/AGENTS.md`, `apps/site/CLAUDE.md`, `.vercel/`, `.superpowers/`, `.claude/` or `.env.local`. Every commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Before any browser run, free the site's test port, or Playwright reuses a server holding an old build: `lsof -ti:4320 | xargs kill 2>/dev/null; true`.
- The pull request is opened but not merged. Merging needs Lucas's yes.

## Preconditions

These are true before Task 1 starts. Check each; if one is false, stop and say which.

1. Pull request #4 is merged and local `main` has it:
   `cd ~/estudos/hairline && rtk git checkout main && rtk git pull && ls skills/hairline-create/validate.mjs`
2. The bench takes a `theme` parameter:
   `cd ~/estudos/hairline && rtk proxy grep -n -e 'params.get("theme")' skills/hairline-create/bench.html`
   Expected: one line.
3. The four regenerated pages exist, one per idea, each under its own folder:
   `cd ~/estudos/hairline && ls .superpowers/trial/rerun/*/hairline-*.html`
   Expected: four files, in the folders `1-sales-funnel`, `2-rate-limiter`, `3-git-branches`, `4-weather-city`.
4. A branch for this work, with the spec and this plan as its first commit:

```bash
cd ~/estudos/hairline && rtk git checkout -b skill-page && rtk git add docs/superpowers/specs/2026-10-01-hairline-skill-page-design.md docs/superpowers/plans/2026-10-01-hairline-skill-page.md && rtk git commit -m "Skill page: the design and the plan

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Review Focus

Conditions the spec implies and that are most likely to bite a visitor. Each has a test in the task named.

1. **A dark system.** The site is white; a frame that follows the system would be a black plate on it. Expected: every frame's page is light. Test in Task 2.
2. **A phone.** At 320px the frame's own text wraps to more lines. Expected: no sideways scroll on the page and no scroll inside a frame. Test in Task 2.
3. **No JavaScript.** The frames cannot be fitted and the copy buttons do nothing. Expected: the install command, the four prompts and the four links to the generated pages are still on the page as text and links. Test in Task 2.
4. **An example that goes missing or is edited.** A file renamed, deleted or retouched by hand. Expected: the build and the tests fail with a message naming the file, instead of a blank frame in production. Tests in Task 1.
5. **A link opened on its own.** Someone opens `/skill/hairline-<name>.html` directly from the link or from `llms.txt`. Expected: the page is served as HTML and draws. Test in Task 2.

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/site/public/skill/hairline-<name>.html` (four, new) | The skill's output, unaltered. |
| `apps/site/lib/skill.ts` (new) | `INSTALL`, `COMMAND`, `EXAMPLES`, the page's copy as text, and `examples()`, which adds each figure's declared `name` and `means`. |
| `apps/site/components/command.tsx` (new) | One line of text in a pill with a copy button. |
| `apps/site/components/example-frame.tsx` (new) | The `iframe`, fitted to the height of the page inside it. |
| `apps/site/app/skill/page.tsx` (new) | The page. |
| `apps/site/app/globals.css` (modify) | The page's layout classes. |
| `apps/site/components/chrome.tsx` (modify) | The `Skill` link in the top bar. |
| `apps/site/lib/llms.ts` (modify) | A `## Skill` section. |
| `apps/site/test/skill.test.ts` (new) | Vitest: the showcase is honest. |
| `apps/site/test/skill.spec.ts` (new) | Playwright: the page in a browser. |
| `apps/site/test/site.spec.ts` (modify) | The top bar now holds five items. |
| `apps/site/test/docs.test.ts` (modify) | `llms.txt` has the skill. |

---

### Task 1: The examples and their honesty

**Files:**
- Create: `apps/site/public/skill/hairline-<name>.html` (four files, copied)
- Create: `apps/site/lib/skill.ts`
- Test: `apps/site/test/skill.test.ts`

**Interfaces:**
- Consumes: `skills/hairline-create/validate.mjs`, run as `node validate.mjs <page.html>`; it exits 0 and prints a line starting `ok` when the page passes, and exits 1 with one line per problem on stderr when it does not.
- Produces, from `@/lib/skill`:
  - `INSTALL: string`, `COMMAND: string`
  - `type Example = { idea: string; file: string }`
  - `EXAMPLES: Example[]` (four, in page order)
  - `type Shown = Example & { name: string; means: string; prompt: string; href: string }`
  - `declared(html: string, file: string): { name: string; means: string }`
  - `examples(): Shown[]`
  - `SUMMARY: string`, `STEPS: { title: string; text: string }[]`, `FOLDER: string`, `USE: string[]`

- [ ] **Step 1: Copy the four generated pages**

```bash
cd ~/estudos/hairline && mkdir -p apps/site/public/skill && cp .superpowers/trial/rerun/*/hairline-*.html apps/site/public/skill/ && ls apps/site/public/skill && for d in .superpowers/trial/rerun/*/; do echo "$d -> $(ls $d | grep '^hairline-.*\.html$')"; done
```

Expected: four `hairline-<name>.html` files listed, then one line per folder saying which file came from which idea. Keep that mapping for Step 3. The files are not opened in an editor and not reformatted.

- [ ] **Step 2: Write the failing test**

Create `apps/site/test/skill.test.ts`:

```ts
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND, EXAMPLES, INSTALL, declared, examples } from "@/lib/skill";

/** The showcase is the skill's own output: these fail if an example was edited, renamed, dropped, or left behind by the kernel. */

const PUBLIC = fileURLToPath(new URL("../public/skill/", import.meta.url));
const VALIDATE = fileURLToPath(new URL("../../../skills/hairline-create/validate.mjs", import.meta.url));

describe("the skill's examples", () => {
  it("are the four ideas, in page order", () => {
    expect(EXAMPLES.map((e) => e.idea)).toEqual(["a sales funnel", "a rate limiter", "git branches", "weather over a city"]);
  });

  it("are exactly the files in public/skill", () => {
    expect(EXAMPLES.map((e) => e.file).sort()).toEqual(readdirSync(PUBLIC).sort());
  });

  it.each(EXAMPLES)("$file passes the skill's validator untouched", ({ file }) => {
    const run = spawnSync(process.execPath, [VALIDATE, PUBLIC + file], { encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
  });

  it("each carry the name their file is called by, a meaning, the prompt and the link", () => {
    for (const e of examples()) {
      expect(e.file).toBe(`hairline-${e.name}.html`);
      expect(e.means.length).toBeGreaterThan(0);
      expect(e.means.length).toBeLessThanOrEqual(140);
      expect(e.prompt).toBe(`${COMMAND} ${e.idea}`);
      expect(e.href).toBe(`/skill/${e.file}`);
    }
  });

  it("read the meaning out of the page, escapes undone", () => {
    const page = '<script type="module" id="hl-figure">\nconst tray = { name: "other", means: "not this" };\nhairline({ name: "tiers", means: "A \\"funnel\\" as trays.", rules: [1], range: [0, 1, 2], mount });\n</script>';
    expect(declared(page, "x.html")).toEqual({ name: "tiers", means: 'A "funnel" as trays.' });
  });

  it("refuse a page with no figure in it, naming the file", () => {
    expect(() => declared("<html></html>", "hairline-gone.html")).toThrow(/hairline-gone\.html/);
  });
});

describe("the skill's commands", () => {
  it("are the ones the skill is installed and called by", () => {
    expect(INSTALL).toBe("npx skills add lucasmarkes/hairline");
    expect(COMMAND).toBe("/hairline-create");
    expect(readFileSync(fileURLToPath(new URL("../../../skills/hairline-create/SKILL.md", import.meta.url)), "utf8")).toContain("name: hairline-create");
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd ~/estudos/hairline/apps/site && rtk proxy pnpm exec vitest run test/skill.test.ts`
Expected: FAIL, the import of `@/lib/skill` cannot be resolved.

- [ ] **Step 4: Write `lib/skill.ts`**

Create `apps/site/lib/skill.ts`. In `EXAMPLES`, each `file` is the file name Step 1 printed for that idea's folder.

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The skill, as the site tells it: the two commands, the examples, and the
 * page's copy as plain text, so /skill and /llms.txt say the same thing.
 * Server only: it reads the generated pages from public/skill.
 */

export const INSTALL = "npx skills add lucasmarkes/hairline";
export const COMMAND = "/hairline-create";

export type Example = { idea: string; file: string };

/** What was typed after the command, and the page the skill wrote for it. The pages are never edited. */
export const EXAMPLES: Example[] = [
  { idea: "a sales funnel", file: "hairline-<name printed for 1-sales-funnel>.html" },
  { idea: "a rate limiter", file: "hairline-<name printed for 2-rate-limiter>.html" },
  { idea: "git branches", file: "hairline-<name printed for 3-git-branches>.html" },
  { idea: "weather over a city", file: "hairline-<name printed for 4-weather-city>.html" },
];

export type Shown = Example & { name: string; means: string; prompt: string; href: string };

const FIGURE = /<script type="module" id="hl-figure">([\s\S]*?)<\/script>/;
const NAME = /\bname:\s*["'`]([a-z][a-z0-9-]*)["'`]/;
const MEANS = /\bmeans:\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/;

/** The name and the meaning a generated page declares for its figure. */
export function declared(html: string, file: string): { name: string; means: string } {
  const figure = FIGURE.exec(html)?.[1] ?? "";
  // the declaration is the page's last call; a `name:` earlier in the figure's own code is not it
  const call = figure.slice(Math.max(0, figure.lastIndexOf("hairline({")));
  const name = NAME.exec(call)?.[1];
  const means = MEANS.exec(call)?.[2];
  if (!name || !means) throw new Error(`skill: ${file} is not a page made by the skill's build.mjs.`);
  return { name, means: means.replace(/\\(.)/g, "$1") };
}

/** The examples with what their pages declare. `next build` and vitest both run from apps/site. */
export function examples(): Shown[] {
  return EXAMPLES.map((e) => {
    const html = readFileSync(join(process.cwd(), "public", "skill", e.file), "utf8");
    return { ...e, ...declared(html, e.file), prompt: `${COMMAND} ${e.idea}`, href: `/skill/${e.file}` };
  });
}

export const SUMMARY = "hairline-create is a skill for coding agents. Give it an idea and it draws a new figure to Hairline's ten rules, on the same engine as the six, as one HTML file.";

export const STEPS: { title: string; text: string }[] = [
  { title: "Concepts", text: "It offers two or three concepts, one line each: the object, what the pointer does, what the read-out says. You pick one." },
  { title: "Build", text: "It writes only the figure. The engine and the page around it are pasted in as they are." },
  { title: "Check", text: "A script checks the file against the rules, then the agent looks at it in a browser." },
  { title: "Hand over", text: "You get the page, the metaphor it used, the rules it leans on, and anything it could not check." },
  { title: "Adjust", text: "Ask for changes while you use it. It edits the figure and checks again." },
];

export const FOLDER = "What you install is one folder of small text files. There is no npm install, and Node is only needed to run the checks.";

export const USE: string[] = [
  "Type the command with an idea. If you already have the metaphor, say it, and the concepts step is skipped.",
  "Out comes hairline-<name>.html: one file with no dependencies that opens from disk, holding the figure, an intensity slider and a theme switch.",
  "It runs on any agent that reads skills: Claude Code, Cursor, Codex and others.",
];
```

- [ ] **Step 5: Run the test to see it pass**

Run: `cd ~/estudos/hairline/apps/site && rtk proxy pnpm exec vitest run test/skill.test.ts`
Expected: PASS, 10 tests (4 of them from `it.each`).

- [ ] **Step 6: Prove the test catches a retouched example**

```bash
cd ~/estudos/hairline/apps/site && f=$(ls public/skill | head -1) && cp public/skill/$f /Users/lucasmarques/.claude/jobs/bf2ea971/tmp/$f && printf '\n<!-- touched -->\n<p>x</p>\n' >> public/skill/$f && rtk proxy pnpm exec vitest run test/skill.test.ts; cp /Users/lucasmarques/.claude/jobs/bf2ea971/tmp/$f public/skill/$f && rtk proxy pnpm exec vitest run test/skill.test.ts
```

Expected: the first run FAILS on "passes the skill's validator untouched" with a `bench:` line in stderr; after the file is restored, the second run PASSES.

- [ ] **Step 7: Run the site's whole unit suite and the typecheck**

Run: `cd ~/estudos/hairline && rtk proxy pnpm --filter @hairline/site test && rtk proxy pnpm --filter @hairline/site typecheck`
Expected: every test passes; typecheck prints no error.

- [ ] **Step 8: Commit**

```bash
cd ~/estudos/hairline && rtk git add apps/site/public/skill apps/site/lib/skill.ts apps/site/test/skill.test.ts && rtk git status && rtk git commit -m "Skill page: four figures the skill drew, kept as it wrote them, and a test that fails if one is touched

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Check `git status` first: only the four pages, `lib/skill.ts` and `test/skill.test.ts` are staged.

---

### Task 2: The page

**Files:**
- Create: `apps/site/components/command.tsx`
- Create: `apps/site/components/example-frame.tsx`
- Create: `apps/site/app/skill/page.tsx`
- Modify: `apps/site/app/globals.css` (append at the end)
- Test: `apps/site/test/skill.spec.ts`

**Interfaces:**
- Consumes, from `@/lib/skill` (Task 1): `INSTALL`, `COMMAND`, `SUMMARY`, `STEPS`, `FOLDER`, `USE`, `examples(): Shown[]` where `Shown = { idea, file, name, means, prompt, href }`.
- Consumes, already in the site: `Topbar`, `Footer` from `@/components/chrome`; `CopyIcon` from `@/components/copy` (props `text`, `select`, `label`); `LINKS.github` from `@/lib/figures`; the classes `.pill`, `.pill-line`, `.doc-section`, `.doc-h2`, `.doc-p`, `.doc-note`, `.doc-more`, `.doc-code`.
- Consumes, from the generated page: `main` (the page's one column), `#stage`, `#read` (reads `rest` until the pointer picks something), `body` padding of 24px top and bottom, and the `?theme=light` parameter.
- Produces: the route `/skill`; the hooks `[data-command="install"]`, `[data-command="prompt"]` (the four examples only), `[data-command="usage"]`, `[data-example]`, `[data-steps]`, used by the tests here and in Task 3.

- [ ] **Step 1: Write the failing browser tests**

Create `apps/site/test/skill.spec.ts`:

```ts
import { expect, test, type FrameLocator, type Page } from "@playwright/test";

const INSTALL = "npx skills add lucasmarkes/hairline";
const IDEAS = ["a sales funnel", "a rate limiter", "git branches", "weather over a city"];

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

/** The frames are lazy: each is brought on screen, then waited for until its figure is drawn. */
async function frames(page: Page): Promise<FrameLocator[]> {
  const out: FrameLocator[] = [];
  for (let i = 0; i < IDEAS.length; i++) {
    const row = page.locator("[data-example]").nth(i);
    await row.scrollIntoViewIfNeeded();
    const frame = row.frameLocator("iframe");
    await expect(frame.locator("#stage svg")).toHaveCount(1);
    out.push(frame);
  }
  return out;
}

/** How tall the frame is, and how tall the page inside it needs to be. */
const fit = (frame: FrameLocator) => frame.locator("main").evaluate((main) => ({ frame: window.innerHeight, page: (main as HTMLElement).offsetHeight + 48 }));

test("/skill opens with the install command, four prompts and four live figures, and a clean console", async ({ page }) => {
  const noise = watch(page);
  await page.goto("/skill");
  await expect(page).toHaveTitle("Skill · hairline");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('[data-command="install"]')).toHaveText(new RegExp(INSTALL));
  await expect(page.locator('[data-command="prompt"]')).toHaveText(IDEAS.map((idea) => new RegExp(`/hairline-create ${idea}$`)));
  await expect(page.locator("[data-steps] > li")).toHaveCount(5);
  await frames(page);
  expect(noise).toEqual([]);
});

test("a figure on /skill answers the pointer and goes back to rest", async ({ page }) => {
  await page.goto("/skill");
  for (const frame of await frames(page)) {
    const read = frame.locator("#read");
    await expect(read).toHaveText("rest");
    const box = (await frame.locator("#stage").boundingBox())!;
    // somewhere on the stage the figure picks something; walk a grid until it does
    let answered = false;
    for (const fy of [0.5, 0.35, 0.65]) {
      for (const fx of [0.5, 0.35, 0.65]) {
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 4 });
        if ((await read.textContent()) !== "rest") { answered = true; break; }
      }
      if (answered) break;
    }
    expect(answered).toBe(true);
    await page.mouse.move(2, 2);
    await expect(read).toHaveText("rest");
  }
});

test("each frame is named by what its figure means, and its link opens the page the skill wrote", async ({ page, request }) => {
  await page.goto("/skill");
  for (const row of await page.locator("[data-example]").all()) {
    const title = await row.locator("iframe").getAttribute("title");
    expect(title!.length).toBeGreaterThan(20);
    const href = await row.getByRole("link", { name: "Open the page" }).getAttribute("href");
    expect(href).toMatch(/^\/skill\/hairline-[a-z0-9-]+\.html$/);
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
    expect(await res.text()).toContain('id="hl-figure"');
  }
});

test("the install command and a prompt copy as they are written", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/skill");
  await page.locator('[data-command="install"] .icopy').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(INSTALL);
  await page.locator('[data-command="prompt"] .icopy').nth(2).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("/hairline-create git branches");
});

for (const width of [1200, 320]) {
  test(`at ${width}px /skill does not scroll sideways, and no frame scrolls inside`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/skill");
    const list = await frames(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    for (const frame of list) {
      await expect.poll(async () => { const f = await fit(frame); return f.frame - f.page; }).toBe(0);
    }
  });
}

test.describe("on a dark system", () => {
  test.use({ colorScheme: "dark" });

  test("every frame is still light, as the site is", async ({ page }) => {
    await page.goto("/skill");
    for (const frame of await frames(page)) {
      expect(await frame.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)).toBe("rgb(255, 255, 255)");
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/skill still gives the install command, the prompts and the links to the pages", async ({ page }) => {
    await page.goto("/skill");
    await expect(page.locator('[data-command="install"]')).toHaveText(new RegExp(INSTALL));
    await expect(page.locator('[data-command="prompt"]')).toHaveCount(4);
    await expect(page.getByRole("link", { name: "Open the page" })).toHaveCount(4);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd ~/estudos/hairline && lsof -ti:4320 | xargs kill 2>/dev/null; rtk proxy pnpm --filter @hairline/site build && cd apps/site && rtk proxy pnpm exec playwright test skill.spec.ts`
Expected: every test FAILS, `/skill` is a 404.

- [ ] **Step 3: Write `components/command.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { CopyIcon } from "./copy";

/**
 * One line to type, in a pill with a copy icon. `kind` says which line it is,
 * for the tests (`prompt` is an example's, `usage` the bare command); a shell
 * command takes the `$` in front of it.
 */
export function Command({ code, kind, label }: { code: string; kind: "install" | "prompt" | "usage"; label: string }) {
  const line = useRef<HTMLElement>(null);
  return (
    <div className="pill" data-command={kind}>
      {kind === "install" && <span aria-hidden="true" className="select-none text-faint">$</span>}
      <code ref={line} className="pill-line" title={code}>{code}</code>
      <CopyIcon text={code} select={line} label={label} />
    </div>
  );
}
```

- [ ] **Step 4: Write `components/example-frame.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";

/** The generated page's body has 24px of padding above and below its one column. */
const PAD = 48;

/**
 * A page the skill wrote, in a frame as tall as that page: the frame never
 * scrolls inside. Its height is reserved in CSS before it loads, then fitted
 * to the page's column and kept fitted as the column's text wraps.
 */
export function ExampleFrame({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let watch: ResizeObserver | undefined;
    const fit = () => {
      const view = el.contentWindow as (Window & typeof globalThis) | null;
      const main = el.contentDocument?.querySelector("main");
      if (!view || !main) return;
      const size = () => { el.style.height = `${main.offsetHeight + PAD}px`; };
      size();
      watch?.disconnect();
      // the frame's own observer: its column is in the frame's document
      watch = new view.ResizeObserver(size);
      watch.observe(main);
    };
    fit();
    el.addEventListener("load", fit);
    return () => {
      el.removeEventListener("load", fit);
      watch?.disconnect();
    };
  }, []);

  return <iframe ref={frame} className="example-frame" src={src} title={title} loading="lazy" />;
}
```

- [ ] **Step 5: Add the page's classes**

Append to the end of `apps/site/app/globals.css`:

```css
/* /skill: the pitch, then each prompt beside the page it produced, then how it works and how to use it. */
.skill { display: grid; gap: 72px; max-width: 1080px; margin: 0 auto; padding: 64px clamp(18px, 5vw, 28px) 96px; }
.skill > * { min-width: 0; }
.skill-install { margin-top: 28px; max-width: 460px; }
.example { display: grid; gap: 16px; padding: 28px 0; border-top: 1px solid var(--color-line); }
.example:last-child { border-bottom: 1px solid var(--color-line); }
.example > * { min-width: 0; }
.example-prompt { display: grid; gap: 12px; align-content: start; }
.example-figure { container-type: inline-size; }
/* the height the generated page takes before it is measured: its 5:4 stage, at most 640px wide, and the lines under it */
.example-frame { display: block; width: 100%; height: calc(min(100cqw - 32px, 640px) * 0.8 + 190px); border: 0; }
.skill-steps { display: grid; gap: 12px; max-width: 64ch; counter-reset: step; }
.skill-steps > li { display: grid; grid-template-columns: 2.2em minmax(0, 1fr); font-size: 15px; line-height: 1.55; color: var(--color-muted); counter-increment: step; }
.skill-steps > li::before { content: counter(step, decimal-leading-zero); font: 400 12px/1.95 var(--font-mono); color: var(--color-faint); }
.skill-steps strong { font-weight: 500; color: var(--color-ink); }

@media (min-width: 900px) {
  .example { grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); gap: 40px; align-items: start; }
  .example-prompt { position: sticky; top: calc(var(--topbar) + 24px); }
}
```

- [ ] **Step 6: Write the page**

Create `apps/site/app/skill/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Footer, Topbar } from "@/components/chrome";
import { Command } from "@/components/command";
import { ExampleFrame } from "@/components/example-frame";
import { LINKS } from "@/lib/figures";
import { COMMAND, FOLDER, INSTALL, STEPS, SUMMARY, USE, examples } from "@/lib/skill";

export const metadata: Metadata = { title: "Skill · hairline", description: SUMMARY, alternates: { canonical: "/skill" } };

/**
 * The skill's page: what it draws first, then how to get it and use it. A
 * Server Component: it reads each example's name and meaning from the page
 * the skill wrote, and that page is shown as it is, in a frame.
 */
export default function Skill() {
  const shown = examples();
  return (
    <>
      <Topbar />
      <main className="skill">
        <header>
          <h1 className="max-w-[16ch] text-[36px] font-medium leading-[1.05] tracking-[-0.035em] md:text-[44px]">A seventh figure, from one line.</h1>
          <p className="mt-4 max-w-[64ch] text-[16px] leading-[1.55] text-muted">{SUMMARY}</p>
          <div className="skill-install"><Command code={INSTALL} kind="install" label="Copy install command" /></div>
        </header>

        <section aria-labelledby="examples-title" className="doc-section">
          <h2 id="examples-title" className="doc-h2">What it draws</h2>
          <p className="doc-p">Each figure below is the page the skill wrote for the line beside it, as it wrote it. Move the pointer over one.</p>
          <div>
            {shown.map((e) => (
              <article key={e.file} className="example" data-example={e.name}>
                <div className="example-prompt">
                  <Command code={e.prompt} kind="prompt" label="Copy prompt" />
                  <a className="doc-more" href={e.href}>Open the page</a>
                </div>
                <div className="example-figure">
                  <ExampleFrame src={`${e.href}?theme=light`} title={e.means} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-title" className="doc-section">
          <h2 id="how-title" className="doc-h2">How it works</h2>
          <ol className="skill-steps" data-steps>
            {STEPS.map((s) => (
              <li key={s.title}><span><strong>{s.title}.</strong> {s.text}</span></li>
            ))}
          </ol>
          <p className="doc-note">{FOLDER}</p>
        </section>

        <section aria-labelledby="use-title" className="doc-section">
          <h2 id="use-title" className="doc-h2">How to use it</h2>
          <div className="max-w-[460px]"><Command code={`${COMMAND} <idea>`} kind="usage" label="Copy command" /></div>
          {USE.map((line) => <p key={line} className="doc-p">{line}</p>)}
          <p className="doc-note">
            The six figures and their options are in <a className="doc-more" href="/docs">the docs</a>. The skill&rsquo;s files are in <a className="doc-more" href={`${LINKS.github}/tree/main/skills/hairline-create`}>its folder on GitHub</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
```

The command under "How to use it" has its own kind, `usage`, so `[data-command="prompt"]` counts only the four examples.

- [ ] **Step 7: Build and run the browser tests**

Run: `cd ~/estudos/hairline && lsof -ti:4320 | xargs kill 2>/dev/null; rtk proxy pnpm --filter @hairline/site build && cd apps/site && rtk proxy pnpm exec playwright test skill.spec.ts`
Expected: PASS, 9 tests. In the build's route list, `/skill` is static (`○`).

If "no frame scrolls inside" fails by a constant, the generated page's body padding is not 24px: read `body { padding: … }` in `skills/hairline-create/bench.html` and set `PAD` in `example-frame.tsx` and the `48` in the test's `fit` to twice its vertical value.

- [ ] **Step 8: Look at it**

```bash
cd ~/estudos/hairline/apps/site && cat > .shot.mjs <<'EOF'
import { chromium } from "@playwright/test";
const out = "/Users/lucasmarques/.claude/jobs/bf2ea971/tmp";
const browser = await chromium.launch({ channel: "chrome" });
for (const [name, width] of [["wide", 1200], ["phone", 375]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("http://localhost:4320/skill");
  for (const row of await page.locator("[data-example]").all()) { await row.scrollIntoViewIfNeeded(); await page.waitForTimeout(900); }
  await page.screenshot({ path: `${out}/skill-${name}.png`, fullPage: true });
  await page.close();
}
await browser.close();
EOF
(pnpm exec next start -p 4320 >/dev/null 2>&1 &) ; sleep 4; node .shot.mjs; rm -f .shot.mjs; lsof -ti:4320 | xargs kill 2>/dev/null; true
```

Open both pictures and check, against the home and `/docs`: the headline, the pill and the section titles match the site's type; each prompt sits beside its figure at 1200px and above it at 375px; no frame shows a scrollbar or a band of empty space under its last line; the frame's plate border is the only border around a figure. Fix what is off in `globals.css` and run Step 7 again.

- [ ] **Step 9: Run everything**

Run: `cd ~/estudos/hairline && lsof -ti:4320 | xargs kill 2>/dev/null; rtk proxy pnpm typecheck && rtk proxy pnpm test && rtk proxy pnpm test:browser`
Expected: all pass. `site.spec.ts:185` (the arrow-keys picker) is known to fail once in a while and pass on a second run; if it is the only failure, run it again and say so in the report.

- [ ] **Step 10: Commit**

```bash
cd ~/estudos/hairline && rtk git add apps/site/components/command.tsx apps/site/components/example-frame.tsx apps/site/app/skill/page.tsx apps/site/app/globals.css apps/site/test/skill.spec.ts && rtk git status && rtk git commit -m "Skill page: each prompt beside the figure it produced, live, then how the skill works and how to use it

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: The way in: top bar and `llms.txt`

**Files:**
- Modify: `apps/site/components/chrome.tsx` (the `Topbar`'s `nav`)
- Modify: `apps/site/lib/llms.ts` (before the `## Links` section)
- Modify: `apps/site/test/site.spec.ts` (the two top-bar tests near lines 42 and 48)
- Modify: `apps/site/test/docs.test.ts` (the `/llms.txt` describe block)
- Test: `apps/site/test/skill.spec.ts` (two tests added)

**Interfaces:**
- Consumes, from `@/lib/skill` (Task 1): `INSTALL`, `COMMAND`, `SUMMARY`, `EXAMPLES` (`{ idea, file }[]`). `llms.ts` uses only these constants; it does not call `examples()`.
- Produces: a `Skill` link in the top bar, second after `Docs`; a `## Skill` section in `/llms.txt`.

- [ ] **Step 1: Change the top-bar tests and add the new ones**

In `apps/site/test/site.spec.ts`, replace the test that starts at line 42 with:

```ts
test("the top bar holds the docs, the skill, the story, the version and GitHub, and no llms.txt button", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".topbar nav > *")).toHaveCount(5);
  await expect(page.locator(".topbar nav > a").nth(1)).toHaveText("Skill");
  await expect(page.locator(".topbar")).not.toContainText("llms.txt");
});
```

In the test that follows it ("the top bar's links sit as one row…"), change `expect(items).toHaveLength(4);` to `expect(items).toHaveLength(5);`.

Append to `apps/site/test/skill.spec.ts`:

```ts
test("the top bar's Skill link opens /skill", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Skill" }).click();
  await expect(page).toHaveURL(/\/skill$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A seventh figure, from one line.");
});

test("the top bar fits a 320px screen with its five items on one row", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/skill");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const tops = await page.locator(".topbar nav > *").evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== "none").map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  const bar = (await page.locator(".topbar").boundingBox())!;
  const last = (await page.locator(".topbar nav > *").last().boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(bar.x + bar.width);
});
```

In `apps/site/test/docs.test.ts`, add the import `import { COMMAND, EXAMPLES, INSTALL } from "@/lib/skill";` beside the other `@/lib` imports, and add inside `describe("/llms.txt", …)`:

```ts
  it("says how to install the skill and links each example to the page it produced", () => {
    expect(text).toContain("## Skill");
    expect(text).toContain(INSTALL);
    for (const e of EXAMPLES) expect(text).toContain(`- \`${COMMAND} ${e.idea}\`: https://example.test/skill/${e.file}`);
    expect(text.indexOf("## Skill")).toBeLessThan(text.indexOf("## Links"));
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd ~/estudos/hairline/apps/site && rtk proxy pnpm exec vitest run test/docs.test.ts`
Expected: FAIL on "says how to install the skill…": the text has no `## Skill`.

Run: `cd ~/estudos/hairline/apps/site && lsof -ti:4320 | xargs kill 2>/dev/null; rtk proxy pnpm exec playwright test -g "top bar"`
Expected: FAIL: the count is 4, and there is no `Skill` link.

- [ ] **Step 3: Add the link**

In `apps/site/components/chrome.tsx`, in `Topbar`, add the `Skill` link after `Docs`, and bring the comment above it up to date:

```tsx
/** The bar on every page: the name home, the docs, the skill, the story, the version, GitHub. */
export function Topbar() {
  return (
    <header className="topbar">
      <a href="/" className="text-[15px] font-medium tracking-[-0.02em]">hairline</a>
      <nav className="flex items-center">
        <a className="topbar-link" href="/docs">Docs</a>
        <a className="topbar-link" href="/skill">Skill</a>
        <a className="topbar-link" href="/inspo">Inspo</a>
        <span className="topbar-link tabular-nums" data-version>v{pkg.version}</span>
        <a className="topbar-link" href={LINKS.github} aria-label="GitHub"><GitHub /></a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Add the section to `llms.txt`**

In `apps/site/lib/llms.ts`, add the import:

```ts
import { COMMAND, EXAMPLES, INSTALL, SUMMARY } from "./skill";
```

In the final `out.push(…)`, put these arguments directly before `"", "## Links", "",`:

```ts
    "", "## Skill", "",
    SUMMARY,
    "", fence("sh", INSTALL),
    "", `Then type \`${COMMAND} <idea>\` in the agent. Four ideas, each with the page the skill wrote for it:`,
    "", EXAMPLES.map((e) => `- \`${COMMAND} ${e.idea}\`: ${base}/skill/${e.file}`).join("\n"),
    "", `More: ${base}/skill`,
```

- [ ] **Step 5: Build and run**

Run: `cd ~/estudos/hairline && lsof -ti:4320 | xargs kill 2>/dev/null; rtk proxy pnpm typecheck && rtk proxy pnpm test && rtk proxy pnpm test:browser`
Expected: all pass, the two top-bar tests in `site.spec.ts` and the two new ones in `skill.spec.ts` included.

If "the top bar fits a 320px screen" fails, the five items are wider than the bar. Append to `globals.css`, after the `.topbar-link` rule, and run again:

```css
/* five items do not fit the narrowest phones: the version gives way first */
@media (max-width: 359px) { .topbar [data-version] { display: none; } }
```

If the home's own phone test in `site.spec.ts` ("the page fits a phone…") fails for the same reason, the same rule fixes it; do not change that test.

- [ ] **Step 6: Measure the page**

Run: `cd ~/estudos/hairline && rtk proxy pnpm --filter @hairline/site build 2>&1 | rtk proxy grep -e "skill\|docs\|First Load" ; ls -l apps/site/public/skill`
Record for the pull request: the `/skill` route's size and First Load JS next to `/docs`'s, and the four files' sizes. Expected: `/skill`'s First Load JS is no larger than `/docs`'s, and each generated page is under 40 KB.

- [ ] **Step 7: Commit**

```bash
cd ~/estudos/hairline && rtk git add apps/site/components/chrome.tsx apps/site/lib/llms.ts apps/site/test/site.spec.ts apps/site/test/docs.test.ts apps/site/test/skill.spec.ts apps/site/app/globals.css && rtk git status && rtk git commit -m "Skill page: a Skill link in the top bar, and the skill in llms.txt with each example's page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

If `globals.css` did not change in this task, leave it out of `git add`.

- [ ] **Step 8: Push and open the pull request**

```bash
cd ~/estudos/hairline && rtk git push -u origin skill-page && rtk gh pr create --base main --head skill-page --title "/skill: the skill's page, with four figures it drew beside their prompts" --body-file /Users/lucasmarques/.claude/jobs/bf2ea971/tmp/skill-page-pr.md
```

Write `skill-page-pr.md` first, in English, with: what the page is and who it is for; that the four examples are the skill's output, unaltered, and which test fails if one is touched; the sizes from Step 6; a note that the page should reach production together with the repository going public, because the install command needs it. Do not merge.

Then watch CI: `cd ~/estudos/hairline && rtk gh pr checks --watch`
Expected: `verify` and the Vercel preview pass.
