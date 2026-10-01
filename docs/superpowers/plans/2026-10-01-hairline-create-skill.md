# `hairline-create` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `skills/hairline-create/`, a skill that turns `/hairline-create <idea>` into one new Hairline figure on a self-contained HTML page, drawn on the package's own engine and held to its ten rules.

**Architecture:** The agent writes one file, the figure. A generated `kernel.js` (the package's `src/core`, bundled into one global `HL`) and a fixed `bench.html` are pasted around it by `build.mjs`; `validate.mjs` rejects a page whose kernel or bench changed or whose figure breaks a mechanical rule; `look.md` covers what text cannot check. Tests live in `packages/hairline/test` and run in the existing CI steps.

**Tech Stack:** Node 22 built-ins only inside the skill folder; esbuild 0.28.2 for the kernel generator; Vitest and Playwright (Chrome) for the tests, as the package already uses.

**Spec:** `docs/superpowers/specs/2026-10-01-hairline-create-skill-design.md`

**Execution:** Subagent-driven. Implementers run on Opus (`model: "opus"`); the controller (Fable) reviews each task and runs Tasks 6 and 7 itself.

## What this plan adds to the spec

Five things the spec did not name. Task 5 writes them into the spec so the two agree.

1. **`build.mjs`** joins the skill folder: `node build.mjs <figure.js>` writes the page. The agent never has to read or retype the kernel, and the tests assemble pages the same way an agent does.
2. **Two more validator checks:** `hit` (input only through `HL.pointer`; nothing measured on screen: rule 01) and the bench must be unchanged, not only the kernel.
3. **`setTimeout` is rejected outright**, not only in loops. A static check cannot tell a loop from a single call, and a delay belongs to a tween.
4. **Two URL parameters on the bench**, for the look: `?w=240` narrows the page, `&at=x,y` holds the pointer at a viewBox point for tools that cannot hover.
5. **Figures are pointer-only.** The bench's stage is an image (`role="img"`), so the Riffle example drops the package's keyboard handling.

## Global Constraints

- Nothing under `packages/hairline/src` is edited. No public API is added to the package.
- Files in `skills/hairline-create/` import Node built-ins only. No `package.json` there, no dependencies.
- The skill folder holds exactly: `SKILL.md`, `rules.md`, `concepts.md`, `look.md`, `kernel.js`, `bench.html`, `build.mjs`, `validate.mjs`, `examples/terrain.js`, `examples/riffle.js`.
- `kernel.js` is generated. It is never edited by hand; `node scripts/kernel.mjs` writes it.
- A figure is at most 200 lines. Both examples obey this.
- Node 22 or later. esbuild pinned at `0.28.2` (the version `packages/hairline` already has).
- Code, comments and copy are in English. Comments match the repository's density and voice: they say why, in plain sentences.
- Commits: stage files by name only; end every message with `Co-Authored-By: Claude <noreply@anthropic.com>`. Never commit `apps/site/.vitest/`, `apps/site/AGENTS.md`, `apps/site/CLAUDE.md`, `.vercel/`, `.superpowers/`, `.claude/`, `.env.local`.
- Branch: `skill-create`. Do not merge; do not push to `main`.

## Environment notes for implementers

- The repository is `~/estudos/hairline`. The shell's working directory resets after every command, so start each one with `cd ~/estudos/hairline` (or a subfolder).
- Prefix commands with `rtk`. When you need a command's raw output, use `rtk proxy <cmd>`.
- Playwright reuses a server already on port 4310, and that server reads the skill's files once, at start. Before every browser run: `lsof -ti:4310 | xargs kill 2>/dev/null; true`.
- Unit tests: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill`.
- Browser tests: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec playwright test skill.spec.ts --reporter=line`.

## Review Focus

Failure modes the spec implies but does not name. Each has a test in the task that owns the code.

1. **The skill folder is a symlink.** `npx skills add` links skills into the agent's folder. `node <link>/build.mjs` and `node <link>/validate.mjs` must still run, not exit silently. (Task 2 and Task 4: run both through a symlink.)
2. **The page is opened from disk.** The output is a `file://` page with an inline module script; it must draw there, not only over HTTP. (Task 2: Playwright opens the built file by `file://` URL.)
3. **The figure throws at mount.** The person must see what went wrong under the stage, not an empty plate. (Task 2: `/bench/throws`.)
4. **The person's system is dark and they press the theme switch.** The switch must win in both directions. (Task 2: theme test under `colorScheme: "dark"`.)
5. **The kernel or figure contains `$&`, `$1` or the page has CRLF line endings.** Assembly must paste text literally, and the validator must not call a CRLF copy of a good page changed. (Task 2: `$` test; Task 4: CRLF test.)

---

### Task 1: The kernel generator and the kernel

**Files:**
- Create: `scripts/kernel.mjs`
- Create (generated): `skills/hairline-create/kernel.js`
- Create: `packages/hairline/test/skill/kernel.test.ts`
- Modify: `package.json` (root): add the `kernel` script and the `esbuild` devDependency
- Modify: `turbo.json`: the `test` task's inputs
- Modify: `pnpm-lock.yaml` (by `pnpm install`)

**Interfaces:**
- Consumes: `packages/hairline/src/core/{iso,motion,stage,styles}.ts`, read-only.
- Produces:
  - `node scripts/kernel.mjs` writes `skills/hairline-create/kernel.js`; `node scripts/kernel.mjs --check` exits 0 when the committed file is current, 1 with a message on stderr when it is not.
  - `kernel.js` layout: line 1 is `/* hairline kernel sha256:<64 hex> */`; then the index comment; then esbuild's output, which defines `var HL`; the last line is `/* /hairline kernel */`. The hash is the SHA-256 of everything after line 1, including the final newline.
  - `HL` has exactly these 44 keys: `clamp lerp rad r2 poly seg open Cam proj unproj fit rrect circ hull ringAt facing run prism rings extremes fillet ghost setReducedMotion reducedMotion spring stepS bezier EASE_LIFT tween tval tset tdone mk solid put flatDot place fade reflect register pointer disposer css inject`.

- [ ] **Step 1: Add esbuild to the root, the `kernel` script, and the turbo inputs**

In the root `package.json`, add to `scripts`:

```json
"kernel": "node scripts/kernel.mjs"
```

and to `devDependencies`:

```json
"esbuild": "0.28.2"
```

In `turbo.json`, replace the `test` task with:

```json
"test": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/skills/**", "$TURBO_ROOT$/scripts/kernel.mjs"]
}
```

The skill's files sit outside every package, so without these inputs turbo would replay a cached test run after the skill changed.

Run: `cd ~/estudos/hairline && rtk pnpm install`
Expected: the lockfile gains a root `esbuild 0.28.2` entry and nothing else changes version.

- [ ] **Step 2: Write the failing test**

Create `packages/hairline/test/skill/kernel.test.ts`:

```ts
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** The skill's kernel: generated from src/core, committed, and held current here. */
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const text = () => readFileSync(ROOT + "skills/hairline-create/kernel.js", "utf8");

it("the committed kernel is what src/core gives now", () => {
  const run = spawnSync("node", ["scripts/kernel.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
});

it("its first line carries the hash of everything after it", () => {
  const src = text(), cut = src.indexOf("\n");
  const hash = /^\/\* hairline kernel sha256:([0-9a-f]{64}) \*\/$/.exec(src.slice(0, cut))?.[1];
  expect(hash).toBe(createHash("sha256").update(src.slice(cut + 1)).digest("hex"));
  expect(src.endsWith("/* /hairline kernel */\n")).toBe(true);
});

it("defines one global, HL, holding what its index lists and nothing else", () => {
  const src = text();
  const HL = new Function(`${src}\nreturn HL;`)() as Record<string, unknown>;
  const indexed = [...src.slice(0, src.indexOf("var HL")).matchAll(/^ \* {3}(\w+)/gm)].map((m) => m[1]);
  expect(indexed.slice().sort()).toEqual(Object.keys(HL).sort());
  expect(Object.keys(HL)).toHaveLength(44);
  expect(typeof HL.register).toBe("function");
  expect(typeof HL.EASE_LIFT).toBe("function");
});

it("can sit inside a script element, and is left readable", () => {
  const src = text();
  expect(src).not.toMatch(/<\/script/i);
  expect(src.split("\n").length).toBeGreaterThan(300);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/kernel.test.ts`
Expected: FAIL. The first test fails on a non-empty stderr (`Cannot find module … scripts/kernel.mjs`); the others fail with `ENOENT … kernel.js`.

- [ ] **Step 4: Write the generator**

Create `scripts/kernel.mjs`:

```js
/**
 * The skill's kernel: packages/hairline/src/core as one plain script that
 * defines a single global, HL. `node scripts/kernel.mjs` writes
 * skills/hairline-create/kernel.js; with `--check` it writes nothing and exits
 * 1 when the committed file is not what the source gives now.
 *
 * The output is not minified: an agent reads the index at its top, and a
 * person can read the rest. Its first line carries the hash of everything
 * after it, which is how the skill's validator knows a kernel was not edited.
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "skills/hairline-create/kernel.js");
const FILES = ["iso", "motion", "stage", "styles"];

/* One name per line, three spaces in: test/skill/kernel.test.ts holds this list to HL's keys. */
const INDEX = `/*
 * HL: everything a figure may call. Read this index; the code under it is the
 * package's src/core, unchanged, and a figure should not need to read it.
 *
 * Every figure is drawn in a 400 × 320 viewBox. World space is x/y on the
 * ground and z up. Plates are filled with the ground colour and painted back
 * to front, so a nearer one covers a farther one: append in that order.
 *
 * Camera
 *   Cam(azDeg, k, S)                       a camera: azimuth in degrees, k = sin(elevation) (0.5 is the 2:1 view), S = scale
 *   fit(C, points, cx, cy)                 centres the box of [x, y, z] points on (cx, cy); call it once, before proj
 *   proj(C)                                returns P(x, y, z), which gives [sx, sy]
 *   unproj(C, sx, sy, z)                   the world [x, y] under a screen point, on the plane at height z
 *   facing(C)                              returns front(sample): whether a ring sample faces the camera
 * Rounded solids
 *   rrect(u0, v0, u1, v1, r, n)            a rounded rectangle, as a ring of samples {u, v, nu, nv}
 *   circ(R, n)                             a circle, as a ring
 *   rings(x0, y0, x1, y1, r, b)            [ring, inner]: a rounded footprint and its crease ring, inset by b
 *   prism(P, front, ring, inner, z0, z1)   {sil, crease}: a solid standing from z0 to z1, as two path strings
 *   ringAt(P, ring, z)                     the ring's points, projected at height z
 *   run(ring, keep)                        the one cyclic run of samples that pass keep
 *   hull(points)                           the convex hull of screen points
 *   extremes(P, ring)                      [left, right, nearest] samples: where dashed drops fall from
 *   fillet(points, radii, n)               rounds every vertex of a closed polygon
 *   ghost(P, front, ring, z0, depth)       a reflection's path {d, y0, y1}; reflect() draws it for you
 * Paths and numbers
 *   poly(points)                           a closed path string
 *   open(points)                           an open polyline string
 *   seg(a, b)                              one segment, as its own subpath
 *   clamp(v, a, b)
 *   lerp(a, b, t)
 *   rad(deg)
 *   r2(n)                                  two decimals
 * The continuous clock: one spring per moving number
 *   spring(x, opts)                        at rest on x; write .t to retarget; opts {k, c, m, eps}, default k 100, c 18, m 1
 *   stepS(sp, dt)                          advances by dt seconds; returns whether it is still moving
 * The discrete clock: a 700ms tween on (.32, .72, 0, 1)
 *   tween(v, dur)                          at rest on v
 *   tset(tw, to, now, delay)               retargets from where it is, after delay ms: the stagger
 *   tval(tw, now)                          its value at now
 *   tdone(tw, now)                         whether it has landed
 *   bezier(x1, y1, x2, y2)                 a CSS cubic-bezier, as a function of progress
 *   EASE_LIFT                              the lift curve itself
 *   reducedMotion()                        true when the reader asked for less motion; springs and tweens already land at once
 *   setReducedMotion(on)                   the loop's business, not a figure's
 * Drawing
 *   mk(tag, attrs, parent)                 one svg element: the only way a figure makes a node
 *   solid(parent)                          {g, sil, cr}: a group holding a silhouette path and a crease path
 *   put(solid, paths)                      writes prism()'s paths into solid()'s elements
 *   flatDot(parent, C, r, cls)             a dot lying on the ground plane; cls is "dot", "dot m" or "dot off"
 *   place(el, point)                       moves a dot or a circle to [sx, sy]
 *   reflect(svg, parent, P, front, ring, z0, depth)   a fading mirror under a solid
 *   fade(svg, y0, y1, a0)                  a vertical fade, as a mask; returns the value for a mask attribute
 * Life
 *   register(stage, tick)                  joins the one frame loop; tick(dt in seconds, now in ms) returns true to ask for another frame; gives {wake, unregister}
 *   pointer(stage, handlers)               {move(point), down(point), leave()}, points in viewBox units; returns its disposer
 *   disposer()                             {add, on, dispose}: collects tear-down, so destroy is bag.dispose
 * The bench's business, not a figure's
 *   css(lightDark)
 *   inject(root)
 *
 * Classes, on path, polygon, ellipse and line. They are the whole palette; a
 * figure sets no colour, width or fill of its own.
 *     (none)   filled with the ground colour, medium stroke
 *     sil      the silhouette's stroke        hi    the bright stroke: the only highlight
 *     lo       the dim stroke                 nf    no fill        fo   fill only, no stroke
 *     dash     a dashed guide
 *     dot      a bright dot                   dot m   a medium dot     dot off   a dim dot
 */`;

/** The kernel's text, from the source as it is now. */
export async function kernel() {
  const result = await build({
    stdin: {
      contents: FILES.map((f) => `export * from "./${f}";`).join("\n"),
      resolveDir: join(ROOT, "packages/hairline/src/core"),
      sourcefile: "kernel.ts",
      loader: "ts",
    },
    // esbuild names each source file in a comment, relative to this: the same on every machine
    absWorkingDir: ROOT,
    bundle: true,
    format: "iife",
    globalName: "HL",
    target: "es2020",
    charset: "utf8",
    legalComments: "none",
    write: false,
  });
  const body = `${INDEX}\n${result.outputFiles[0].text.trimEnd()}\n/* /hairline kernel */\n`;
  return `/* hairline kernel sha256:${createHash("sha256").update(body).digest("hex")} */\n${body}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await kernel();
  if (process.argv.includes("--check")) {
    let have = "";
    try { have = readFileSync(OUT, "utf8"); } catch { /* not generated yet: stale */ }
    if (have !== text) {
      console.error("skills/hairline-create/kernel.js is stale: run `pnpm kernel` and commit the result.");
      process.exit(1);
    }
    console.log("kernel is current");
  } else {
    writeFileSync(OUT, text);
    console.log(`wrote skills/hairline-create/kernel.js: ${text.split("\n").length} lines, ${Buffer.byteLength(text)} bytes`);
  }
}
```

- [ ] **Step 5: Generate the kernel**

Run: `cd ~/estudos/hairline && mkdir -p skills/hairline-create && rtk proxy node scripts/kernel.mjs`
Expected: `wrote skills/hairline-create/kernel.js: <N> lines, <B> bytes`, with N over 300. Write N and B into your report; the controller needs them for the trial.

- [ ] **Step 6: Run the test to see it pass**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/kernel.test.ts`
Expected: PASS, 4 tests.

If the index test fails with a difference between the two lists, the index in `scripts/kernel.mjs` is wrong, not the test: add or remove the named line, regenerate, run again.

- [ ] **Step 7: Run the whole suite and the typecheck**

Run: `cd ~/estudos/hairline && rtk proxy pnpm typecheck && rtk proxy pnpm test`
Expected: both pass, with no new warnings.

- [ ] **Step 8: Commit**

```bash
cd ~/estudos/hairline && rtk git add package.json pnpm-lock.yaml turbo.json scripts/kernel.mjs skills/hairline-create/kernel.js packages/hairline/test/skill/kernel.test.ts && rtk git commit -m "Skill: the kernel, src/core as one script with a single global, generated and held current by a test

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: The bench, the build script and the Terrain example

**Files:**
- Create: `skills/hairline-create/bench.html`
- Create: `skills/hairline-create/build.mjs`
- Create: `skills/hairline-create/examples/terrain.js`
- Create: `packages/hairline/test/skill/build.test.ts`
- Create: `packages/hairline/test/browser/skill.spec.ts`
- Modify: `packages/hairline/test/browser/serve.mjs` (routes for the bench)

**Interfaces:**
- Consumes: `skills/hairline-create/kernel.js` and the global `HL` (Task 1).
- Produces:
  - **The figure format.** A figure file is the body of an inline module script. It takes what it needs from `HL`, defines `mount({ stage, svg, read }, value)` returning `{ set(value), destroy() }`, and ends with `hairline({ name, means, rules, range, mount });`. `name` is a lowercase string, `means` one sentence, `rules` an array of rule numbers 1–10, `range` three numbers (the figure's value at intensity 0, 0.5 and 1).
  - **`bench.html`** with two slots, `/*KERNEL*/` inside `<script id="hl-kernel">` and `/*FIGURE*/` inside `<script type="module" id="hl-figure">`. Element ids: `stage`, `name`, `read`, `intensity`, `value`, `theme`, `means`, `rules`, `error`. It defines `window.hairline(figure)` and, after mount, `window.hairline.figure` (the handle). URL parameters `w` (page width in px) and `at` (`x,y` in viewBox units: holds the pointer there).
  - **`build.mjs`**: `export function assemble(figure: string): string` (the page), `export function nameOf(figure: string): string | null`, and the CLI `node build.mjs <figure.js> [out.html]`, which writes the page (default `hairline-<name>.html` in the working directory), prints its absolute path and exits 0; with no argument it prints usage on stderr and exits 2.
  - **Server routes** on `http://localhost:4310`: `/bench/terrain`, `/bench/throws`.

- [ ] **Step 1: Write the failing unit test for the build script**

Create `packages/hairline/test/skill/build.test.ts`:

```ts
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** build.mjs puts a figure on the bench: the page is the bench, the kernel and the figure, and nothing else. */
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "hl-build-"));
const terrain = readFileSync(SKILL + "examples/terrain.js", "utf8");
const node = (args: string[], cwd = dir) => spawnSync("node", args, { cwd, encoding: "utf8" });

it("writes the bench with the kernel and the figure in their slots", () => {
  const out = join(dir, "page.html");
  const run = node([SKILL + "build.mjs", SKILL + "examples/terrain.js", out]);
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
  expect(run.stdout.trim()).toBe(out);
  const page = readFileSync(out, "utf8");
  expect(page).toContain(readFileSync(SKILL + "kernel.js", "utf8").trimEnd());
  expect(page).toContain(terrain.trim());
  expect(page).not.toContain("/*KERNEL*/");
  expect(page).not.toContain("/*FIGURE*/");
});

it("names the page after the figure when no path is given", () => {
  const run = node([SKILL + "build.mjs", SKILL + "examples/terrain.js"]);
  expect(run.status).toBe(0);
  expect(run.stdout.trim().endsWith("hairline-terrain.html")).toBe(true);
  expect(readFileSync(run.stdout.trim(), "utf8")).toContain("<title>");
});

it("pastes text literally, so a figure may hold $& and $1", () => {
  const src = join(dir, "dollar.js"), out = join(dir, "dollar.html");
  const figure = terrain.replace("hairline({", () => 'const odd = "$& and $1 and $$";\nhairline({');
  writeFileSync(src, figure);
  expect(node([SKILL + "build.mjs", src, out]).status).toBe(0);
  expect(readFileSync(out, "utf8")).toContain('const odd = "$& and $1 and $$";');
});

it("runs when the skill folder is reached through a symlink", () => {
  const link = join(dir, "linked");
  symlinkSync(SKILL, link);
  const out = join(dir, "linked.html");
  const run = node([join(link, "build.mjs"), join(link, "examples/terrain.js"), out]);
  expect(run.status).toBe(0);
  expect(run.stdout.trim()).toBe(out);
});

it("says how to call it when it is given nothing", () => {
  const run = node([SKILL + "build.mjs"]);
  expect(run.status).toBe(2);
  expect(run.stderr).toContain("usage: node build.mjs <figure.js> [out.html]");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/build.test.ts`
Expected: FAIL at collection with `ENOENT … examples/terrain.js`.

- [ ] **Step 3: Write the Terrain example**

Create `skills/hairline-create/examples/terrain.js`. It is `packages/hairline/src/figures/terrain.ts` with the types taken out, the imports replaced by one destructuring of `HL`, and the declaration at the end. The arithmetic and the order in which nodes are made must not change: a later step compares its drawing with the package's, character for character.

```js
/**
 * Terrain: a field of 81 pillars on a rounded plinth. The pointer is projected
 * back onto the ground, and each pillar takes its height from its distance to
 * it, on its own spring. At rest the field is a dune with two rises. A 3 × 3
 * dot mark rides the lid of the pillar under the pointer, or the peak at rest;
 * pillars above half height take the bright stroke. The slider is the radius,
 * in cells.
 *
 * The pattern: a continuous field. Springs, a falloff by distance, a hit test
 * on the ground plane (which never moves), and a rest that is a composition.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 9, CELL = 14, FOOT = 11, HMAX = 58, EXT = N * CELL, PB = 5;

/** The share of full height at u radii from the pointer: 1 → .31 at 42% → .09 at the edge and beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.58);
  fit(C, [[-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB], [0, 0, HMAX * 0.75]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value * CELL, over = null;

  const g = mk("g", {}, svg), cols = [];
  const [pr, pi] = rings(-6, -6, EXT + 6, EXT + 6, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  // Diagonal by diagonal from the back corner, so appending is painting back to front.
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i;
    if (j < 0 || j >= N) continue;
    const u = i / (N - 1), v = j / (N - 1);
    const h0 = 4 + 25 * Math.exp(-((u - 0.22) ** 2 + (v - 0.74) ** 2) / 0.07) + 12 * Math.exp(-((u - 0.8) ** 2 + (v - 0.26) ** 2) / 0.035);
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 2.6, 0.9);
    cols.push({ i, j, h0, ring, inner, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN });
  }

  // The mark: a 3 × 3 of dots riding the lid of one pillar, moved in the paint
  // order to just after it, so the pillars in front still cover it.
  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 9; k++) md.push(flatDot(mark, C, 0.55, k === 4 ? "dot" : "dot m"));
  const peak = cols.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  const byCell = new Map();
  cols.forEach((c) => byCell.set(c.i + "," + c.j, c));
  let mc = null, want = peak;

  function drawMark() {
    if (want !== mc) { mc = want; mc.el.g.after(mark); }
    const cx = (mc.i + 0.5) * CELL, cy = (mc.j + 0.5) * CELL, h = Math.max(0.6, mc.sp.x);
    md.forEach((el, k) => place(el, P(cx + ((k % 3) - 1) * 2.5, cy + (Math.floor(k / 3) - 1) * 2.5, h)));
  }
  // A pillar whose spring hasn't moved keeps its paths: most of the 81 are still on most frames.
  function drawCol(c) {
    const h = Math.max(0.6, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    put(c.el, prism(P, front, c.ring, c.inner, 0, h));
    c.el.sil.classList.toggle("hi", h > HMAX * 0.5);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cols) { if (stepS(c.sp, dt)) m = true; drawCol(c); }
    drawMark();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    for (const c of cols) {
      if (!over) { c.sp.t = c.h0; continue; }
      const dx = (c.i + 0.5) * CELL - over[0], dy = (c.j + 0.5) * CELL - over[1];
      c.sp.t = HMAX * falloff(Math.hypot(dx, dy) / R);
    }
    if (over) {
      const i = clamp(Math.floor(over[0] / CELL), 0, N - 1), j = clamp(Math.floor(over[1] / CELL), 0, N - 1);
      want = byCell.get(i + "," + j);
      read.textContent = `cell ${i}·${j}`;
    } else { want = peak; read.textContent = "rest"; }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v * CELL; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "terrain",
  means: "A field of pillars rises under the pointer and falls off with distance.",
  rules: [1, 3, 5, 9],
  range: [1.5, 3, 5],
  mount,
});
```

- [ ] **Step 4: Write the bench**

Create `skills/hairline-create/bench.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hairline figure</title>
<style>
  :root { color-scheme: light; --ground: #ffffff; --ink: #232327; --muted: #6f6f78; --line: #e0e0e4; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { color-scheme: dark; --ground: #08090a; --ink: #d0d6e0; --muted: #8a8c95; --line: #29292d; }
  }
  :root[data-theme="dark"] { color-scheme: dark; --ground: #08090a; --ink: #d0d6e0; --muted: #8a8c95; --line: #29292d; }
  :root[data-theme="light"] { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
    background: var(--ground); color: var(--ink);
    font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased;
  }
  main { width: 100%; max-width: 640px; }
  .plate { position: relative; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .tag, .label, output, button { font: 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.02em; }
  .tag { position: absolute; top: 12px; z-index: 1; color: var(--muted); pointer-events: none; }
  #name { left: 14px; }
  #read { right: 14px; color: var(--ink); font-variant-numeric: tabular-nums; }
  .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 14px; }
  .label { color: var(--muted); }
  input[type="range"] {
    flex: 1 1 96px; min-width: 0; height: 32px; margin: 0; background: transparent; cursor: pointer;
    -webkit-appearance: none; appearance: none;
  }
  input[type="range"]::-webkit-slider-runnable-track { height: 1px; background: var(--muted); }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 13px; height: 13px; margin-top: -6px; border-radius: 50%;
    border: 1px solid var(--ink); background: var(--ground);
  }
  input[type="range"]::-moz-range-track { height: 1px; background: var(--muted); }
  input[type="range"]::-moz-range-thumb { width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--ink); background: var(--ground); }
  input[type="range"]:focus-visible, button:focus-visible { outline: 1.5px solid var(--ink); outline-offset: 2px; }
  output { min-width: 4ch; text-align: right; font-variant-numeric: tabular-nums; }
  button {
    height: 32px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px;
    background: transparent; color: var(--ink); cursor: pointer;
  }
  #means { margin: 14px 0 0; text-wrap: pretty; }
  #rules { margin: 6px 0 0; line-height: 1.6; }
  #error { margin: 12px 0 0; padding-left: 10px; border-left: 1px solid var(--ink); }
</style>
</head>
<body>
<main>
  <div class="plate">
    <span class="tag" id="name"></span>
    <span class="tag" id="read"></span>
    <div id="stage"></div>
  </div>
  <div class="controls">
    <label class="label" for="intensity">intensity</label>
    <input id="intensity" type="range" min="0" max="1" step="0.01" value="0.5">
    <output id="value" for="intensity"></output>
    <span class="label">theme</span>
    <button id="theme" type="button" aria-label="Switch between the light and the dark theme"></button>
  </div>
  <p id="means"></p>
  <p id="rules" class="label"></p>
  <p id="error" role="alert" hidden></p>
</main>
<script id="hl-kernel">/*KERNEL*/</script>
<script id="hl-bench">
/*
 * The bench: the page a figure is shown on. It makes the host and the svg the
 * way the package's mount does, hands them to the figure, and owns everything
 * around it: the read-out, the slider, the theme, the line under the stage.
 */
(() => {
  const RULES = ["hit", "order", "reach", "accent", "rest", "honesty", "cost", "clock", "radius", "quiet"];
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement, params = new URLSearchParams(location.search);

  /* the theme: the system's until the switch is pressed, then the switch's */
  const dark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  const label = () => { $("theme").textContent = dark() ? "dark" : "light"; };
  $("theme").addEventListener("click", () => { root.dataset.theme = dark() ? "light" : "dark"; label(); });
  label();

  /* ?w=240 narrows the page, for a look at the size of a thumbnail */
  const w = Number(params.get("w"));
  if (w > 0) document.querySelector("main").style.maxWidth = w + "px";

  /* a figure that fails says so under the stage, instead of leaving an empty plate */
  addEventListener("error", (e) => {
    $("error").hidden = false;
    $("error").textContent = String((e.error && e.error.message) || e.message);
  });

  let mounted = false;
  window.hairline = (figure) => {
    if (mounted) throw new Error("hairline: one figure per page.");
    mounted = true;
    const stage = $("stage"), slider = $("intensity");

    /* intensity to the figure's own number: two straight lines that meet at 0.5, as in the package */
    const [lo, mid, hi] = figure.range;
    const at = (i) => Math.round((i <= 0.5 ? lo + (i / 0.5) * (mid - lo) : mid + ((i - 0.5) / 0.5) * (hi - mid)) * 1000) / 1000;

    HL.inject(document);
    stage.setAttribute("data-hairline", figure.name);
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", figure.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);

    let text = null;
    const read = {
      get textContent() { return text; },
      set textContent(value) { text = value == null ? "" : String(value); $("read").textContent = text; },
    };

    document.title = "Hairline · " + figure.name;
    $("name").textContent = figure.name;
    $("means").textContent = figure.means;
    $("rules").textContent = figure.rules.map((n) => String(n).padStart(2, "0") + " " + RULES[n - 1]).join(" · ");
    const show = () => { $("value").textContent = String(at(Number(slider.value))); };
    show();

    const handle = figure.mount({ stage, svg, read }, at(0.5));
    if (text === null) read.textContent = "rest";
    slider.addEventListener("input", () => { show(); handle.set(at(Number(slider.value))); });
    window.hairline.figure = handle;

    /* ?at=200,160 holds the pointer at a viewBox point, for a picture of the answer without a mouse */
    const p = (params.get("at") || "").split(",").map(Number);
    if (p.length === 2 && p.every(Number.isFinite)) {
      const r = stage.getBoundingClientRect();
      stage.dispatchEvent(new PointerEvent("pointermove", {
        pointerType: "mouse", pointerId: 1, bubbles: true,
        clientX: r.left + (p[0] / 400) * r.width, clientY: r.top + (p[1] / 320) * r.height,
      }));
    }
  };
})();
</script>
<script type="module" id="hl-figure">/*FIGURE*/</script>
</body>
</html>
```

- [ ] **Step 5: Write the build script**

Create `skills/hairline-create/build.mjs`:

```js
#!/usr/bin/env node
/**
 * Puts a figure on the bench: `node build.mjs <figure.js> [out.html]` writes
 * one self-contained page, bench.html with kernel.js and the figure in its two
 * slots and nothing else changed, and prints where it is. Without a path the
 * page is hairline-<name>.html in the working directory.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

/** The page for a figure's source. The replacements are functions so `$&` in the kernel or the figure is pasted as it is. */
export function assemble(figure) {
  const kernel = readFileSync(here("./kernel.js"), "utf8").replace(/\r\n/g, "\n").trimEnd();
  return readFileSync(here("./bench.html"), "utf8").replace(/\r\n/g, "\n")
    .replace("/*KERNEL*/", () => `\n${kernel}\n`)
    .replace("/*FIGURE*/", () => `\n${figure.replace(/\r\n/g, "\n").trim()}\n`);
}

/** The figure's name, read from its declaration. */
export const nameOf = (figure) => /\bname:\s*["'`]([a-z][a-z0-9-]*)["'`]/.exec(figure)?.[1] ?? null;

/* The skill is often installed as a symlink, so the path Node was given is resolved before it is compared. */
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(here("./build.mjs"))) {
  const [src, out] = process.argv.slice(2);
  if (!src) {
    console.error("usage: node build.mjs <figure.js> [out.html]");
    process.exit(2);
  }
  const figure = readFileSync(src, "utf8");
  const file = resolve(out ?? `hairline-${nameOf(figure) ?? "figure"}.html`);
  writeFileSync(file, assemble(figure));
  console.log(file);
}
```

- [ ] **Step 6: Run the unit test to see it pass**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/build.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Serve the bench to the browser tests**

In `packages/hairline/test/browser/serve.mjs`, add the import under the existing ones:

```js
import { assemble } from "../../../../skills/hairline-create/build.mjs";
```

add, above `const routes`:

```js
/* The skill's bench (skills/hairline-create), with a figure on it: what its agent hands over. */
const example = (name) => assemble(readFileSync(here(`../../../../skills/hairline-create/examples/${name}.js`), "utf8"));
const THROWS = `hairline({ name: "throws", means: "A figure that fails at mount.", rules: [5], range: [0, 1, 2], mount() { throw new Error("no drawing today"); } });`;
```

and add to the `routes` object:

```js
  "/bench/terrain": ["text/html", example("terrain")],
  "/bench/throws": ["text/html", assemble(THROWS)],
```

Update the file's opening comment to say it also serves the skill's bench.

- [ ] **Step 8: Write the failing browser tests**

Create `packages/hairline/test/browser/skill.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { play } from "../parity/driver.mjs";
import { INTENSITY, SCRIPTS } from "../parity/scripts.mjs";

/**
 * The skill's bench (skills/hairline-create) with its examples on it: the page
 * an agent hands over. It answers the pointer, its controls reach the figure,
 * and it draws what the package draws, so the extracted kernel is the engine.
 */
const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const clock = file("../parity/clock.js") + "\nwindow.__freeze(1000);";

type Step = Record<string, unknown>;
type Checkpoint = { at: string; read: string; svg: string };
/** Each example: a viewBox point that is on the figure, what the slider shows at its two ends, and how much of the package's script it can play. */
const EXAMPLES = {
  terrain: { at: [200, 160], ends: ["1.5", "5"], steps: (SCRIPTS as Record<string, Step[]>).terrain },
} as Record<string, { at: [number, number]; ends: [string, string]; steps: Step[] }>;

const svg = (page: Page) => page.locator("#stage > svg").evaluate((el) => el.innerHTML);
const read = (page: Page) => page.locator("#read").innerText();
const setIntensity = (page: Page, value: number) => page.locator("#intensity").evaluate((el, value) => {
  (el as HTMLInputElement).value = String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, value);
/** Everything the page complains about. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  return problems;
}
/* a figure sleeps until its IntersectionObserver reports it on screen, and that report comes on the browser's own time */
const settle = (page: Page) => page.evaluate(() => new Promise((done) => window.__realTimeout(done, 500)));

for (const [id, ex] of Object.entries(EXAMPLES)) {
  test(`${id} answers the pointer and comes back to rest, with nothing on the console`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(`/bench/${id}`);
    const stage = page.locator("#stage");
    await expect(stage.locator("svg > *").first()).toBeAttached();
    await expect(page.locator("#read")).toHaveText("rest");
    await expect(page.locator("#name")).toHaveText(id);
    await expect(page.locator("#means")).not.toBeEmpty();
    await expect(page.locator("#rules")).toHaveText(/^\d\d [a-z]+( · \d\d [a-z]+)*$/);
    const box = (await stage.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(5 / 4, 2);
    const rest = await svg(page);

    await page.mouse.move(box.x + (ex.at[0] / 400) * box.width, box.y + (ex.at[1] / 320) * box.height, { steps: 4 });
    await expect(page.locator("#read")).not.toHaveText("rest");
    await expect.poll(() => svg(page)).not.toBe(rest);

    await page.mouse.move(2, 2);
    await expect(page.locator("#read")).toHaveText("rest");
    await expect.poll(() => svg(page), { timeout: 8000 }).toBe(rest);
    expect(problems).toEqual([]);
  });

  test(`${id}: the slider reaches the figure`, async ({ context, page }) => {
    await context.addInitScript(clock);
    const drawn = async (value: number) => {
      await page.goto(`/bench/${id}`);
      await page.locator("#stage svg > *").first().waitFor();
      await settle(page);
      const [cp] = await play(page, {
        stage: page.locator("#stage"),
        snap: async () => ({ svg: await svg(page), read: await read(page) }),
        set: () => setIntensity(page, value),
      }, [{ set: true }, { move: ex.at }, { adv: 12 }, { cp: "answering" }]) as Checkpoint[];
      return { svg: cp.svg, value: await page.locator("#value").innerText() };
    };
    const low = await drawn(0), high = await drawn(1);
    expect([low.value, high.value]).toEqual(ex.ends);
    expect(low.svg).not.toBe(high.svg);
  });

  test(`${id} on the bench draws what the package draws`, async ({ context, page }) => {
    const golden = (JSON.parse(file(`../parity/golden/${id}.json`)) as { checkpoints: Checkpoint[] }).checkpoints;
    /* the goldens hold Riffle's hidden hit bands and the names the site gives its cards; neither is drawn or said here */
    const strip = (s: string) => s.replace(/<g class="bands">.*?<\/g>/, "");
    const unname = (s: string) => s.replace(/ · .*$/, "");
    await context.addInitScript(clock);
    await page.goto(`/bench/${id}`);
    const stage = page.locator("#stage");
    await stage.locator("svg > *").first().waitFor();
    await settle(page);

    const got = await play(page, {
      stage,
      snap: async () => ({ svg: await svg(page), read: await read(page) }),
      set: () => setIntensity(page, (INTENSITY as Record<string, number>)[id]),
    }, ex.steps) as Checkpoint[];

    expect(got.length).toBeGreaterThanOrEqual(4);
    for (const [i, have] of got.entries()) {
      expect(have.at).toBe(golden[i].at);
      expect(have.read, `caption at "${have.at}"`).toBe(unname(golden[i].read));
      expect(strip(have.svg), `drawing at "${have.at}"`).toBe(strip(golden[i].svg));
    }
  });
}

test("the theme switch changes the palette, and wins over the system's theme both ways", async ({ page }) => {
  const stroke = () => page.locator("#stage path.sil").first().evaluate((el) => getComputedStyle(el).stroke);
  await page.goto("/bench/terrain");
  await expect.poll(stroke).toBe("rgb(164, 164, 172)");
  await expect(page.locator("#theme")).toHaveText("light");
  await page.locator("#theme").click();
  await expect.poll(stroke).toBe("rgb(91, 93, 100)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 9, 10)");
  await expect(page.locator("#theme")).toHaveText("dark");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect.poll(stroke).toBe("rgb(91, 93, 100)");
  await page.locator("#theme").click();
  await expect.poll(stroke).toBe("rgb(164, 164, 172)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("the page fits a 240px screen without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 700 });
  await page.goto("/bench/terrain");
  await expect(page.locator("#stage svg > *").first()).toBeAttached();
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
  expect((await page.locator("#stage").boundingBox())!.width).toBeGreaterThan(180);
});

test("destroy leaves the svg empty", async ({ page }) => {
  await page.goto("/bench/terrain");
  await expect(page.locator("#stage svg > *").first()).toBeAttached();
  await page.evaluate(() => (window as unknown as { hairline: { figure: { destroy(): void } } }).hairline.figure.destroy());
  expect(await page.locator("#stage > svg").evaluate((el) => el.childElementCount)).toBe(0);
});

test("a figure that throws says so under the stage", async ({ page }) => {
  await page.goto("/bench/throws");
  await expect(page.locator("#error")).toBeVisible();
  await expect(page.locator("#error")).toContainText("no drawing today");
});

test("the built file draws when opened from disk, narrowed and with the pointer held by its URL", async ({ page }) => {
  const problems = watch(page);
  const out = join(mkdtempSync(join(tmpdir(), "hl-page-")), "hairline-terrain.html");
  execFileSync("node", [SKILL + "build.mjs", SKILL + "examples/terrain.js", out]);
  await page.goto(pathToFileURL(out).href + "?w=240&at=200,160");
  await expect(page.locator("#stage svg > *").first()).toBeAttached();
  await expect(page.locator("#read")).toHaveText(/^cell \d·\d$/);
  expect((await page.locator("#stage").boundingBox())!.width).toBeLessThanOrEqual(240);
  await expect(page).toHaveTitle("Hairline · terrain");
  expect(problems).toEqual([]);
});
```

- [ ] **Step 9: Run the browser tests**

Run: `lsof -ti:4310 | xargs kill 2>/dev/null; cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec playwright test skill.spec.ts --reporter=line`
Expected: PASS, 8 tests.

To see them fail first, as TDD asks, run them once before Step 7's routes exist (every `/bench/…` test fails on a 404) and say in your report that you did.

If "draws what the package draws" fails, the example is wrong, not the test: diff `examples/terrain.js` against `packages/hairline/src/figures/terrain.ts`. Do not touch the kernel, the goldens or `src`.

- [ ] **Step 10: Run every suite**

Run: `lsof -ti:4310 | xargs kill 2>/dev/null; cd ~/estudos/hairline && rtk proxy pnpm typecheck && rtk proxy pnpm test && rtk proxy pnpm test:browser`
Expected: all pass. The package's own browser tests (figures, parity, theme) still pass: `serve.mjs` only gained routes.

- [ ] **Step 11: Commit**

```bash
cd ~/estudos/hairline && rtk git add skills/hairline-create/bench.html skills/hairline-create/build.mjs skills/hairline-create/examples/terrain.js packages/hairline/test/skill/build.test.ts packages/hairline/test/browser/skill.spec.ts packages/hairline/test/browser/serve.mjs && rtk git commit -m "Skill: the bench and its build script, with Terrain on it drawing what the package draws

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: The Riffle example

**Files:**
- Create: `skills/hairline-create/examples/riffle.js`
- Modify: `packages/hairline/test/browser/serve.mjs` (one route)
- Modify: `packages/hairline/test/browser/skill.spec.ts` (one entry in `EXAMPLES`)

**Interfaces:**
- Consumes: the figure format, `assemble`, the `/bench/<name>` route pattern and the `EXAMPLES` table (Task 2).
- Produces: `/bench/riffle`; `examples/riffle.js`, at most 200 lines, pointer-only.

- [ ] **Step 1: Add Riffle to the browser tests**

In `packages/hairline/test/browser/skill.spec.ts`, add to `EXAMPLES`, after the `terrain` entry:

```ts
  /* Riffle on the bench has no keyboard, so its script stops where the package's reaches for it */
  riffle: {
    at: [150, 120], ends: ["0", "90"],
    steps: (SCRIPTS as Record<string, Step[]>).riffle.slice(0, (SCRIPTS as Record<string, Step[]>).riffle.findIndex((s) => "focus" in s)),
  },
```

In `packages/hairline/test/browser/serve.mjs`, add to `routes`:

```js
  "/bench/riffle": ["text/html", example("riffle")],
```

- [ ] **Step 2: Run to see it fail**

Run: `lsof -ti:4310 | xargs kill 2>/dev/null; cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec playwright test skill.spec.ts --reporter=line`
Expected: the server fails to start with `ENOENT … examples/riffle.js`, so no test runs.

- [ ] **Step 3: Write the example**

Create `skills/hairline-create/examples/riffle.js`. It is `packages/hairline/src/figures/riffle.ts` and `riffle-geometry.ts` in one file, without types and without the keyboard. The arithmetic, and the order and attribute order in which nodes are made, must not change.

```js
/**
 * Riffle: a rounded tray holding eight cards. The card under the pointer
 * stands up and lifts; the ones in front lean forward and the ones behind lean
 * back, staggered outwards from it on the 700ms lift curve. Each card's number
 * is punched on its tab in a 4 × 2 grid, and goes to the read-out when the
 * card is pulled. The slider is the stagger, in ms.
 *
 * The pattern: discrete items. Tweens, a stagger by distance, identity carried
 * by geometry, and a hit test on static bands along the resting top edges, so
 * a card moving out from under the pointer cannot flip the choice.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register,
} = HL;

const N = 8, W = 84, H = 54, G = 13, TW = 22, TH = 7, TABS = [6, 31, 56], TK = 1.4;
const REST = -12, BACK = -24, FWD = 20, LIFT = 16;
const X0 = -5, X1 = W + 5, Y0 = -9, Y1 = (N - 1) * G + 9, WH = 20, WR = 6, WT = 2.4;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The tray, which never moves: `far` is painted before the cards, `near` after them; each entry is [d, class]. */
function tray(P, front, outer, inner) {
  // far half: body, the rim's inner edge, and the floor seam along the far walls
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), "nf lo"],
  ];
  // near half: one opaque piece from the rim's inner edge down to the floor
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  // a finger pull, set into the front
  const hx = (X0 + X1) / 2, onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    [poly(onFront(rrect(hx - 11, 6.5, hx + 11, 12.5, 3, 5))), "nf"],
    [poly(onFront(rrect(hx - 9.4, 8, hx + 9.4, 11, 1.5, 5))), "nf lo"],
  ];
  return { far, near };
}

/** Card i, back to front: its number (8 at the back), which of three tab positions it takes, and its filleted outline, upright in its own plane. */
function card(i) {
  const n = N - i, t0 = TABS[(N - 1 - i) % 3];
  const shape = fillet(
    [[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]],
    [1, 1, 3.2, 1.8, 2.4, 2.4, 1.8, 3.2],
  );
  return { n, t0, shape };
}

/** Card i leaning th degrees (negative leans back) and lifted by `lift`: its paths, and where its eight punches sit. */
function pose(P, i, t0, shape, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  const punch = [];
  for (let k = 0; k < 8; k++) punch.push(w(t0 + TW / 2 + ((k % 4) - 1.5) * 3.6, H + TH / 2 + (0.5 - Math.floor(k / 4)) * 2.8));
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    head: seg(w(6, H - 11), w(W - 6, H - 11)),
    rules: [H - 18, H - 25, H - 32, H - 39].map((v) => seg(w(6, v), w(W - 6, v))).join(""),
    punch,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // The camera is fitted to the tray with a card lifted, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[X0, Y0, 0], [X1, Y1, -8], [X1, Y0, 0], [X0, Y1, 0], [X0, Y0, H + TH], [X1, Y0, H + TH + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 14);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const cards = [];
  for (let i = 0; i < N; i++) {
    const { n, t0, shape } = card(i);
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const head = mk("path", { class: "nf" }, grp), rules = mk("path", { class: "nf lo" }, grp);
    // the card's number, punched in a 4 × 2 grid on its tab
    const punch = [];
    for (let k = 0; k < 8; k++) punch.push(mk("circle", { r: 1.05, class: "dot " + (k === n - 1 ? "m" : "off") }, grp));
    cards.push({ n, t0, shape, back, face, head, rules, punch, a: tween(REST), z: tween(0) });
  }

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // hit bands: oblique strips along the RESTING top edges. They never move, and nothing draws them.
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];

  /** The card whose band holds the point, in the band's own (s, r) coordinates; -1 outside. */
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const cd = cards[i], q = pose(P, i, cd.t0, cd.shape, th, lift);
    cd.back.setAttribute("d", q.back);
    cd.face.setAttribute("d", q.face);
    cd.head.setAttribute("d", q.head);
    cd.rules.setAttribute("d", q.rules);
    cd.punch.forEach((el, k) => place(el, q.punch[k]));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    cards.forEach((cd, i) => { draw(i, tval(cd.a, now), tval(cd.z, now)); if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  const caption = (a) => (a < 0 ? "rest" : String(N - a).padStart(2, "0"));
  /** Pulls card a (-1 puts them all back). The stagger spreads out from the card pulled, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    cards.forEach((cd, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      tset(cd.a, th, now, delay); tset(cd.z, a === i ? LIFT : 0, now, delay);
      cd.face.classList.toggle("hi", i === a); cd.head.classList.toggle("hi", i === a); cd.punch[cd.n - 1].classList.toggle("m", i !== a);
    });
    read.textContent = caption(a);
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "riffle",
  means: "Eight cards in a tray: the one under the pointer stands up, and its neighbours lean away in turn.",
  rules: [1, 2, 8, 10],
  range: [0, 40, 90],
  mount,
});
```

- [ ] **Step 4: Check its length**

Run: `cd ~/estudos/hairline && rtk proxy wc -l skills/hairline-create/examples/riffle.js`
Expected: 200 or fewer. If it is over, shorten comments, never code.

- [ ] **Step 5: Run the browser tests to see them pass**

Run: `lsof -ti:4310 | xargs kill 2>/dev/null; cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec playwright test skill.spec.ts --reporter=line`
Expected: PASS, 11 tests (three per example, five on the bench itself).

If "riffle on the bench draws what the package draws" fails on a caption, print `golden[i].read` and `have.read`; the package's own parity test (`parity.spec.ts`) shows how the site's captions are reduced. If it fails on the drawing, diff the example against the two source files.

- [ ] **Step 6: Run every suite, then commit**

Run: `lsof -ti:4310 | xargs kill 2>/dev/null; cd ~/estudos/hairline && rtk proxy pnpm typecheck && rtk proxy pnpm test && rtk proxy pnpm test:browser`
Expected: all pass.

```bash
cd ~/estudos/hairline && rtk git add skills/hairline-create/examples/riffle.js packages/hairline/test/browser/serve.mjs packages/hairline/test/browser/skill.spec.ts && rtk git commit -m "Skill: Riffle as the second example, the discrete pattern beside Terrain's continuous one

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: The validator

**Files:**
- Create: `skills/hairline-create/validate.mjs`
- Create: `packages/hairline/test/skill/validate.test.ts`

**Interfaces:**
- Consumes: `assemble(figure)` from `./build.mjs`; `kernel.js`'s first-line hash; the figure format; the slot markup `<script type="module" id="hl-figure">\n…\n</script>` that `assemble` writes (Tasks 1 and 2).
- Produces:
  - `export function validate(page: string): string[]`: the problems, each one line of the form `<id>: <what to fix>`, with `id` one of `kernel bench text paint outside clock hit readout handle declare length`.
  - CLI `node validate.mjs <page.html>`: exit 0 and `ok <file>: …` on stdout; exit 1 with the problems and `<n> to fix in <file>` on stderr; exit 2 on a missing argument or an unreadable file.

- [ ] **Step 1: Write the failing test**

Create `packages/hairline/test/skill/validate.test.ts`:

```ts
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * validate.mjs passes the two examples and fails a page broken in one way,
 * naming that way and no other. The broken pages are Terrain with one change.
 */
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "hl-validate-"));
const terrain = readFileSync(SKILL + "examples/terrain.js", "utf8");
let n = 0;

/** Builds a figure's page, changes the page if asked, and validates it. */
function check(figure: string, change?: (page: string) => string, script = SKILL + "validate.mjs") {
  const src = join(dir, `f${++n}.js`), out = join(dir, `f${n}.html`);
  writeFileSync(src, figure);
  execFileSync("node", [SKILL + "build.mjs", src, out]);
  if (change) writeFileSync(out, change(readFileSync(out, "utf8")));
  const run = spawnSync("node", [script, out], { encoding: "utf8" });
  return { status: run.status, out: run.stdout, err: run.stderr };
}
/** Terrain with a line of code just before its declaration. */
const plus = (code: string) => terrain.replace("hairline({", () => `${code}\nhairline({`);

describe("pages that pass", () => {
  for (const name of ["terrain", "riffle"]) {
    it(`the ${name} example`, () => {
      const figure = readFileSync(`${SKILL}examples/${name}.js`, "utf8");
      expect(figure.trim().split("\n").length).toBeLessThanOrEqual(200);
      const run = check(figure);
      expect(run.err).toBe("");
      expect(run.status).toBe(0);
      expect(run.out).toMatch(/^ok .*kernel and bench intact/);
    });
  }

  it("a page saved with CRLF line endings", () => {
    expect(check(terrain, (page) => page.replace(/\n/g, "\r\n")).status).toBe(0);
  });

  it("a range that falls, as Slow's does", () => {
    expect(check(terrain.replace("range: [1.5, 3, 5]", "range: [5, 3, 1.5]")).status).toBe(0);
  });

  it("through a symlink to the skill folder", () => {
    const link = join(dir, "linked");
    symlinkSync(SKILL, link);
    const run = check(terrain, undefined, join(link, "validate.mjs"));
    expect(run.status).toBe(0);
    expect(run.out).toMatch(/^ok /);
  });
});

const BROKEN: [id: string, why: string, figure: string, change?: (page: string) => string][] = [
  ["kernel", "the kernel was edited", terrain, (page) => page.replace("var HL = ", "var HL = /* mine */ ")],
  ["bench", "the bench was edited", terrain, (page) => page.replace("</main>", "<p>better</p></main>")],
  ["text", "a text element", plus('mk("text", {}, document.querySelector("svg"));')],
  ["text", "markup written as a string", plus('document.querySelector("svg").innerHTML = "";')],
  ["paint", "a fill of its own", plus('mk("path", { fill: "red" });')],
  ["paint", "a stroke width of its own", plus('mk("path", { "stroke-width": 2 });')],
  ["paint", "an inline style", plus('document.body.style.background = "#000";')],
  ["outside", "a fetch", plus('fetch("https://example.com/data.json");')],
  ["outside", "a node made by hand", plus('document.createElementNS("http://www.w3.org/2000/svg", "path");')],
  ["outside", "a script tag in a string", plus('const s = "</script>";')],
  ["clock", "its own frame", plus("requestAnimationFrame(() => {});")],
  ["clock", "its own timer", plus("setTimeout(() => {}, 100);")],
  ["clock", "no kernel loop", terrain.replace("register(stage,", "((s, t) => ({ wake() {}, unregister() {} }))(stage,")],
  ["hit", "a box measured on screen", plus("stage.getBoundingClientRect();")],
  ["hit", "its own listener", plus('stage.addEventListener("pointermove", () => {});')],
  ["hit", "no pointer", terrain.replace("bag.add(pointer(stage,", "bag.add(((s, h) => () => {})(stage,")],
  ["readout", "no read-out", terrain.replace(/read\.textContent = [^;]+;/g, "")],
  ["handle", "no destroy", terrain.replace("destroy: bag.dispose", "stop: bag.dispose")],
  ["declare", "no means", terrain.replace(/\n {2}means: .*\n/, "\n")],
  ["declare", "a range that turns back", terrain.replace("range: [1.5, 3, 5]", "range: [1.5, 5, 3]")],
  ["declare", "a rule that does not exist", terrain.replace("rules: [1, 3, 5, 9]", "rules: [1, 11]")],
  ["declare", "no declaration", terrain.replace(/hairline\(\{[\s\S]*$/, "")],
  ["length", "over 200 lines", plus(Array.from({ length: 200 }, (_, i) => `const pad${i} = ${i};`).join("\n"))],
];

describe("pages that fail, each for its own reason", () => {
  for (const [id, why, figure, change] of BROKEN) {
    it(`${id}: ${why}`, () => {
      const run = check(figure, change);
      expect(run.status).toBe(1);
      const ids = run.err.split("\n").map((line) => /^([a-z]+): /.exec(line)?.[1]).filter(Boolean);
      expect(ids.length).toBeGreaterThan(0);
      expect([...new Set(ids)]).toEqual([id]);
      expect(run.err).toMatch(/\d+ to fix in /);
    });
  }
});

it("says how to call it when it is given nothing, and when the file is not there", () => {
  const none = spawnSync("node", [SKILL + "validate.mjs"], { encoding: "utf8" });
  expect(none.status).toBe(2);
  expect(none.stderr).toContain("usage: node validate.mjs <page.html>");
  const gone = spawnSync("node", [SKILL + "validate.mjs", join(dir, "nope.html")], { encoding: "utf8" });
  expect(gone.status).toBe(2);
  expect(gone.stderr).toContain("cannot read");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/validate.test.ts`
Expected: FAIL. Every test fails because `validate.mjs` does not exist: `status` is 1 with Node's `Cannot find module` on stderr, so the passing cases fail on `err` and the broken ones on the ids.

- [ ] **Step 3: Write the validator**

Create `skills/hairline-create/validate.mjs`:

```js
#!/usr/bin/env node
/**
 * Checks a page made by build.mjs: `node validate.mjs hairline-<name>.html`.
 * It prints what to fix and exits 1, or prints `ok` and exits 0. The checks
 * read the text of the file, so they catch what is mechanical; the look
 * (look.md) catches the rest. Each line it prints starts with the check's name:
 *
 *   kernel    the kernel in the page is this folder's kernel.js, untouched
 *   bench     nothing but the figure differs from bench.html
 *   text      no words inside the figure (rule 10)
 *   paint     no stroke width, colour, fill, filter or shadow of its own (rule 04)
 *   outside   nothing loaded or reached outside the file; every node from HL.mk
 *   clock     no timers or frames of its own; it joins HL.register (rule 07)
 *   hit       input only through HL.pointer; nothing measured on screen (rule 01)
 *   readout   it writes read.textContent
 *   handle    mount returns { set, destroy }
 *   declare   the file ends with hairline({ name, means, rules, range, mount })
 *   length    at most 200 lines
 */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assemble } from "./build.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const LIMIT = 200;
const unix = (s) => s.replace(/\r\n/g, "\n");
/** A figure's source without its comments, so its prose is never read as code. A `//` after a colon or inside a quote is kept: it is a URL. */
const bare = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\"'`])\/\/.*$/gm, "$1");

/** What a figure must not contain. */
const BAD = [
  ["text", /<\s*(?:text|tspan|textPath|foreignObject)\b|["'`](?:text|tspan|textPath|foreignObject)["'`]|\b(?:innerHTML|outerHTML|insertAdjacentHTML|innerText)\b/,
    "rule 10. No words inside the figure, and no markup written as a string. Say it with geometry (a punch, a dot code, a bright edge); names go to read.textContent."],
  ["paint", /stroke-width|strokeWidth|stroke-dasharray|["'`](?:fill|stroke|filter|style|color|stop-color)["'`]|\b(?:fill|stroke|filter|style)\s*:|\.style\b|#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color-mix)\(|drop-shadow|box-shadow|feDropShadow|feGaussianBlur|[Gg]radient/,
    "rule 04. The figure sets a stroke width, colour, fill, filter, gradient or shadow of its own. Use the kernel's classes and nothing else: sil, hi, lo, nf, fo, dash, dot, dot m, dot off."],
  ["outside", /\bfetch\s*\(|\bimport\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\/|\burl\(|<\/?script|<(?:link|img|iframe|style)\b|new\s+Image\b|createElement|\beval\s*\(|new\s+Function\b|localStorage|sessionStorage|\.cookie\b/,
    "the figure reaches outside the file or makes nodes by hand. One self-contained file: no fetch, import, URL, script tag or storage, and every node comes from HL.mk."],
  ["clock", /\bsetInterval\b|\bsetTimeout\b|\brequestAnimationFrame\b|\.animate\s*\(|<animate|IntersectionObserver|\bmatchMedia\b/,
    "rule 07. The figure runs a clock of its own. Move inside HL.register(stage, tick), with springs (stepS) or tweens (tset, tval); a delay is a tween's delay. The loop sleeps offscreen and honours reduced motion for you."],
  ["hit", /getBoundingClientRect|elementFromPoint|elementsFromPoint|:hover|(?:addEventListener|\.on)\s*\(\s*(?:\w+\s*,\s*)?["'`](?:mouse|pointer|touch|click)|\bon(?:mouse|pointer|touch|click)\w*\s*=/,
    "rule 01. The figure listens to the pointer itself or measures what is on screen. Take the pointer from HL.pointer(stage, { move, leave }) and test it against the rest or target pose, in world units."],
];

/** What a figure must contain. */
const NEED = [
  ["clock", /\bregister\s*\(/, "rule 07. The figure never joins the kernel's loop. Draw inside HL.register(stage, tick), and give its unregister to destroy."],
  ["hit", /\bpointer\s*\(/, "the figure never listens to the pointer. Call HL.pointer(stage, { move, leave }) and answer it."],
  ["readout", /\bread\.textContent\s*=/, 'the figure never writes the read-out. Set read.textContent to what is under the pointer, and to "rest" when nothing is.'],
  ["handle", /\bset\s*[:(]/, "mount must return { set(value), destroy() }, and set is missing. It takes the slider's number."],
  ["handle", /\bdestroy\s*[:(]/, "mount must return { set(value), destroy() }, and destroy is missing. It undoes everything mount did: bag.dispose."],
];

/** The declaration at the end of the file, read as text. */
function declared(code) {
  const say = (what) => `declare: the file must end with hairline({ name, means, rules, range, mount }). ${what}`;
  const m = /\bhairline\s*\(\s*\{([\s\S]*?)\}\s*\)\s*;?\s*$/.exec(code.trimEnd());
  if (!m) return [say("That call is missing, or is not the last statement.")];
  const d = m[1], wrong = [];
  const list = (key) => {
    const a = new RegExp(`\\b${key}:\\s*\\[([^\\]]*)\\]`).exec(d);
    return a ? a[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number) : null;
  };
  if (!/\bname:\s*(["'`])[a-z][a-z0-9-]{1,30}\1/.test(d)) wrong.push("name (lowercase letters, digits and hyphens)");
  if (!/\bmeans:\s*(["'`])(?:(?!\1).){1,140}\1/.test(d)) wrong.push("means (one sentence, at most 140 characters)");
  const rules = list("rules"), range = list("range");
  if (!rules || !rules.length || rules.some((r) => !Number.isInteger(r) || r < 1 || r > 10)) wrong.push("rules (the numbers, 1 to 10, of the rules it leans on)");
  const oneWay = range && range.length === 3 && range.every(Number.isFinite) && range[0] !== range[2] && (range[1] - range[0]) * (range[2] - range[1]) >= 0;
  if (!oneWay) wrong.push("range (three numbers that move one way: the figure's value at intensity 0, 0.5 and 1)");
  if (!/\bmount\b/.test(d)) wrong.push("mount");
  return wrong.length ? [say(`Wrong or missing: ${wrong.join("; ")}.`)] : [];
}

/** Everything wrong with a page, one line each; empty when it passes. */
export function validate(input) {
  const page = unix(input), out = [];

  const kernel = unix(readFileSync(here("./kernel.js"), "utf8")).trimEnd();
  const cut = kernel.indexOf("\n");
  const hash = /sha256:([0-9a-f]{64})/.exec(kernel.slice(0, cut))?.[1];
  if (hash !== createHash("sha256").update(kernel.slice(cut + 1) + "\n").digest("hex")) {
    out.push("kernel: kernel.js in the skill folder has been edited. Install the skill again; the kernel is never changed by hand.");
  }

  const fig = /<script type="module" id="hl-figure">\n([\s\S]*?)\n<\/script>/.exec(page);
  if (!fig) return [...out, "bench: the page has no figure slot. Make it with `node build.mjs <figure.js>`, not by hand."];
  if (!page.includes(kernel)) {
    out.push("kernel: the kernel in the page is not kernel.js. Build again with `node build.mjs`; never edit or retype the kernel.");
  } else if (page.trimEnd() !== assemble(fig[1]).trimEnd()) {
    out.push("bench: the page differs from bench.html outside the figure. Build again with `node build.mjs`; the bench is fixed, and a change belongs in the figure.");
  }

  const src = fig[1], code = bare(src);
  for (const [id, re, say] of BAD) if (re.test(code)) out.push(`${id}: ${say}`);
  for (const [id, re, say] of NEED) if (!re.test(code)) out.push(`${id}: ${say}`);
  out.push(...declared(code));
  const lines = src.split("\n").length;
  if (lines > LIMIT) out.push(`length: the figure is ${lines} lines and the limit is ${LIMIT}. A figure this long is usually two ideas: cut the concept down to one.`);
  return out;
}

/* The skill is often installed as a symlink, so the path Node was given is resolved before it is compared. */
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(here("./validate.mjs"))) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node validate.mjs <page.html>");
    process.exit(2);
  }
  let page;
  try { page = readFileSync(file, "utf8"); } catch {
    console.error(`cannot read ${file}`);
    process.exit(2);
  }
  const problems = validate(page);
  if (problems.length) {
    for (const p of problems) console.error(p);
    console.error(`${problems.length} to fix in ${file}`);
    process.exit(1);
  }
  console.log(`ok ${file}: kernel and bench intact, and the figure passes the static checks. Now the look: look.md.`);
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/validate.test.ts`
Expected: PASS, 29 tests (5 passing pages, 23 broken ones, 1 usage).

A broken case that reports a second id means one of the patterns is too wide or the mutation trips two checks. Fix the pattern if it would also misfire on honest code; otherwise change the mutation in the test and say so in your report. Do not loosen a pattern until the examples pass by accident.

- [ ] **Step 5: Run every suite, then commit**

Run: `cd ~/estudos/hairline && rtk proxy pnpm typecheck && rtk proxy pnpm test`
Expected: all pass.

```bash
cd ~/estudos/hairline && rtk git add skills/hairline-create/validate.mjs packages/hairline/test/skill/validate.test.ts && rtk git commit -m "Skill: the validator, which rejects a changed kernel or bench and a figure that breaks a mechanical rule

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: The skill's words

**Files:**
- Create: `skills/hairline-create/SKILL.md`
- Create: `skills/hairline-create/rules.md`
- Create: `skills/hairline-create/concepts.md`
- Create: `skills/hairline-create/look.md`
- Create: `packages/hairline/test/skill/shape.test.ts`
- Modify: `CONTRIBUTING.md` (layout and commands)
- Modify: `docs/superpowers/specs/2026-10-01-hairline-create-skill-design.md` (the five additions)

**Interfaces:**
- Consumes: the file names, the CLI of `build.mjs` and `validate.mjs`, the check names, the bench's `?w` and `?at` parameters, the rule names in the bench's `RULES` (Tasks 1–4).
- Produces: the skill as an agent reads it. The four files below are written by the architect; transcribe them exactly. If something in them contradicts the code, stop and report it instead of rewording.

- [ ] **Step 1: Write the failing test**

Create `packages/hairline/test/skill/shape.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** The skill folder is what an agent installs: these hold its shape. */
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const FILES = ["SKILL.md", "bench.html", "build.mjs", "concepts.md", "examples/riffle.js", "examples/terrain.js", "kernel.js", "look.md", "rules.md", "validate.mjs"];
const text = (p: string) => readFileSync(SKILL + p, "utf8");

it("holds exactly its ten files", () => {
  const found = (readdirSync(SKILL, { recursive: true, withFileTypes: true }) as import("node:fs").Dirent[])
    .filter((e) => e.isFile())
    .map((e) => (e.parentPath + "/" + e.name).slice(SKILL.length).replace(/^\//, ""));
  expect(found.sort()).toEqual(FILES);
});

it("SKILL.md opens with a name that is its folder's and a description that says when to use it", () => {
  const m = /^---\nname: (.+)\ndescription: (.+)\nargument-hint: (.+)\n---\n/.exec(text("SKILL.md"));
  expect(m).not.toBeNull();
  expect(m![1]).toBe("hairline-create");
  expect(m![2]).toMatch(/^Use when /);
  expect(m![2].length).toBeLessThanOrEqual(1024);
  expect(text("SKILL.md").split("\n").length).toBeLessThan(120);
});

it("SKILL.md points to every other file, and to none that is not there", () => {
  const skill = text("SKILL.md");
  for (const f of FILES.filter((f) => f !== "SKILL.md")) expect(skill, f).toContain(f);
  for (const [, f] of skill.matchAll(/`([\w./-]+\.(?:md|mjs|js|html))`/g)) expect(existsSync(SKILL + f), f).toBe(true);
});

it("rules.md has the ten rules, named as the bench names them", () => {
  const names = [...text("rules.md").matchAll(/^## (\d\d) · (\w+)/gm)].map((m) => `${m[1]} ${m[2]}`);
  const bench = /const RULES = (\[[^\]]+\]);/.exec(text("bench.html"))![1];
  expect(names).toEqual((JSON.parse(bench) as string[]).map((name, i) => `${String(i + 1).padStart(2, "0")} ${name}`));
});

it("look.md and SKILL.md name the validator's checks and the bench's parameters as they are", () => {
  expect(text("look.md")).toContain("?w=240");
  expect(text("look.md")).toContain("at=");
  for (const id of ["kernel", "bench", "text", "paint", "outside", "clock", "hit", "readout", "handle", "declare", "length"]) {
    expect(text("validate.mjs"), id).toMatch(new RegExp(`^ \\* {3}${id} `, "m"));
  }
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill/shape.test.ts`
Expected: FAIL. "holds exactly its ten files" lists six; the others fail with `ENOENT`.

- [ ] **Step 3: Write `SKILL.md`**

Create `skills/hairline-create/SKILL.md`:

````markdown
---
name: hairline-create
description: Use when someone asks for a new Hairline figure, or runs /hairline-create with an idea. Draws one isometric line figure that answers the pointer, in the style and on the engine of @lucasmarkes/hairline, and hands it over as a single self-contained HTML file.
argument-hint: "[idea]"
---

# Hairline: create a figure

You are making one figure in the Hairline style: an isometric line drawing, built from rounded solids in a single stroke, that answers the pointer. It ships as one HTML file with nothing to install. The six figures of `@lucasmarkes/hairline` are the bar; `examples/terrain.js` and `examples/riffle.js` are two of them, in the format you will write.

You write one thing: the figure. The engine (`kernel.js`) and the page (`bench.html`) are fixed. Never edit them, never paste a changed copy of them, and never write again what the kernel already gives you.

Every path below is in this skill's folder.

## 1. Concept

Read `concepts.md`. Then offer two or three concepts, one line each:

> **Name.** The object. What the pointer does to it. What the read-out says.

Wait for the person to pick. Skip this step only when they arrived with the object and the gesture already chosen. If there is nobody to ask, take the concept with the strongest rest pose and say which you took.

One figure, one idea. A concept that needs a label to be understood is not a concept yet.

## 2. Build

1. Read `rules.md`. The ten rules are not advice: a figure that breaks one is not finished.
2. Read the index at the top of `kernel.js`: the first comment, down to `var HL`. It lists everything you may call. Do not read the code under it.
3. Read the example nearer your concept: `examples/terrain.js` for a continuous field, `examples/riffle.js` for discrete items.
4. Write the figure as `<name>.js` in the person's working directory, in the shape of the examples: take what you need from `HL`, define `mount({ stage, svg, read }, value)` returning `{ set, destroy }`, and end the file with `hairline({ name, means, rules, range, mount })`.
   - `name`: lowercase, one word or hyphenated.
   - `means`: one sentence saying what the figure shows. It is the line under the stage.
   - `rules`: the numbers of the rules this figure leans on most.
   - `range`: the one number the slider drives, at intensity 0, 0.5 and 1. The middle one is the default, and the three move one way.
5. Assemble it: `node build.mjs <name>.js` writes `hairline-<name>.html`. Without Node, copy `bench.html` and put the contents of `kernel.js` where `/*KERNEL*/` is and your figure where `/*FIGURE*/` is, by file operation, changing nothing else.

## 3. Check

1. `node validate.mjs hairline-<name>.html`. Fix every line it prints, build again, run it again. Without Node, read the list of checks at the top of `validate.mjs` and answer each one from your code.
2. The look: follow `look.md`. Fix what fails, then go back to 1.

Do not hand over a page the validator rejects. Do not say the look is done if you did not look.

## 4. Hand over

Publish `hairline-<name>.html` as an artifact if you can. If you cannot, leave the file where the person can open it and say where it is. Then say, one line each:

- the metaphor: what the object is, and what the pointer does to it;
- the rules it leans on;
- anything you could not verify (no Node, no browser), plainly.

## 5. Adjust

When the person asks for a change, edit only `<name>.js`, then build, validate and look again. The tenth version is held to the same bar as the first.

## What goes wrong

| If you catch yourself | Do this instead |
| --- | --- |
| adding a label, a number or a letter to the drawing | say it with geometry (rule 10); names go to `read.textContent` |
| reaching for a colour, a fill or a glow | move one stroke from `sil` to `hi` (rule 04) |
| writing a timer, a `requestAnimationFrame` or a CSS animation | `register(stage, tick)`, with springs or tweens (rules 07 and 08) |
| testing the pointer against what is drawn right now | test it against the rest or target pose (rule 01) |
| drawing a box with twelve edges | `prism` of two rounded rings: a silhouette and one crease (rule 09) |
| leaving rest flat, empty, or symmetric because that was easy | compose it: rest is the thumbnail (rule 05) |
| editing the kernel or the bench to make something work | the figure is wrong; change the figure |
| letting in a second idea | cut it: one figure, one idea |
````

- [ ] **Step 4: Write `rules.md`**

Create `skills/hairline-create/rules.md`:

````markdown
# The ten rules

They come from the study behind the package (lucasmarkes.com/lab/hairline). Each has what it says, how to keep it with the kernel, and what gets a figure rejected.

## 01 · hit: hit areas don't move

Test the pointer against the rest pose, or the target pose, never the pose on screen. Otherwise the geometry lifts out from under the pointer, the hover drops, the geometry falls back, and the hover returns: a flicker loop.

- **Keep it:** `unproj(C, sx, sy, 0)` puts the pointer on the ground plane, which never moves; pick by world coordinates (Terrain). For items, test static bands along their resting edges (Riffle). When a choice depends on a moving value, read the spring's target (`.t`), not its position (`.x`).
- **Rejected when:** the pointer held still on a moving edge makes the figure oscillate; picking reads a spring's current value; the figure measures the DOM (`getBoundingClientRect`, `elementFromPoint`, `:hover`) or adds its own pointer listeners.

## 02 · order: stagger by distance

`delay = |i − a| × step`. The motion spreads out from the pointer instead of running down a list.

- **Keep it:** `tset(tween, target, now, Math.abs(i - a) * step)`, with a step of 30–60ms so it reads as one gesture.
- **Rejected when:** items move in index order whatever was touched; all move at once when the concept is a spread; a step so long the last item starts after the first has landed and the gesture reads as a queue.

## 03 · reach: clamp the reach

The answer has a far end, and the figure is still composed there.

- **Keep it:** a falloff that reaches a floor (Terrain's is 1 → .31 at 42% of the radius → .09 beyond); `clamp` every lift, gap and lean; fit the camera to the most extreme pose (`fit` with the lifted points), so nothing leaves the 400 × 320 frame at intensity 1.
- **Rejected when:** at the slider's far end the figure comes apart, overlaps itself or leaves the frame; an unclamped value follows the pointer without limit.

## 04 · accent: the stroke is the only highlight

No fills, glows or shadows. The active edge goes from the silhouette's stroke to the bright one and nothing else changes colour, so the colour reads as information.

- **Keep it:** `el.sil.classList.toggle("hi", active)`. Dots change between `dot`, `dot m` and `dot off`. That is the whole palette.
- **Rejected when:** the figure sets any colour, fill, opacity trick, gradient, filter, shadow or stroke width of its own; more than one thing is bright without each meaning something; highlight is used as decoration.

## 05 · rest: rest is designed, never flat

Leaving returns the figure to a composition: a dune, a lean, a slight explode. The still frame is the thumbnail, so it has to hold up alone.

- **Keep it:** give every part a rest value that is not zero and not uniform (Terrain's dune is two Gaussians; Riffle's cards lean back 12°). Put one bright mark at rest where the eye should start.
- **Rejected when:** at rest the figure is a flat grid, an empty tray, a perfectly regular row; at rest nothing says what the figure is about; rest and "nothing rendered yet" look alike.

## 06 · honesty: construction stays honest

Plates are opaque, filled with the ground colour. Guides and dashed lines are painted behind the plates they belong to, so the drawing never shows a line it should not.

- **Keep it:** append back to front (Terrain walks its grid diagonal by diagonal from the far corner); a shape that must hide what is behind it keeps its fill (no `nf`); guides use `dash` and are appended before their plate. When depth order changes, move the group (`a.after(b)`), do not redraw.
- **Rejected when:** a far edge shows through a near solid; paint order is the order the code happened to make things in; a dashed guide crosses the face of the plate it belongs to.

## 07 · cost: loops sleep offscreen

Only ambient motion runs without input, and only while visible.

- **Keep it:** all motion happens inside `register(stage, tick)`. Return `true` from `tick` only while something is still moving; call `wake()` after input. The loop stops when every figure has settled, sleeps offscreen, and lands springs and tweens at once under reduced motion.
- **Rejected when:** the figure has a timer, a `requestAnimationFrame` or a CSS animation of its own; `tick` always returns `true` in a figure that is not ambient; a path is rewritten on frames where its value did not change (keep the last drawn value and skip).

## 08 · clock: two clocks

A discrete change (which item) gets a long ease-out: 700ms on `(.32, .72, 0, 1)`. A continuous input (where the pointer is) gets a spring, `k 100 · c 18 · m 1`, because its target moves every frame and a timed ease would always be chasing it.

- **Keep it:** `tween` / `tset` / `tval` for which; `spring` / `stepS` for where. Use the defaults unless the figure has a reason you can state.
- **Rejected when:** a tween follows the pointer's position; a spring animates a choice between items; durations or spring constants are invented; anything is linear.

## 09 · radius: round every corner, then draw less

A solid is the hull of two rounded rings, its top and its base. The vertical corners are never drawn. The top edge becomes one dim crease a unit or two inside the silhouette. Bright outside, dim inside: that hierarchy is most of the polish.

- **Keep it:** `rings(x0, y0, x1, y1, r, b)` then `prism(P, front, ring, inner, z0, z1)` into `solid(parent)` with `put`. A thin plate gets a second line for its thickness, not a second solid. Round flat outlines with `fillet`.
- **Rejected when:** a box shows twelve edges or any vertical corner line; a corner is sharp; inner lines are as bright as the silhouette; a solid has more than its silhouette, one crease, and at most a few marks the object would really have.

## 10 · quiet: no words inside the figure

Geometry carries identity: a punch on a card's tab, a dot code on a crate's lid, a bright edge instead of a label. Names go to the corner read-out, outside the drawing. Anything decorative has to be something the object would really have.

- **Keep it:** `read.textContent = …` names what is under the pointer, in a few characters (`cell 4·2`, `08`), and says `rest` when nothing is. Number things with dots.
- **Rejected when:** the svg holds text, letters or digits drawn as paths, icons, arrows or logos; the figure cannot be understood without its read-out; the read-out is a sentence.

## The frame

Not a rule of the study, but every figure shares it.

- The viewBox is 400 × 320. Centre the figure near (200, 166) with `fit`.
- The camera is `Cam(45, 0.5, S)`: the 2:1 view. Change `S` to fit; leave the angle alone unless the camera is the concept.
- The silhouette must read at 240px wide. Past a hundred or so solids, or with parts under ten viewBox units, it will not.
- `mount` keeps no state outside itself, and `destroy` leaves the svg empty and nothing running: collect tear-down in `disposer()` and return `bag.dispose`.
- At most 200 lines. A longer figure is usually two ideas.
````

- [ ] **Step 5: Write `concepts.md`**

Create `skills/hairline-create/concepts.md`:

````markdown
# From an idea to a concept

A concept is three things: **an object**, **what the pointer does to it**, and **what the read-out says**. It fits on one line. If it does not, it is not ready to build.

## Finding it

1. **Find the object.** Something you could put on a desk: a tray, a belt, a platter, a stack, a board of pegs. Not a diagram. "A sales funnel" is not boxes and arrows; it might be a rack of sieves, each finer than the last.
2. **Find the variable.** Every idea has one number or one choice that matters: how far, which one, how fast, how long. That is what the pointer gets.
3. **Give the pointer that variable.** Where it is sets a position (continuous); what it is over sets a choice (discrete). The answer should be what a hand would expect from the object.
4. **Design the rest.** What does the object look like when nobody touches it? It must already be a composition, and already say what the figure is about.
5. **Choose the read-out's words.** A few characters naming what is under the pointer: `cell 4·2`, `08`, `sieve 3`. And `rest`.
6. **Choose the slider's number.** One number that makes the answer weaker or stronger: a radius, a stagger, a gap, a rate. Its three values go in `range`.

## Six answers already proven

The package's six figures each answer the pointer a different way. A new figure usually borrows one.

| Answer | In the package | The pointer | The clock | The slider |
| --- | --- | --- | --- | --- |
| **A field** | Terrain: pillars rise near the pointer | sets a position on the ground; height falls off with distance | a spring per part | the radius |
| **One of many** | Riffle: the card under the pointer stands up | picks an item; its neighbours part, staggered outwards | tweens | the stagger |
| **Scrub and pick** | Exploded: a window comes apart in layers | x scrubs the gap, y picks a layer, which gets the bright edge | a spring for the gap | the gap |
| **Paint and decay** | Phosphor: a dot matrix you can draw on | excites what it passes; the marks fade; an idle loop returns | a decay per dot | the afterglow |
| **Dilate time** | Slow: crates ride a belt through a gate | the world keeps moving, hovering slows it so it can be read | a spring on the rate | the rate |
| **Push the camera** | Turntable: a platter you flick round | pushes; friction bleeds the spin; detents catch it | friction, then a spring | the coast |

`examples/terrain.js` is the first and `examples/riffle.js` the second, in full.

## A weak concept

Drop it, or fix it before building, when:

- **It is dead at rest.** Nothing to look at until touched.
- **It needs words.** Without a label nobody would know what it is.
- **It holds more than one idea.** Two gestures, two variables, two objects.
- **The pointer has no reason.** The figure would be the same as a loop.
- **It is a diagram.** Boxes, arrows and lines between them are not an object.
- **It is an icon.** The literal symbol of the idea (a padlock for security) has nothing to answer with.
- **It depends on colour.** The palette is one stroke in four weights.
- **It will not read at 240px.** Too many parts, or parts too small.

## An example

For "a sales funnel":

> **Sieves.** Five trays stacked on a rack, each with a finer grid of holes. The pointer's height picks a tray, which slides out and takes the bright edge; the ones above it lift clear. The read-out names the stage: `sieve 3`.
>
> **Chute.** Beads ride a belt that narrows through four gates, fewer passing each. Hovering slows the belt; the gate nearest the pointer brightens as a bead passes. The read-out says how many reached it: `gate 2 · 31`.
>
> **Basin.** A field of pegs sloping to one drain. The pointer raises a ridge that splits the slope, and the pegs behind it stand taller the nearer they are. The read-out names the cell: `cell 6·2`.

Each has an object, a gesture and a read-out; each is one idea; each is something at rest.
````

- [ ] **Step 6: Write `look.md`**

Create `skills/hairline-create/look.md`:

````markdown
# The look

The validator reads text. This is what only eyes can check. Do it every time the figure changes.

## Four pictures

Open `hairline-<name>.html` in a browser and take four pictures. Two parameters in the address help:

- `?w=240` narrows the page to 240px, the size of a thumbnail.
- `&at=x,y` holds the pointer at a point of the figure's 400 × 320 viewBox, for tools that cannot hover. Choose a point that is on your figure.

| Picture | Address |
| --- | --- |
| full size, at rest | `hairline-<name>.html` |
| full size, answering | `hairline-<name>.html?at=200,160` |
| 240px, at rest | `hairline-<name>.html?w=240` |
| 240px, answering | `hairline-<name>.html?w=240&at=200,160` |

Wait a second after loading before the answering pictures, so springs and tweens have landed.

## What to see

Answer each with yes or no. A no is fixed in the figure before anything is handed over.

1. **The silhouette reads at 240px.** You can say what the object is from the small picture alone.
2. **Rest is a composition** (rule 05). Not flat, not empty, not a regular grid; something is bright where the eye should start.
3. **The answer falls off with distance, or spreads out from the pointer** (rules 02 and 03). It is not everything at once, and not one part alone.
4. **Nothing flickers** (rule 01). Hold `at` on an edge that moves when touched and take two pictures a second apart: they are the same.
5. **Bright outside, dim inside** (rule 09). Every solid is a silhouette and one crease; no vertical corner is drawn; no corner is sharp.
6. **Nothing shows through** (rule 06). No far edge crosses a near solid; no guide crosses its own plate.
7. **One highlight** (rule 04). What is bright is what the pointer chose, and it is a stroke.
8. **The read-out names what is under the pointer**, in a few characters, and says `rest` at rest.
9. **Nothing leaves the frame.** With the slider at each end and the pointer at the figure's edges, every part stays inside the plate.
10. **Both themes.** Press the theme button: nothing vanishes and nothing is left the wrong colour.
11. **No words** (rule 10). Nothing in the drawing is a letter, a digit, an arrow or an icon.
12. **The page is clean.** No line under the stage reporting an error, and nothing on the console.

If you are unsure whether the figure's weight is right, build an example the same way and put the two side by side: `node build.mjs examples/terrain.js`.

## Without a browser

Answer the same twelve from the code, each with the line that makes it true: the rest values for 2, the falloff or stagger for 3, the hit test for 4, the paint order for 6. Then say at hand-over, in these words, that the figure was **not looked at in a browser**. Do not skip the list and do not guess a yes.
````

- [ ] **Step 7: Run the shape test to see it pass**

Run: `cd ~/estudos/hairline/packages/hairline && rtk proxy pnpm exec vitest run test/skill`
Expected: PASS: `shape.test.ts` 5 tests, and `kernel`, `build` and `validate` still green.

- [ ] **Step 8: Tell contributors about the skill**

In `CONTRIBUTING.md`, in the `## Layout` block, add after the `apps/site` line:

```
skills/hairline-create   the skill that draws a new figure: its kernel is generated from packages/hairline/src/core
```

In the `## Commands` table, add after the `pnpm dev` row:

```markdown
| `pnpm kernel` | Regenerates `skills/hairline-create/kernel.js` from `packages/hairline/src/core`. Run it after any change there; a test fails until you do. |
```

- [ ] **Step 9: Bring the spec up to date**

In `docs/superpowers/specs/2026-10-01-hairline-create-skill-design.md`:

1. In the table under "Files in `skills/hairline-create/`", add a row after `bench.html`:

```markdown
| `build.mjs` | Puts a figure on the bench: `node build.mjs <figure.js>` writes the page. No dependencies. |
```

2. Under "The validator", replace the bullet about the figure's own clock with:

```markdown
- the figure runs its own clock (`setInterval`, `setTimeout`, `requestAnimationFrame`) or never joins the kernel's loop: rule 07 and reduced motion;
- the figure listens to the pointer itself, measures what is on screen, or never calls the kernel's `pointer`: rule 01;
- anything in the page other than the figure differs from the bench;
```

3. Under "The look", add after the first paragraph:

```markdown
The bench takes two URL parameters for this: `?w=240` narrows the page, and `&at=x,y` holds the pointer at a viewBox point, for tools that cannot hover.
```

4. Under "The figure contract", add a last paragraph:

```markdown
Figures are pointer-only. The bench's stage is an image, not a focusable group, so the Riffle example leaves out the package's keyboard handling.
```

- [ ] **Step 10: Run every suite, then commit**

Run: `lsof -ti:4310 | xargs kill 2>/dev/null; cd ~/estudos/hairline && rtk proxy pnpm build && rtk proxy pnpm typecheck && rtk proxy pnpm test && rtk proxy pnpm test:browser && rtk proxy pnpm run release --static`
Expected: all pass. This is the CI job, in its order.

```bash
cd ~/estudos/hairline && rtk git add skills/hairline-create/SKILL.md skills/hairline-create/rules.md skills/hairline-create/concepts.md skills/hairline-create/look.md packages/hairline/test/skill/shape.test.ts CONTRIBUTING.md docs/superpowers/specs/2026-10-01-hairline-create-skill-design.md && rtk git commit -m "Skill: the flow, the ten rules with what rejects a figure, how to find a concept, and the look

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Pull request (controller)

**Files:** none.

**Interfaces:**
- Consumes: the branch `skill-create` with Tasks 1–5 committed and the whole-branch review done.
- Produces: an open pull request against `main` with CI green. It is not merged: the trial comes first, and the merge is Lucas's call.

- [ ] **Step 1: Push and open the pull request**

```bash
cd ~/estudos/hairline && rtk git push -u origin skill-create
```

Open the pull request with `rtk gh pr create --base main --head skill-create`, titled `hairline-create: a skill that draws a new Hairline figure`, its body covering: what the skill is and how it is installed (`npx skills add lucasmarkes/hairline`, once the repository is public); the files; what CI now checks; the five additions to the spec; an empty **Trial** section for Task 7.

- [ ] **Step 2: Watch CI**

Run: `cd ~/estudos/hairline && rtk proxy gh pr checks --watch`
Expected: `verify` passes. If it fails, read the log (`rtk proxy gh run view --log-failed`), fix on the branch with a test, push again.

---

### Task 7: The trial (controller, with Lucas)

No automatic test proves an agent turns a new idea into a good figure. This is the test.

**Files:**
- Modify, as the trial finds defects: `skills/hairline-create/rules.md`, `concepts.md`, `look.md`, `SKILL.md`, `validate.mjs` (each change to the validator with a failing case added to `BROKEN` first)
- Scratch, never committed: `.superpowers/trial/<n>-<name>/`

**Interfaces:**
- Consumes: the finished skill folder.
- Produces: five pages judged by Lucas, and a **Trial** section in the pull request: the ideas, the verdicts, every recurring defect and the line or check it became.

- [ ] **Step 1: Run five clean sessions**

Dispatch five fresh subagents, each knowing nothing of this conversation, three on `opus` and two on `sonnet` (a weaker agent is part of the test). Each gets this prompt, with its idea and folder filled in:

```
Read ~/estudos/hairline/skills/hairline-create/SKILL.md and follow it exactly, for this request:

/hairline-create <idea>

There is nobody to pick a concept: write your concepts down, then take one as SKILL.md says for that case. Work in ~/estudos/hairline/.superpowers/trial/<n>-<slug>/ (create it). Do not read anything else in the repository: you have only the skill folder, as someone who installed it would. Do not publish an artifact; leave the HTML file in your folder.

Report: the concepts you offered and the one you took; the path of the HTML file; the validator's final output; your answers to the look, and whether you looked in a browser; which files of the skill you read, and whether you read the kernel's code below its index; anything in the skill that was unclear, missing or wrong.
```

The ideas, chosen to differ in kind:

1. `a sales funnel` (a flow that narrows)
2. `a rate limiter` (time and a threshold)
3. `git branches merging` (structure; the pull towards a diagram)
4. `a bookshelf` (plain discrete objects)
5. `weather over a city` (ambient, continuous, not technical)

- [ ] **Step 2: Check each page before showing it**

For each: `node skills/hairline-create/validate.mjs <page>` exits 0, and the page opens with a clean console. A session that handed over a failing page is a finding in itself: write down which instruction it skipped.

- [ ] **Step 3: Lucas judges**

Give Lucas the five pages and, for each, the concept line. Ask for a verdict on each (would it sit beside Terrain: yes, nearly, no) and what is wrong with it. Wait for the answer.

- [ ] **Step 4: Turn defects into the skill**

A defect seen in two or more pages, or one Lucas calls out as a rule broken, becomes a change:

- mechanical (it can be read off the text) → a check in `validate.mjs`, with its failing case added to `BROKEN` in `validate.test.ts` first, watched to fail, then made to pass;
- a matter of taste → a "Rejected when" line in `rules.md`, a line in `concepts.md`'s weak list, or a question in `look.md`;
- a misreading of the flow → `SKILL.md`.

Also from the reports: if agents read the kernel's code despite the instruction, or the kernel's size hurt them, say so in the pull request with the numbers from Task 1, Step 5.

Then run the idea that came out worst once more, in a clean session, to see the change hold.

- [ ] **Step 5: Record and hand the merge to Lucas**

Run the CI job locally (Task 5, Step 10), commit the changes by name, push, and write the **Trial** section of the pull request: the five ideas and verdicts, each defect and what it became, what is still not good enough. Then ask Lucas whether to merge. Do not merge without a yes.
