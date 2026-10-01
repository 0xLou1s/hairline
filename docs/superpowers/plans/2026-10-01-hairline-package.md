# hairline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the six Hairline figures as `@lucasmarkes/hairline@0.1.0` on npm (vanilla and React entries, with provenance), with a site at `hairline.lucasmarkes.com` that shows and documents every figure.

**Architecture:** The website's figure engines are copied into `packages/hairline/src` as they are, with one small patch, and a thin public layer wraps them: `mount.ts` creates and destroys a figure on any element, `index.ts` has one function per figure, and `react.tsx` has one component per figure. Parity tests replay fixed pointer scripts on the package under a virtual clock. Each must produce the SVG that the website produces, character for character, against goldens captured from the website before any engine moves. A Next.js site in `apps/site` consumes the package through its public entries. It also serves a shadcn registry item and `/llms.txt`.

**Tech Stack:**
- Repository: pnpm 10 workspaces, Turborepo 2, TypeScript 5.9 (strict), Node 22.
- Package: tsup 8 (ESM only, es2020); Vitest 5 on node and jsdom; Playwright 1.63 on the installed Chrome; esbuild for the test harness.
- Package gates: publint, `@arethetypeswrong/cli`, size-limit.
- Site: Next.js 16 App Router, React 19, Tailwind 4, Geist, Shiki 4 (at build time only), Vercel Analytics.
- Publishing: GitHub Actions with npm provenance; Vercel.

**Spec:** `docs/superpowers/specs/2026-10-01-hairline-package-design.md`. Read it before Task 1. Where this plan and the spec disagree, the plan says so under "Deviations from the spec".

## Global Constraints

**Package**
- The name is `@lucasmarkes/hairline`. It is one package with two entries: `.` (vanilla) and `./react`.
- v1 covers six figures: Riffle, Terrain, Exploded, Phosphor, Slow, Turntable. The maths and the frame loop stay private.
- A figure draws only the drawing: no frame, no corner text, no slider.
- Build: ESM only, `target: es2020`, declarations, source maps, `"sideEffects": false`.
- Dependencies: none. `react >=18` is an optional peer dependency.
- Licence: MIT. TypeScript strict. English in code, docs and site.

**Options**

| Figure | Option | Range | Default |
| --- | --- | --- | --- |
| Riffle | `stagger` | 0–90 ms | 40 |
| Riffle | `bands` | boolean | `false` |
| Riffle | `labels` | up to 8 strings | none |
| Terrain | `radius` | 1.5–5 cells | 3 |
| Exploded | `gap` | 12–40 | 28 |
| Phosphor | `afterglow` | 150–1500 ms | 520 |
| Slow | `rate` | 0.05–0.6 | 0.2 |
| Turntable | `coast` | 200–1500 ms | 650 |

A number outside its range is clamped.

**Theme**
- Six custom properties: `--hairline-plate`, `--hairline-hi`, `--hairline-edge`, `--hairline-mid`, `--hairline-lo`, `--hairline-stroke`.

  | | plate | hi | edge | mid | lo | stroke |
  | --- | --- | --- | --- | --- | --- | --- |
  | Light | `#ffffff` | `#232327` | `#a4a4ac` | `#c3c3c9` | `#e0e0e4` | `0.9` |
  | Dark | `#08090a` | `#d0d6e0` | `#5b5d64` | `#3e3e44` | `#29292d` | `0.9` |

- The palette is chosen in this order, first match wins:
  1. The `theme` option.
  2. An ancestor with class `dark` or `data-theme="dark"`.
  3. The page's `color-scheme`, through `light-dark()`.
  4. Light.
- Every selector is wrapped in `:where()`. Styles are injected through `adoptedStyleSheets`, with a `<style>` element as the fallback.

**Public API (semver)**
- The exports of both entries, the six custom properties, and the `data-hairline` and `data-hairline-theme` attributes.

**Sources and naming**
- Port from the website's `main` at `edfebe9`. `lucasmarkes.com/lab/hairline` is not changed.
- Repository: `lucasmarkes/hairline`. Site: `hairline.lucasmarkes.com`. Vercel project: `hairline`, in the same team as motes (`lucasmarkes-team-projects`), with root directory `apps/site`.

**Process**
- **confirm** marks a step that is public or hard to undo. Stop and wait for Lucas before running it. Lucas creates the npm token himself.
- Every commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.

**Repository and tools**
- The repository is `~/estudos/hairline`. It already holds the spec (`cf059dc`) on `main`. Tasks commit on `main`: the repository is new and private until Task 16.
- Tools: Node 22, pnpm 10.20.0 through Corepack (`corepack enable`), Google Chrome installed (Playwright uses `channel: "chrome"`), `gh` and `vercel` logged in, and `ffmpeg` (used in Task 9 only).

## Review Focus

These are the inputs most likely to break a figure for someone using it. The spec implies them but does not test them. Each line names the test that pins it and the task that owns that test.

1. **The host element already has `role`, `aria-label`, `tabindex` or `aria-labelledby`.** The mount never overwrites them, never names an element that `aria-labelledby` names, drops its own name when `aria-labelledby` appears later, and restores nothing it did not set. Task 6, `mount.test.ts`, the tests "leaves the host's own attributes alone, at mount and at destroy", "does not name an element that aria-labelledby already names" and "drops its own name when the element gains aria-labelledby".
2. **The consumer's `onRead` throws.** The error is reported as uncaught, and every figure on the page keeps running, because they share one frame loop. Task 6, `mount.test.ts`, "reports an onRead that throws and keeps every figure running".
3. **A handle is used after its figure is gone.** This covers `update` after `destroy`, `destroy` twice, and an old handle after a second figure took the element. Each is a no-op that never touches the new figure. Task 6, `mount.test.ts`, the "teardown" block.
4. **React props that are new on every render.** An inline `onRead`, an inline `labels` array, or a state setter called from `onRead` must cause no remount and no render loop. Task 8, `react.test.tsx`, "does not remount, and does not loop, on an inline onRead and inline labels" and "calls a state setter from onRead without looping".
5. **A figure mounted inside a shadow root, or on an element not yet in the document.** The stylesheet lands in the shadow root and nowhere else. A detached element is drawn and styled once it is attached. Task 7, `figures.spec.ts`, "a figure in a shadow root is styled there, and only there" and "a figure mounted on a detached element is drawn and styled once attached".

## Phases and tasks

| Spec phase | Tasks | Exit criterion, and where it is met |
| --- | --- | --- |
| 0 Repository, tooling, CI | 1, 2 | Build, typecheck and test pass on an empty package, locally (Task 1) and in CI (Task 2). |
| 1 Goldens, port | 3, 4 | Parity for six figures: Task 7. |
| 2 Public API | 5–8 | Layers 2–5: Tasks 4–8. |
| 3 Gates, consumer fixtures | 9–11 | `release --static` (Task 9) and layer 6 locally (Task 11). |
| 4 Site, Vercel | 12–14 | Lucas reviews a Vercel preview (Task 14). |
| 5 Registry, llms.txt, docs | 1, 9, 10–12, 15 | The registry JSON validates (Task 10), and the item builds in `fixtures/next-app` (Task 11). |
| 6 Launch | 15, 16 | The launch checklist is complete (Task 16). |

### Deviations from the spec

- **Parity is checked in Task 7, not right after the port (Task 4).** The parity test mounts each figure through the public `mount` layer (Tasks 5–6) and serves the package through the browser harness (Task 7). Writing a throwaway harness only to check parity two tasks early would test code that is then deleted. Task 4 is gated by the geometry tests and the typecheck instead.
- **The capture script lives at `packages/hairline/test/parity/capture.mjs`,** next to the clock, the driver and the scripts it shares with the parity test. The spec puts it at `scripts/capture-golden.mjs`. Run it with `pnpm -C packages/hairline capture <commit>`.
- **Some phase 5 items move earlier.** The registry item (Task 10) comes before the site, because the site's build and the Next.js fixture both use it. LICENSE is written in Task 1, and README and CONTRIBUTING in Task 9 (the release gate checks the README).
- **Files the spec does not name:**
  - `scripts/consumers.mjs` (layer 6, and called by the release gate).
  - `.github/workflows/consumers.yml` (layer 6 on pull requests that touch what ships).
  - `scripts/changelog.mjs` (the GitHub Release notes).
  - `registry/validate.mjs` (the shadcn schema check).

### Trade-offs, recorded here so a reviewer does not reopen them

- **The React `<div>` carries `aspect-ratio: 5 / 4` inline.** A `style` prop overrides it; a class cannot. The README says so.
- **`react.d.ts` inlines the option types** instead of importing them from the core entry. tsup's declaration build does this, and `attw` accepts it.
- **The theme editor's presets on the site copy the package's palettes by hand.** The palettes are not public API.
- **The site is light only.** It shows dark figures inside the theme editor.

## File map

```
package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .npmrc, .gitignore   T1
LICENSE, README.md (stub T1, real T9), CONTRIBUTING.md T9, CHANGELOG.md T15, assets/hero.gif T9
.github/workflows/ci.yml          T1, extended in T7 and T9
.github/workflows/consumers.yml   T11
.github/workflows/publish.yml     T15
packages/hairline/
  package.json, tsconfig.json, tsup.config.ts, vitest.config.ts       T1 (test script T4, tsup final T8)
  src/core/iso.ts, motion.ts       T4: the engines' maths and springs (copied)
  src/core/stage.ts                T4: svg helpers, frame loop, pointer (copied + patch)
  src/figures/*.ts                 T4: six engines, two geometry modules (copied, riffle patched)
  src/ranges.ts                    T5: option bounds and the clamp
  src/core/styles.ts               T6: the stylesheet and its injection
  src/mount.ts                     T6: create/update/destroy around any engine
  src/index.ts                     T6: entry ".": six functions and the option types
  src/react.tsx                    T8: entry "./react": six components
  test/parity/                     T3: clock.js, driver.mjs, scripts.mjs, capture.mjs, golden/*.json
  test/geometry.test.ts            T4      test/ranges.test.ts      T5
  test/dom.ts, test/mount.test.ts  T6      test/react.test.tsx, ssr.test.tsx, types.test-d.tsx   T8
  test/browser/                    T7: serve.mjs, harness.html, entry.ts, parity/figures/theme specs
  playwright.config.ts             T7
scripts/release.mjs T9   scripts/base-url.mjs T10   scripts/consumers.mjs T11   scripts/og.mjs T13   scripts/changelog.mjs T15
registry/src/hairline.tsx, registry/build.mjs, registry/validate.mjs   T10
fixtures/next-app/, fixtures/vite-vanilla/   T11
apps/site/   T12 (the page), T13 (/og and public/og.png), T14 (Vercel)
```

---

### Task 1: Scaffold the monorepo and an empty package

**Files:**
- Create: `.gitignore`, `.npmrc`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `turbo.json`, `package.json`, `LICENSE`, `README.md` (stub), `.github/workflows/ci.yml`
- Create: `packages/hairline/package.json`, `packages/hairline/tsconfig.json`, `packages/hairline/tsup.config.ts`, `packages/hairline/vitest.config.ts`, `packages/hairline/src/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Root scripts: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:browser`, `pnpm release` (the script arrives in Task 9).
  - Package scripts: `build`, `typecheck`, `test`, `test:browser`, `capture`, `prepack`, `size`.
  - All of the package's devDependencies are installed now, so no later task changes the lockfile until Task 10 (ajv) and Task 12 (the site).

This task has no behaviour to test first. Its test is that the three commands below pass on an empty package. That is the spec's phase 0 exit criterion.

- [ ] **Step 1: Write the root files**

`.gitignore`
```text
node_modules/
dist/
.turbo/
.next/
.vercel
*.tsbuildinfo
.DS_Store
.env*
coverage/
test-results/
playwright-report/

# Agent scratch
.claude/

# Copied in from the root by the package's prepack
packages/hairline/README.md
packages/hairline/LICENSE
```

`.npmrc`
```text
strict-peer-dependencies=false
auto-install-peers=true
```

`pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
  - 'apps/*'

# esbuild ships a platform binary via postinstall; tsup needs it.
onlyBuiltDependencies:
  - esbuild
```

`tsconfig.base.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

`turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "agentGuidance": false,
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:browser": {
      "dependsOn": ["build"],
      "cache": false
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

`ajv` joins the root devDependencies in Task 10.

`package.json`
```json
{
  "name": "hairline-monorepo",
  "version": "0.0.0",
  "private": true,
  "description": "Six isometric line figures that answer the pointer",
  "packageManager": "pnpm@10.20.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:browser": "turbo run test:browser",
    "clean": "turbo run clean",
    "release": "node scripts/release.mjs"
  },
  "devDependencies": {
    "turbo": "^2.10.5",
    "typescript": "5.9.3"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lucasmarkes/hairline.git"
  },
  "bugs": {
    "url": "https://github.com/lucasmarkes/hairline/issues"
  },
  "homepage": "https://hairline.lucasmarkes.com"
}
```

`LICENSE`
```text
MIT License

Copyright (c) 2026 Lucas Marques

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The real README replaces this one in Task 9:

`README.md`
```markdown
# hairline

Six isometric line figures that answer the pointer. For React and for anything with a DOM.
```

- [ ] **Step 2: Write the package's files**

The test script carries `--passWithNoTests` until the first test exists (Task 4). Everything else in this manifest is final until the version bump in Task 15. The `size-limit` budgets are the first green build's sizes plus 10%, as the spec asks; Task 9 checks them.

`packages/hairline/package.json`
```json
{
  "name": "@lucasmarkes/hairline",
  "version": "0.0.0",
  "description": "Six isometric line figures that answer the pointer. For React and for anything with a DOM.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "keywords": [
    "svg",
    "isometric",
    "illustration",
    "interactive",
    "pointer",
    "animation",
    "react"
  ],
  "files": [
    "dist"
  ],
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "default": "./dist/react.js"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "rm -rf dist && tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "clean": "rm -rf dist .turbo",
    "test:browser": "playwright test",
    "capture": "node test/parity/capture.mjs",
    "prepack": "cp ../../README.md ../../LICENSE .",
    "lint:package": "publint --strict && attw --pack . --profile esm-only",
    "size": "size-limit"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lucasmarkes/hairline.git",
    "directory": "packages/hairline"
  },
  "bugs": {
    "url": "https://github.com/lucasmarkes/hairline/issues"
  },
  "homepage": "https://hairline.lucasmarkes.com",
  "devDependencies": {
    "@arethetypeswrong/cli": "0.18.5",
    "@playwright/test": "1.63.0",
    "@size-limit/preset-small-lib": "14.1.0",
    "@testing-library/react": "^16.3.3",
    "@types/node": "^22.20.4",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "esbuild": "0.28.2",
    "jsdom": "^30.1.1",
    "publint": "0.3.24",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "size-limit": "14.1.0",
    "tsup": "^8.5.1",
    "typescript": "5.9.3",
    "vitest": "^5.0.3"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  },
  "size-limit": [
    {
      "name": "vanilla, all six figures",
      "path": "dist/index.js",
      "limit": "12.8 kB"
    },
    {
      "name": "vanilla, one figure",
      "path": "dist/index.js",
      "import": "{ terrain }",
      "limit": "5.4 kB"
    },
    {
      "name": "react, all six components",
      "path": "dist/react.js",
      "limit": "13.2 kB",
      "ignore": [
        "react",
        "react/jsx-runtime"
      ]
    }
  ]
}
```

`packages/hairline/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "react-jsx",
    "allowJs": true,
    "checkJs": false
  },
  "include": [
    "src",
    "test",
    "*.ts"
  ]
}
```

`packages/hairline/vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
```

One entry for now. Task 8 adds the React entry.

`packages/hairline/tsup.config.ts`
```ts
import { defineConfig } from "tsup";

export default defineConfig([{ format: ["esm"], target: "es2020", dts: true, sourcemap: true, entry: ["src/index.ts"] }]);
```

`packages/hairline/src/index.ts`
```ts
export {};
```

- [ ] **Step 3: Write CI**

This is CI without the browser tests (added in Task 7) and the static release gate (added in Task 9):

`.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

# A newer push to the same branch or PR cancels the run in flight.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # Corepack activates the pnpm pinned in package.json's packageManager.
      - name: Enable Corepack
        run: corepack enable

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit and component tests
        run: pnpm test

```

- [ ] **Step 4: Install, and run the phase 0 gate**

Run:
```bash
cd ~/estudos/hairline
corepack enable
pnpm install
pnpm build && pnpm typecheck && pnpm test
```
Expected:
- `pnpm install` writes `pnpm-lock.yaml` and builds esbuild's binary, the only dependency allowed to run a build script.
- `pnpm build` writes `packages/hairline/dist/index.js` and `index.d.ts`.
- `pnpm typecheck` passes.
- `pnpm test` prints "No test files found, exiting with code 0".

All three exit 0.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .npmrc pnpm-workspace.yaml tsconfig.base.json turbo.json package.json pnpm-lock.yaml LICENSE README.md .github packages
git commit -m "Scaffold: pnpm and Turborepo workspace with an empty @lucasmarkes/hairline

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2: Create the private GitHub repository and get CI green

**Files:** none.

**Interfaces:**
- Consumes: the commit from Task 1.
- Produces: a private repository, `lucasmarkes/hairline`, with `origin` set up. CI runs on every push to `main` and on every pull request. Task 14 (Vercel) and Task 15 (`publish.yml`) rely on it.

- [ ] **Step 1: Check the GitHub account**

Run: `gh auth status`
Expected: logged in to github.com as `lucasmarkes`. If not, stop and ask Lucas to run `! gh auth login`.

- [ ] **Step 2: Create the repository (confirm)**

**confirm:** this creates a repository on GitHub. It is private, but it is still an outside action. Ask Lucas before running it.

```bash
cd ~/estudos/hairline
gh repo create lucasmarkes/hairline --private --source . --remote origin --push \
  --description "Six isometric line figures that answer the pointer. For React and for anything with a DOM."
```
Expected: the repository is created, `origin` is added, and `main` is pushed with both commits (the spec and Task 1).

- [ ] **Step 3: Watch the first CI run**

Run: `gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"`
Expected: the `verify` job passes Install, Build, Typecheck and "Unit and component tests". This is the spec's phase 0 exit criterion, in CI.

If Install fails with `ERR_PNPM_OUTDATED_LOCKFILE`, the lockfile was not committed. Commit it and push.

No commit: nothing in the working tree changes.

### Task 3: Capture the goldens from the website, before any engine moves

**Files:**
- Create: `packages/hairline/test/parity/clock.js`, `driver.mjs`, `scripts.mjs`, `capture.mjs`
- Create (generated, committed): `packages/hairline/test/parity/golden/{riffle,terrain,exploded,phosphor,slow,turntable}.json`

**Interfaces:**
- Consumes: the package's devDependencies (`@playwright/test`) from Task 1. It also needs the website repository at `~/estudos/lucasmarkes.com/website`, which holds commit `edfebe9`.
- Produces, for the parity test in Task 7:
  - `clock.js`: defines `window.__freeze(at?)`, `window.__advance(ms)` and `window.__realTimeout`. The virtual clock, added as an init script.
  - `driver.mjs`:
    - `FRAME` (`1000 / 60`).
    - `normalise(svg: string): string`: numbers mask and gradient ids by first appearance.
    - `play(page, target: { stage: Locator; snap(): Promise<{ svg: string; read: string }>; set(): Promise<void> }, steps): Promise<Array<{ at: string; read: string; svg: string }>>`.
  - `scripts.mjs`:
    - `FIGURES`: the six ids, in page order.
    - `OPTION`: `Record<id, [optionName, scriptValue]>`.
    - `SCRIPTS`: `Record<id, Step[]>`, where a step is one of `{adv}`, `{move:[x,y]}`, `{out}`, `{focus}`, `{key}`, `{set}` or `{cp}`.
  - `golden/<id>.json`: `{ source: { site, commit }, viewport, option, checkpoints: [{ at, read, svg }] }`.

The goldens are the test. Every later change to an engine must reproduce them. They are taken from a production build of the website at `edfebe9`, exported to a temporary directory so that nothing in the website's working copy changes. `capture.mjs` captures each figure twice and fails if the two captures differ. That makes the run a determinism test of the clock and the scripts.

- [ ] **Step 1: Write the virtual clock, the driver and the scripts**

`packages/hairline/test/parity/clock.js`
```js
/**
 * A virtual clock for tests. Add it to a page with context.addInitScript,
 * before any of the page's own scripts.
 *
 * Live until window.__freeze(at): nothing changes in behaviour. From the
 * freeze on, performance.now() reads `at` and time moves only when
 * window.__advance(ms) is called: due timers fire in order, the rAF queue is
 * flushed with the new timestamp, and every animation in the document, CSS
 * transitions included, is paused and seeked to where the virtual clock says
 * it is. Same calls, same drawing.
 */
(() => {
  const realNow = performance.now.bind(performance);
  const realDateNow = Date.now;
  const realRAF = window.requestAnimationFrame.bind(window);
  const realCAF = window.cancelAnimationFrame.bind(window);
  const realST = window.setTimeout.bind(window);
  const realCT = window.clearTimeout.bind(window);
  const realSI = window.setInterval.bind(window);
  const realCI = window.clearInterval.bind(window);

  let frozen = false;
  let now = 0;
  let dateOffset = 0;
  let seq = 1e9; // virtual ids never collide with the browser's
  let rafs = new Map();
  const timers = new Map();
  const started = new WeakMap();
  const rethrow = (e) => queueMicrotask(() => { throw e; });

  performance.now = () => (frozen ? now : realNow());
  Date.now = () => (frozen ? Math.round(now + dateOffset) : realDateNow());

  window.requestAnimationFrame = (cb) => {
    if (!frozen) return realRAF(cb);
    const id = ++seq; rafs.set(id, cb); return id;
  };
  window.cancelAnimationFrame = (id) => { if (!rafs.delete(id)) realCAF(id); };
  window.setTimeout = (cb, ms = 0, ...args) => {
    if (!frozen) return realST(cb, ms, ...args);
    const id = ++seq; timers.set(id, { at: now + Math.max(0, ms), cb, args, every: 0 }); return id;
  };
  window.clearTimeout = (id) => { if (!timers.delete(id)) realCT(id); };
  window.setInterval = (cb, ms = 0, ...args) => {
    if (!frozen) return realSI(cb, ms, ...args);
    const every = Math.max(1, ms);
    const id = ++seq; timers.set(id, { at: now + every, cb, args, every }); return id;
  };
  window.clearInterval = (id) => { if (!timers.delete(id)) realCI(id); };

  function runTimers(until) {
    for (;;) {
      let next = null, nextId = 0;
      for (const [id, t] of timers) if (t.at <= until && (!next || t.at < next.at)) { next = t; nextId = id; }
      if (!next) return;
      now = next.at;
      if (next.every) next.at += next.every; else timers.delete(nextId);
      try { if (typeof next.cb === "function") next.cb(...next.args); } catch (e) { rethrow(e); }
    }
  }

  /* At the freeze, an animation keeps the time it has already played: an
     entrance that finished on the wall clock stays finished (fill keeps it
     listed). After it, one first seen starts now, whatever the wall clock ran
     it for in between: an input between two advances starts transitions live */
  function seekAnimations(keepPlayed) {
    for (const a of document.getAnimations()) {
      if (!started.has(a)) { started.set(a, now - (keepPlayed ? Number(a.currentTime) || 0 : 0)); a.pause(); }
      const t = now - started.get(a);
      const end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (Number.isFinite(end) && t >= end) { a.finish(); continue; }
      a.currentTime = t;
    }
  }

  window.__realTimeout = realST;
  window.__now = () => (frozen ? now : realNow());
  window.__freeze = (at) => {
    if (frozen) return;
    now = at ?? realNow();
    dateOffset = realDateNow() - now;
    frozen = true;
    seekAnimations(true);
  };
  window.__advance = (ms) => {
    if (!frozen) throw new Error("__advance before __freeze");
    const target = now + Math.max(0, ms);
    runTimers(target);
    now = target;
    const due = rafs; rafs = new Map();
    for (const cb of due.values()) { try { cb(now); } catch (e) { rethrow(e); } }
    seekAnimations(false);
    return now;
  };
})();
```

`packages/hairline/test/parity/driver.mjs`
```js
/**
 * Plays a script against a figure, whoever is hosting it. `target` is the
 * host's side of it:
 *   stage  the element the pointer acts on (a Playwright Locator)
 *   snap() the svg's markup and the caption, read from the page
 *   set()  changes the figure's option to the script's value
 * Time only moves here, through window.__advance (clock.js).
 *
 * The pointer is dispatched, not a real mouse: a real one reports whole
 * pixels, so the same viewBox point would land differently on stages of
 * different widths. A dispatched event carries the exact point.
 */
export const FRAME = 1000 / 60;

/** Mask and gradient ids count up per page; number them by first appearance instead. */
export function normalise(svg) {
  const seen = new Map();
  return svg.replace(/hl-fd\d+/g, (id) => {
    if (!seen.has(id)) seen.set(id, `fd${seen.size + 1}`);
    return seen.get(id);
  });
}

const fire = (stage, type, pt) => stage.evaluate((el, [type, pt]) => {
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent(type, {
    pointerType: "mouse", pointerId: 1, bubbles: type !== "pointerleave",
    clientX: pt ? r.left + (pt[0] / 400) * r.width : r.left - 40,
    clientY: pt ? r.top + (pt[1] / 320) * r.height : r.top - 40,
  }));
}, [type, pt]);

export async function play(page, target, steps) {
  const out = [];
  for (const s of steps) {
    if (s.adv) await page.evaluate(([n, f]) => { for (let i = 0; i < n; i++) window.__advance(f); }, [s.adv, FRAME]);
    else if (s.move) await fire(target.stage, "pointermove", s.move);
    else if (s.out) await fire(target.stage, "pointerleave", null);
    else if (s.focus) await target.stage.focus();
    else if (s.key) await page.keyboard.press(s.key);
    else if (s.set) await target.set();
    else if (s.cp) { const { svg, read } = await target.snap(); out.push({ at: s.cp, read, svg: normalise(svg) }); }
    else throw new Error(`unknown step ${JSON.stringify(s)}`);
  }
  return out;
}
```

`packages/hairline/test/parity/scripts.mjs`
```js
/**
 * The pointer script each figure is put through, on the site (to capture the
 * goldens) and on the package (to compare). Points are in the figure's own
 * viewBox (400 × 320). `adv` is a count of 60 Hz frames on the virtual clock.
 */
export const FIGURES = ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"];

/** The option each figure has, and the value the script changes it to. */
export const OPTION = {
  riffle: ["stagger", 60], terrain: ["radius", 4], exploded: ["gap", 36],
  phosphor: ["afterglow", 900], slow: ["rate", 0.4], turntable: ["coast", 1000],
};

export const SCRIPTS = {
  riffle: [
    { adv: 30 }, { cp: "rest" },
    { move: [150, 120] }, { adv: 60 }, { cp: "pulled" },
    { set: true }, { move: [200, 100] }, { adv: 20 }, { cp: "stagger in flight" },
    { out: true }, { adv: 150 }, { cp: "left" },
    { focus: true }, { key: "ArrowLeft" }, { adv: 60 }, { cp: "arrow" },
    { key: "ArrowRight" }, { adv: 60 }, { cp: "arrow back" },
    { key: "Escape" }, { adv: 120 }, { cp: "escape" },
  ],
  terrain: [
    { adv: 30 }, { cp: "rest" },
    { move: [200, 160] }, { adv: 40 }, { cp: "raised" },
    { set: true }, { adv: 30 }, { cp: "wider" },
    { move: [150, 200] }, { adv: 10 }, { cp: "moving" },
    { out: true }, { adv: 150 }, { cp: "left" },
  ],
  exploded: [
    { adv: 30 }, { cp: "rest" },
    { move: [100, 80] }, { adv: 40 }, { cp: "opening" },
    { move: [180, 60] }, { adv: 40 }, { cp: "pick high" },
    { move: [180, 120] }, { adv: 40 }, { cp: "pick middle" },
    { move: [180, 190] }, { adv: 40 }, { cp: "pick low" },
    { set: true }, { adv: 40 }, { cp: "wider" },
    { out: true }, { adv: 150 }, { cp: "left" },
  ],
  phosphor: [
    { adv: 30 }, { cp: "loop" },
    { move: [240, 140] }, { adv: 2 }, { move: [260, 145] }, { adv: 2 }, { move: [280, 150] }, { adv: 20 }, { cp: "painted" },
    { set: true }, { out: true }, { adv: 30 }, { cp: "afterglow" },
    { adv: 240 }, { cp: "loop again" },
  ],
  slow: [
    { adv: 30 }, { cp: "rest" },
    { move: [200, 160] }, { adv: 60 }, { cp: "slowed" },
    { set: true }, { adv: 60 }, { cp: "less slow" },
    { out: true }, { adv: 150 }, { cp: "left" },
  ],
  turntable: [
    { adv: 30 }, { cp: "rest" },
    { move: [50, 176] }, { adv: 1 }, { move: [120, 176] }, { adv: 1 }, { move: [200, 176] }, { adv: 1 },
    { move: [280, 176] }, { adv: 1 }, { move: [350, 176] }, { adv: 6 }, { cp: "spinning" },
    { set: true }, { out: true }, { adv: 60 }, { cp: "coasting" },
    { adv: 360 }, { cp: "seated" },
  ],
};
```

- [ ] **Step 2: Write the capture script**

`packages/hairline/test/parity/capture.mjs`
```js
/**
 * Captures the goldens: what the six figures draw on lucasmarkes.com/lab/hairline,
 * checkpoint by checkpoint, under the scripts in scripts.mjs. The package's
 * parity test (test/browser/parity.spec.ts) must draw the same.
 *
 *   node test/parity/capture.mjs <commit> [url]
 *
 * <commit> is the website commit being served, recorded in each golden.
 * [url] is where a production build of it is running (default http://localhost:3124).
 * Every figure is captured twice, and a difference between the two is an error.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { play } from "./driver.mjs";
import { FIGURES, OPTION, SCRIPTS } from "./scripts.mjs";

const [commit, base = "http://localhost:3124"] = process.argv.slice(2);
if (!commit) { console.error("usage: node test/parity/capture.mjs <commit> [url]"); process.exit(1); }

const here = (p) => new URL(p, import.meta.url);
const clock = readFileSync(here("./clock.js"), "utf8") + "\nwindow.__freeze(1000);";
const VIEWPORT = { width: 1200, height: 900 };

async function capture(browser, id) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "no-preference" });
  await context.addInitScript(clock);
  const page = await context.newPage();
  await page.goto(`${base}/lab/hairline`);
  if (await page.locator("nextjs-portal").count()) throw new Error("This is the dev server. Capture against a production build (pnpm build && pnpm start).");
  const figure = page.locator("figure.hairline").nth(FIGURES.indexOf(id)), stage = figure.locator(".hl-stage");
  await stage.locator("svg.fg > *").first().waitFor();
  await stage.evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: "instant" });
  });
  await page.evaluate(() => new Promise((done) => window.__realTimeout(done, 500)));
  const input = figure.locator("input[type=range]"), value = OPTION[id][1];
  const checkpoints = await play(page, {
    stage,
    snap: () => stage.evaluate((el) => ({ svg: el.querySelector("svg").innerHTML, read: el.querySelector(".hl-read").textContent })),
    /* the slider is React's: set it the way a user's drag would, then give React real time to render */
    set: async () => {
      await input.evaluate((el, v) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
      await page.waitForFunction(([el, v]) => Number(el.value) === v, [await input.elementHandle(), value]);
      await page.evaluate(() => new Promise((done) => window.__realTimeout(done, 150)));
    },
  }, SCRIPTS[id]);
  await context.close();
  return checkpoints;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
mkdirSync(here("./golden/"), { recursive: true });
let failed = false;
for (const id of FIGURES) {
  const first = await capture(browser, id), second = await capture(browser, id);
  if (JSON.stringify(first) !== JSON.stringify(second)) { console.error(`✗ ${id}: two captures differ; the golden would not be reproducible`); failed = true; continue; }
  const golden = { source: { site: "lucasmarkes.com/lab/hairline", commit }, viewport: VIEWPORT, option: OPTION[id], checkpoints: first };
  writeFileSync(here(`./golden/${id}.json`), JSON.stringify(golden, null, 1) + "\n");
  console.log(`✓ ${id}: ${first.map((c) => `${c.at} "${c.read}"`).join(" · ")}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run it with nothing to capture, and see it fail**

Run: `pnpm -C packages/hairline capture edfebe9`
Expected: FAIL. `page.goto` throws `net::ERR_CONNECTION_REFUSED at http://localhost:3124/lab/hairline`, because the website is not running yet.

- [ ] **Step 4: Export the website at `edfebe9`, build it and serve it on port 3124**

```bash
rm -rf /tmp/hairline-website && mkdir /tmp/hairline-website
git -C ~/estudos/lucasmarkes.com/website archive edfebe9 | tar -x -C /tmp/hairline-website
cd /tmp/hairline-website
pnpm install --frozen-lockfile
pnpm build
pnpm start -p 3124
```
Leave `pnpm start` running in a second terminal, or in the background. Expected: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3124/lab/hairline` prints `200`.

- [ ] **Step 5: Capture**

Run: `pnpm -C ~/estudos/hairline/packages/hairline capture edfebe9`

Expected: six lines and exit 0:
```
✓ riffle: rest "…" · pulled "…" · …
✓ terrain: rest "…" · raised "…" · …
✓ exploded: …
✓ phosphor: …
✓ slow: …
✓ turntable: …
```

A `✗ <id>: two captures differ` line means the capture is not reproducible. Do not commit. Stop and report which figure failed.

- [ ] **Step 6: Check what was written**

Run:
```bash
cd ~/estudos/hairline/packages/hairline
node -e '
const { FIGURES, SCRIPTS } = await import("./test/parity/scripts.mjs");
const fs = await import("node:fs");
for (const id of FIGURES) {
  const g = JSON.parse(fs.readFileSync(`test/parity/golden/${id}.json`, "utf8"));
  const want = SCRIPTS[id].filter((s) => s.cp).length;
  if (g.source.commit !== "edfebe9" || g.checkpoints.length !== want || g.checkpoints.some((c) => !c.svg.includes("<path"))) throw new Error(id);
  console.log(id, g.checkpoints.length, "checkpoints");
}' --input-type=module
```
Expected: each of the six figures is printed with its checkpoint count, and nothing throws.

- [ ] **Step 7: Stop the website and commit**

Stop `pnpm start`. Then run `rm -rf /tmp/hairline-website`.

```bash
cd ~/estudos/hairline
git add packages/hairline/test/parity
git commit -m "Parity: goldens of the six figures, captured from lucasmarkes.com at edfebe9

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 4: Port the engines

**Files:**
- Create (copied from the website at `edfebe9`): `packages/hairline/src/core/iso.ts`, `src/core/motion.ts`, `src/core/stage.ts`, and in `src/figures/`: `riffle.ts`, `terrain.ts`, `exploded.ts`, `phosphor.ts`, `slow.ts`, `turntable.ts`, `riffle-geometry.ts`, `turntable-geometry.ts`
- Modify (by patch): `src/core/stage.ts`, `src/figures/riffle-geometry.ts`, `src/figures/riffle.ts`
- Modify: `packages/hairline/package.json` (the test script)
- Test: `packages/hairline/test/geometry.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks. The goldens from Task 3 judge this task's output in Task 7.
- Produces, used by Tasks 5–8:
  - From `src/core/stage.ts`:
    - `type Readout = { textContent: string | null }`. An engine writes its caption here and touches nothing else on it.
    - `type FigureEls = { stage: HTMLElement; svg: SVGSVGElement; read: Readout }`
    - `type FigureHandle = { set(value: number): void; destroy(): void }`
    - `type FigureMount = (els: FigureEls, value: number) => FigureHandle`
    - `register(stage: Element, tick: Tick): Loop`, `pointer(stage: HTMLElement, on: PointerHandlers): () => void` and `disposer(): Disposer`. These are the engines' plumbing; nothing above the engines calls them.
  - Each `src/figures/<id>.ts` exports `mount`:
    - Terrain, Exploded, Phosphor, Slow and Turntable export `mount: FigureMount`.
    - Riffle exports `mount(els: FigureEls, value: number): RiffleHandle`, where `type RiffleHandle = FigureHandle & { bands(on: boolean): void; labels(list: readonly string[]): void }`.
  - Engines are imported only by `src/index.ts` (Task 6). Each takes its one number already clamped.

The engines move as they are. Only three things change:
- The website's `@/` imports become relative.
- Riffle loses its "hit bands" button. The figure draws only the drawing; `bands` and `labels` become methods instead.
- `stage.ts` accepts any `{ textContent }` as the caption sink, so the public layer can catch each caption without an element.

Everything else is copied, so the comments that mention "the study" and "Fig 9.n" stay. CONTRIBUTING (Task 9) explains them.

- [ ] **Step 1: Write the failing test**

These are the website's five geometry tests (`tests/hairline-geometry.spec.ts`), ported to Vitest.

`packages/hairline/test/geometry.test.ts`
```ts
import { expect, test } from "vitest";
import { Cam, fit, proj, rad, unproj } from "../src/core/iso";
import { BLK, DETENT, HOME, detent, paintOrder } from "../src/figures/turntable-geometry";

/**
 * The parts of Hairline that can be checked without a browser. The painter's
 * order is the one that can go wrong somewhere in a full turn and look right
 * everywhere else, so it is swept all the way round at the three elevations
 * the turntable reaches (20° to 40°, resting at 30°).
 */
const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

test("turntable order is a full permutation with no forced pick, all the way round", () => {
  for (const el of [20, 30, 40]) {
    const k = Math.sin(rad(el));
    for (let az = 0; az <= 360; az += 0.5) {
      const { order, forced } = paintOrder(BLK, Math.sin(rad(az)), Math.cos(rad(az)), k);
      expect(forced, `cycle at az ${az} el ${el}`).toBe(0);
      expect(order.slice().sort((a, b) => a - b)).toEqual(BLK.map((_, i) => i));
    }
  }
});

test("a stacked column paints bottom first", () => {
  // blocks 0 and 1 are column 0, and 5 and 6 are column 4; lower first at every angle
  for (let az = 0; az < 360; az += 7.5) {
    const o = paintOrder(BLK, Math.sin(rad(az)), Math.cos(rad(az)), 0.5).order;
    expect(o.indexOf(0)).toBeLessThan(o.indexOf(1));
    expect(o.indexOf(5)).toBeLessThan(o.indexOf(6));
  }
});

test("detent seats on the nearest quarter turn from HOME", () => {
  expect(HOME).toBe(45);
  expect(DETENT).toBe(90);
  expect(detent(45)).toBe(45);
  expect(detent(89)).toBe(45);
  expect(detent(91)).toBe(135);
  expect(detent(200)).toBe(225);
  expect(detent(-44)).toBe(-45);
  expect(detent(400)).toBe(405);
  for (let a = -720; a <= 720; a += 3.7) {
    const d = detent(a);
    expect(Math.abs(d - a)).toBeLessThanOrEqual(45);
    expect((((d - HOME) % 90) + 90) % 90).toBe(0);
  }
});

test("unproj inverts proj on the plane it is given", () => {
  for (const [az, k, S] of [[45, 0.5, 1.62], [0, 0.34, 2], [123, 0.64, 1.3], [-80, 0.5, 1.85]]) {
    const C = Cam(az, k, S);
    fit(C, [[0, 0, 0], [100, 80, 0], [0, 0, 40]], 200, 160);
    const P = proj(C);
    for (const [x, y, z] of [[0, 0, 0], [12.5, -40, 0], [80, 33, 17], [-20, 60, -9]]) {
      const [sx, sy] = P(x, y, z);
      const [ux, uy] = unproj(C, sx, sy, z);
      close(ux, x); close(uy, y);
    }
  }
});

test("fit centres the box it is given", () => {
  const C = Cam(45, 0.5, 1.58);
  const pts: [number, number, number][] = [[-6, -6, -5], [132, 132, -5], [132, -6, -5], [-6, 132, -5], [0, 0, 43.5]];
  fit(C, pts, 200, 166);
  const P = proj(C), xs = pts.map((p) => P(...p)[0]), ys = pts.map((p) => P(...p)[1]);
  close((Math.min(...xs) + Math.max(...xs)) / 2, 200);
  close((Math.min(...ys) + Math.max(...ys)) / 2, 166);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm -C packages/hairline exec vitest run test/geometry.test.ts`
Expected: FAIL with `Error: Cannot find module '../src/core/iso' imported from …/test/geometry.test.ts`.

- [ ] **Step 3: Copy the engines from the website at `edfebe9`, and make the imports relative**

```bash
cd ~/estudos/hairline/packages/hairline
W=/tmp/hairline-port && rm -rf $W && mkdir $W
git -C ~/estudos/lucasmarkes.com/website archive edfebe9 lib/hairline components/hairline | tar -x -C $W
mkdir -p src/core src/figures
cp $W/lib/hairline/iso.ts $W/lib/hairline/motion.ts $W/components/hairline/stage.ts src/core/
cp $W/lib/hairline/riffle-geometry.ts $W/lib/hairline/turntable-geometry.ts $W/components/hairline/figures/*.ts src/figures/
sed -i '' -e 's#"@/lib/hairline/iso"#"./iso"#' -e 's#"@/lib/hairline/motion"#"./motion"#' src/core/stage.ts
sed -i '' -e 's#"@/lib/hairline/iso"#"../core/iso"#' -e 's#"@/lib/hairline/motion"#"../core/motion"#' \
  -e 's#"@/components/hairline/stage"#"../core/stage"#' -e 's#"@/lib/hairline/riffle-geometry"#"./riffle-geometry"#' \
  -e 's#"@/lib/hairline/turntable-geometry"#"./turntable-geometry"#' src/figures/*.ts
rm -rf $W
ls src/core src/figures
```
Expected: `src/core` holds `iso.ts`, `motion.ts` and `stage.ts`. `src/figures` holds the six engines plus `riffle-geometry.ts` and `turntable-geometry.ts`. `grep -rn '"@/' src` prints nothing. (`sed -i ''` is the macOS form. On Linux, write `sed -i`.)

- [ ] **Step 4: Apply the port patch**

Save this as `port.patch` at the repository root:

`port.patch`
```diff
diff --git a/packages/hairline/src/core/stage.ts b/packages/hairline/src/core/stage.ts
--- a/packages/hairline/src/core/stage.ts
+++ b/packages/hairline/src/core/stage.ts
@@ -7,24 +7,24 @@
 /**
  * Hairline — the DOM side every figure shares: making svg nodes, the helpers
  * that write a solid or a dot into them, one frame loop for all six figures,
- * the pointer, and the only reduced-motion query. From the study's shared
- * section (design/lab-hairline/cartilha-v2.html).
+ * the pointer, and the only reduced-motion query.
  *
- * New here: everything comes apart. The study lives for one page load; the
- * site navigates away and back, and React's StrictMode mounts twice. So
- * `register` hands back an unregister, `pointer` a disposer, and `disposer()`
- * collects them so a figure's `destroy` is one call. Once the last figure is
- * unregistered no frame, observer or media listener is left behind, and the
- * next `register` starts them again.
+ * Everything comes apart. A page navigates away and back, and React's
+ * StrictMode mounts twice. So `register` hands back an unregister, `pointer`
+ * a disposer, and `disposer()` collects them so a figure's `destroy` is one
+ * call. Once the last figure is unregistered no frame, observer or media
+ * listener is left behind, and the next `register` starts them again.
  *
  * Nothing here touches `window` at import: the module is evaluated during
- * the server render too, so the loop, the observer and the media query are
+ * a server render too, so the loop, the observer and the media query are
  * created by the first `register`.
  */
 
 /* ---------- the contract ---------- */
 
-export type FigureEls = { stage: HTMLElement; svg: SVGSVGElement; read: HTMLElement };
+/** Where an engine writes its caption. Only `textContent` is ever touched, so it need not be an element. */
+export type Readout = { textContent: string | null };
+export type FigureEls = { stage: HTMLElement; svg: SVGSVGElement; read: Readout };
 export type FigureHandle = { set(value: number): void; destroy(): void };
 export type FigureMount = (els: FigureEls, value: number) => FigureHandle;
 
@@ -40,9 +40,6 @@
   if (parent) parent.appendChild(e);
   return e;
 }
-
-/** querySelector, typed. For elements the markup provides beside the three in FigureEls (Riffle's button). */
-export const $ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<E>(sel);
 
 /** A solid's two paths in one group: the silhouette (`.sil`) and its crease (`.nf.lo`). */
 export type Solid = { g: SVGGElement; sil: SVGPathElement; cr: SVGPathElement };
diff --git a/packages/hairline/src/figures/riffle-geometry.ts b/packages/hairline/src/figures/riffle-geometry.ts
--- a/packages/hairline/src/figures/riffle-geometry.ts
+++ b/packages/hairline/src/figures/riffle-geometry.ts
@@ -5,13 +5,10 @@
 
 /**
  * Riffle's drawing, with no DOM: the camera, the tray and a card in any pose,
- * as path strings. The engine (components/hairline/figures/riffle.ts) writes
- * these into its svg on every frame; the still on /lab
- * (components/hairline-still.tsx) renders them once, at rest, on the server.
- * One source, so the card on the index is the figure's own first frame.
+ * as path strings. The engine (riffle.ts) writes these into its svg on every
+ * frame.
  */
 
-export const NAMES = ["Radial menu", "Drum", "Dock", "Condense", "Settle", "Upload", "Badge", "Spark"];
 export const N = 8, W = 84, H = 54, G = 13, TW = 22, TH = 7, TABS = [6, 31, 56], TK = 1.4;
 export const REST = -12, BACK = -24, FWD = 20, LIFT = 16;
 export const X0 = -5, X1 = W + 5, Y0 = -9, Y1 = (N - 1) * G + 9, WH = 20, WR = 6, WT = 2.4;
diff --git a/packages/hairline/src/figures/riffle.ts b/packages/hairline/src/figures/riffle.ts
--- a/packages/hairline/src/figures/riffle.ts
+++ b/packages/hairline/src/figures/riffle.ts
@@ -1,27 +1,30 @@
 import { clamp, poly, rad, type Vec2 } from "../core/iso";
 import { tdone, tset, tval, tween, type Tween } from "../core/motion";
-import { BACK, FWD, G, H, LIFT, N, NAMES, REST, W, card, pose, scene, tray } from "./riffle-geometry";
-import { $, disposer, mk, place, pointer, reflect, register, type FigureMount } from "../core/stage";
+import { BACK, FWD, G, H, LIFT, N, REST, W, card, pose, scene, tray } from "./riffle-geometry";
+import { disposer, mk, place, pointer, reflect, register, type FigureEls, type FigureHandle } from "../core/stage";
 
 /**
- * Riffle (Fig 9.1) — a rounded tray holding the lab's eight experiments as
- * cards. The card under the pointer stands up and lifts; the ones in front
+ * Riffle (Fig 9.1) — a rounded tray holding eight cards. The card under the pointer stands up and lifts; the ones in front
  * lean forward and the ones behind lean back, staggered outwards from it on
  * the 700ms lift curve. A discrete figure, so every card runs on tweens.
  *
  * Selection never reads the posed cards: it comes from static oblique bands
  * along the resting top edges, so a card moving out from under the pointer
- * can't flip the choice back and forth. "hit bands" shows them. The stage is
- * a focusable group; the arrow keys walk the cards and the read-out, which is
- * aria-live, names the one pulled.
+ * can't flip the choice back and forth. `bands(true)` shows them. The stage
+ * is a focusable group; the arrow keys walk the cards and the read-out names
+ * the one pulled: its number, and its name when `labels` gave it one.
  *
  * The drawing itself — camera, tray, a card in any pose — is pure and lives in
- * lib/hairline/riffle-geometry.ts, which the still on /lab renders too; this
- * file is the DOM, the tweens and the input.
- *
- * From the study's `#riffle` (design/lab-hairline/cartilha-v2.html).
+ * riffle-geometry.ts; this file is the DOM, the tweens and the input.
  */
 
+export type RiffleHandle = FigureHandle & {
+  /** Shows or hides the hit bands. */
+  bands(on: boolean): void;
+  /** Names for the cards, card 01 first. A card without a name is read out by its number alone. */
+  labels(list: readonly string[]): void;
+};
+
 type Card = {
   n: number; t0: number; shape: Vec2[];
   back: SVGPathElement; face: SVGPathElement; head: SVGPathElement; rules: SVGPathElement;
@@ -30,10 +33,10 @@
   a: Tween; z: Tween;
 };
 
-export const mount: FigureMount = ({ stage, svg, read }, value) => {
+export const mount = ({ stage, svg, read }: FigureEls, value: number): RiffleHandle => {
   const bag = disposer();
-  const btn = $<HTMLButtonElement>(".hl-act", stage);
   let stag = value;
+  let names: readonly string[] = [];
 
   const { P, front, outer, inner } = scene();
   const paths = tray(P, front, outer, inner);
@@ -90,6 +93,11 @@
   bag.add(B.unregister);
 
   let act = -1;
+  const caption = (a: number) => {
+    if (a < 0) return "rest";
+    const n = N - a, name = names[n - 1];
+    return String(n).padStart(2, "0") + (name ? ` · ${name}` : "");
+  };
   /** Pulls card a (-1 puts them all back). The stagger spreads out from the card pulled, or the one let go. */
   function setActive(a: number) {
     if (a === act) return;
@@ -102,7 +110,7 @@
       cd.face.classList.toggle("hi", i === a); cd.head.classList.toggle("hi", i === a); cd.punch[cd.n - 1].classList.toggle("m", i !== a);
     });
     bands.forEach((b, i) => b.classList.toggle("on", i === a));
-    read.textContent = a >= 0 ? `${String(N - a).padStart(2, "0")} · ${NAMES[N - 1 - a]}` : "rest";
+    read.textContent = caption(a);
     B.wake();
   }
 
@@ -110,21 +118,16 @@
   bag.on(stage, "keydown", (e) => {
     if (e.key === "ArrowLeft" || e.key === "ArrowDown") { setActive(act < 0 ? N - 1 : Math.min(N - 1, act + 1)); e.preventDefault(); }
     else if (e.key === "ArrowRight" || e.key === "ArrowUp") { setActive(act < 0 ? N - 1 : Math.max(0, act - 1)); e.preventDefault(); }
-    // Escape puts a pulled card back and claims the key; at rest it passes on to
-    // the page's own Escape (components/escape-up.tsx), which leaves for /lab.
+    // Escape puts a pulled card back and claims the key; at rest it passes on to the page.
     else if (e.key === "Escape" && act >= 0) { setActive(-1); e.preventDefault(); }
   });
   bag.on(stage, "blur", () => setActive(-1));
-  if (btn) {
-    bag.on(btn, "click", () => {
-      const on = btn.getAttribute("aria-pressed") !== "true";
-      btn.setAttribute("aria-pressed", String(on));
-      bandG.classList.toggle("show", on);
-    });
-    // the button outlives the engine (it is React's), so a remount starts with the bands hidden
-    bag.add(() => btn.setAttribute("aria-pressed", "false"));
-  }
   bag.add(() => svg.replaceChildren());
 
-  return { set: (v) => { stag = v; }, destroy: bag.dispose };
+  return {
+    set: (v) => { stag = v; },
+    bands: (on) => { bandG.classList.toggle("show", on); },
+    labels: (list) => { names = list; if (act >= 0) read.textContent = caption(act); },
+    destroy: bag.dispose,
+  };
 };
```

Run:
```bash
cd ~/estudos/hairline
git apply --check port.patch && git apply port.patch && rm port.patch
```
Expected: no output. `git apply --check` fails loudly if a copied file differs from `edfebe9`. In that case, redo Step 3.

- [ ] **Step 5: Turn on the test script for real**

In `packages/hairline/package.json`, change
`"test": "vitest run --passWithNoTests",`
to
`"test": "vitest run",`

- [ ] **Step 6: Run the tests, the typecheck and the build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: `geometry.test.ts` reports 5 passed, the strict typecheck passes on every copied file, and the build passes. `src/index.ts` is still empty, so `dist` holds no engine yet.

- [ ] **Step 7: Commit**

```bash
git add packages/hairline/src packages/hairline/test/geometry.test.ts packages/hairline/package.json
git commit -m "Port: the six engines from lucasmarkes.com at edfebe9, with Riffle's button made methods

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 5: Option ranges and the clamp

**Files:**
- Create: `packages/hairline/src/ranges.ts`
- Test: `packages/hairline/test/ranges.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, used by `mount.ts` and `index.ts` (Task 6), the site (Task 12) and the README (Task 9):
  - `type Range = { readonly min: number; readonly max: number; readonly step: number; readonly default: number; readonly unit: string }`
  - `const ranges`, typed `as const` with this shape: `{ riffle: { stagger }, terrain: { radius }, exploded: { gap }, phosphor: { afterglow }, slow: { rate }, turntable: { coast } }`. Each value is a `Range`. The values are those in Global Constraints.
  - `number(value: unknown, range: Range): number`. A finite number is clamped and a numeric string is read; anything else becomes the default.

- [ ] **Step 1: Write the failing test**

`packages/hairline/test/ranges.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { number, ranges } from "../src/ranges";

const r = ranges.riffle.stagger; // 0 to 90, default 40

describe("number", () => {
  it("keeps a number inside the range", () => {
    expect(number(60, r)).toBe(60);
  });
  it("clamps to the range", () => {
    expect(number(-5, r)).toBe(0);
    expect(number(500, r)).toBe(90);
  });
  it("reads a numeric string, as an attribute or a form field would give it", () => {
    expect(number("60", r)).toBe(60);
    expect(number(" 500 ", r)).toBe(90);
  });
  it.each([undefined, null, NaN, Infinity, -Infinity, "", "  ", "fast", {}, [], true])("falls back to the default for %o", (v) => {
    expect(number(v, r)).toBe(40);
  });
});

describe("ranges", () => {
  it("has a default inside every range and a positive step", () => {
    for (const figure of Object.values(ranges)) {
      for (const range of Object.values(figure) as Array<(typeof ranges)["riffle"]["stagger"]>) {
        expect(range.min).toBeLessThan(range.max);
        expect(range.default).toBeGreaterThanOrEqual(range.min);
        expect(range.default).toBeLessThanOrEqual(range.max);
        expect(range.step).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm -C packages/hairline exec vitest run test/ranges.test.ts`
Expected: FAIL with `Error: Cannot find module '../src/ranges' imported from …/test/ranges.test.ts`.

- [ ] **Step 3: Write the implementation**

`packages/hairline/src/ranges.ts`
```ts
/** One numeric option: its bounds, the step a slider should move in, its default and its unit. */
export type Range = {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
  readonly unit: string;
};

/**
 * Every numeric option of every figure. A figure clamps what it is given to
 * `min`…`max` and falls back to `default`; `step` and `unit` are for whoever
 * builds a slider or a table from this.
 */
export const ranges = {
  riffle: { stagger: { min: 0, max: 90, step: 5, default: 40, unit: "ms" } },
  terrain: { radius: { min: 1.5, max: 5, step: 0.25, default: 3, unit: "cells" } },
  exploded: { gap: { min: 12, max: 40, step: 1, default: 28, unit: "u" } },
  phosphor: { afterglow: { min: 150, max: 1500, step: 10, default: 520, unit: "ms" } },
  slow: { rate: { min: 0.05, max: 0.6, step: 0.05, default: 0.2, unit: "×" } },
  turntable: { coast: { min: 200, max: 1500, step: 50, default: 650, unit: "ms" } },
} as const satisfies Record<string, Record<string, Range>>;

/** A number from anything: numeric strings are read, what is not a finite number becomes the default, the rest is clamped. */
export function number(value: unknown, range: Range): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return range.default;
  return Math.min(range.max, Math.max(range.min, n));
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm -C packages/hairline exec vitest run test/ranges.test.ts && pnpm typecheck`
Expected: 15 tests pass (four `it`s, and an `it.each` that expands to eleven), and the typecheck passes.

- [ ] **Step 5: Commit**

```bash
git add packages/hairline/src/ranges.ts packages/hairline/test/ranges.test.ts
git commit -m "API: option ranges, and a clamp that falls back to the default

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 6: The vanilla entry: styles, the mount and six functions

**Files:**
- Create: `packages/hairline/src/core/styles.ts`, `packages/hairline/src/mount.ts`
- Modify (replace the empty file): `packages/hairline/src/index.ts`
- Test: `packages/hairline/test/dom.ts` (a test helper), `packages/hairline/test/mount.test.ts`

**Interfaces:**
- Consumes:
  - From Task 4: `FigureEls`, `FigureHandle`, `Readout`, the six engines' `mount`, and `RiffleHandle.bands` / `.labels`.
  - From Task 5: `ranges`, `Range`, `number`.
- Produces:
  - `src/core/styles.ts`:
    - `css(lightDark: boolean): string`: the stylesheet.
    - `inject(root: Document | ShadowRoot): void`: once per root, through `adoptedStyleSheets`, or a `<style>` element when constructable sheets are missing.
  - `src/mount.ts`:
    - `type Theme = "auto" | "light" | "dark"`
    - `type BaseOptions = { theme?: Theme; label?: string; onRead?: (text: string) => void }`
    - `type Figure<O> = { update(options: Partial<O>): void; destroy(): void }`
    - `type Spec<O, H> = { id; label; rest; key; range; engine; focusable?; apply? }`
    - `create(spec, el: HTMLElement, options?: O): Figure<O>`
  - `src/index.ts` (entry `.`):
    - Functions: `riffle`, `terrain`, `exploded`, `phosphor`, `slow`, `turntable`, each `(el: HTMLElement, options?: XOptions) => Figure<XOptions>`.
    - Option types: `RiffleOptions`, `TerrainOptions`, `ExplodedOptions`, `PhosphorOptions`, `SlowOptions`, `TurntableOptions`.
    - Re-exports: `ranges`, `Range`, `BaseOptions`, `Figure`, `Theme`.
  - `test/dom.ts`, used again in Task 8:
    - Installs, as a side effect, a fake `IntersectionObserver`, `matchMedia` and a manual `requestAnimationFrame`.
    - Exports `observers: Set<FakeObserver>`, `frames(n?)`, `pending()` and `host(): HTMLDivElement`.

This task holds Review Focus items 1, 2 and 3. Their tests are in `mount.test.ts`:
- Item 1: "leaves the host's own attributes alone, at mount and at destroy", "does not name an element that aria-labelledby already names", and "drops its own name when the element gains aria-labelledby".
- Item 2: "reports an onRead that throws and keeps every figure running".
- Item 3: the "teardown" block.

- [ ] **Step 1: Write the DOM stubs the tests run on**

jsdom has no `IntersectionObserver` or `matchMedia`, and its `requestAnimationFrame` runs on a real timer. These stubs make frames run only when a test asks for them.

`packages/hairline/test/dom.ts`
```ts
import { afterEach, beforeEach, vi } from "vitest";
import { terrain } from "../src/index";

/**
 * What jsdom lacks and the figures need: an IntersectionObserver, matchMedia,
 * and frames that run when the test says so. Import it for the side effect;
 * it installs before each test and puts everything back after.
 */

type Frame = (now: number) => void;
let queue = new Map<number, Frame>();
let id = 0;
let now = 1000;

/** The observers alive right now: one while any figure is mounted, none after the last is destroyed. */
export const observers = new Set<FakeObserver>();

class FakeObserver {
  targets = new Set<Element>();
  constructor(private cb: IntersectionObserverCallback) { observers.add(this); }
  observe(el: Element) {
    this.targets.add(el);
    this.cb([{ target: el, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve(el: Element) { this.targets.delete(el); }
  disconnect() { this.targets.clear(); observers.delete(this); }
}

/** Runs n frames of 1/60 s. A frame that nobody asked for still moves the clock. */
export function frames(n = 1) {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const run = [...queue.values()];
    queue = new Map();
    for (const fn of run) fn(now);
  }
}

/** How many frames are waiting. Zero means the loop is asleep. */
export const pending = () => queue.size;

beforeEach(() => {
  queue = new Map(); id = 0; now = 1000;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("requestAnimationFrame", (fn: Frame) => { queue.set(++id, fn); return id; });
  vi.stubGlobal("cancelAnimationFrame", (n: number) => { queue.delete(n); });
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  // the loop is module state: empty it, or the next test starts with this one's figures still in it.
  // Mounting on an element destroys the figure it had.
  for (const el of hosts) terrain(el).destroy();
  hosts = [];
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let hosts: HTMLElement[] = [];

/** A host in the document, 400 × 320 at the origin, so a client point is a viewBox point. */
export function host(): HTMLDivElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 320, right: 400, bottom: 320, x: 0, y: 0, toJSON() {} });
  document.body.appendChild(el);
  hosts.push(el);
  return el;
}
```

- [ ] **Step 2: Write the failing test**

These are lifecycle layer 3 from the spec. They are the contract of "What a mount does to the element", one test per sentence, plus the three Review Focus items.

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
  it.each(["60", NaN, null, "fast", {}, Infinity])("mounts and updates with %o as the number", (v) => {
    const el = host();
    const bad = v as unknown as number;
    for (const mount of Object.values(ALL)) {
      const f = (mount as (el: HTMLElement, o?: Record<string, unknown>) => { update(o: Record<string, unknown>): void; destroy(): void })(
        el, { stagger: bad, radius: bad, gap: bad, afterglow: bad, rate: bad, coast: bad });
      f.update({ stagger: bad, radius: bad, gap: bad, afterglow: bad, rate: bad, coast: bad });
      frames(3);
      expect(el.querySelector("svg")!.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
      f.destroy();
    }
  });

  it("shows Riffle's bands only for true", () => {
    const el = host();
    const f = riffle(el, { bands: true });
    const bands = el.querySelector(".bands")!;
    expect(bands.classList.contains("show")).toBe(true);
    f.update({ bands: "yes" as unknown as boolean });
    expect(bands.classList.contains("show")).toBe(false);
    f.update({ bands: true });
    f.update({ bands: undefined });
    expect(bands.classList.contains("show")).toBe(false);
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

  it("reads a pulled card out by number, and by name when it has one", () => {
    const el = host(), onRead = vi.fn();
    const f = riffle(el, { onRead });
    key(el, "ArrowLeft");
    expect(onRead).toHaveBeenLastCalledWith("01");
    expect(el.querySelector("[data-hairline-live]")!.textContent).toBe("01");
    f.update({ labels: ["Radial menu", "Drum"] });
    expect(onRead).toHaveBeenLastCalledWith("01 · Radial menu");
    key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("02 · Drum");
    key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("03"); // fewer than eight names: the rest go by number
    key(el, "Escape");
    expect(onRead).toHaveBeenLastCalledWith("rest");
  });

  it("takes the first eight labels and reads anything that is not a string as no name", () => {
    const el = host(), onRead = vi.fn();
    riffle(el, { onRead, labels: [7, "b", "c", "d", "e", "f", "g", "h", "ninth"] as unknown as string[] });
    key(el, "ArrowLeft");
    expect(onRead).toHaveBeenLastCalledWith("01");
    for (let i = 0; i < 7; i++) key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("08 · h");
    key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("08 · h");
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
    f.update({ theme: "dark", label: "late", radius: 5 });
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

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm -C packages/hairline exec vitest run test/mount.test.ts`
Expected: FAIL, `Tests  32 failed (32)`. `src/index.ts` exports nothing, so each test fails with a `TypeError` such as `riffle is not a function` or `terrain is not a function`.

- [ ] **Step 4: Write the stylesheet**

The palette values and their order are the spec's theme table. `:where()` keeps every rule at zero specificity.

`packages/hairline/src/core/styles.ts`
```ts
/**
 * Hairline — the stylesheet, as a string, and the one function that puts it
 * in a document or a shadow root.
 *
 * Every selector is inside `:where()`, so each rule has zero specificity: a
 * rule of the page's always wins, and between these rules only their order
 * decides. The order below is therefore part of the design. The six
 * `--hairline-*` properties are the public theme; `--hl-*` are private and
 * read them with the palette as the fallback.
 */

const LIGHT = { plate: "#ffffff", hi: "#232327", edge: "#a4a4ac", mid: "#c3c3c9", lo: "#e0e0e4" };
const DARK = { plate: "#08090a", hi: "#d0d6e0", edge: "#5b5d64", mid: "#3e3e44", lo: "#29292d" };
const KEYS = ["plate", "hi", "edge", "mid", "lo"] as const;
type Palette = Record<(typeof KEYS)[number], string>;

const vars = (p: Palette) => KEYS.map((k) => `--hl-${k}:var(--hairline-${k},${p[k]});`).join("");
const EASE = "cubic-bezier(0.5,0,0.1,1)";
const SVG = ":where([data-hairline]>svg)";

/** The stylesheet. `lightDark` adds the rule that follows the page's `color-scheme`, for browsers that have `light-dark()`. */
export function css(lightDark: boolean): string {
  const both = Object.fromEntries(KEYS.map((k) => [k, `light-dark(${LIGHT[k]},${DARK[k]})`])) as Palette;
  return [
    // the box, and the palette: light unless something below says otherwise
    `:where([data-hairline]){display:block;position:relative;aspect-ratio:5/4;touch-action:pan-y;user-select:none;-webkit-user-select:none;--hl-sw:var(--hairline-stroke,0.9);${vars(LIGHT)}}`,
    // the page's color-scheme
    lightDark ? `:where([data-hairline]){${vars(both)}}` : "",
    // an ancestor that says dark
    `:where(.dark,[data-theme="dark"]) :where([data-hairline]){${vars(DARK)}}`,
    // the figure's own theme option
    `:where([data-hairline][data-hairline-theme="light"]){${vars(LIGHT)}}`,
    `:where([data-hairline][data-hairline-theme="dark"]){${vars(DARK)}}`,
    `:where([data-hairline]:focus-visible){outline:1.5px solid var(--hl-hi);outline-offset:2px}`,
    `${SVG}{position:absolute;inset:0;width:100%;height:100%;display:block}`,
    // Riffle's live region: read, not seen
    `:where([data-hairline]>[data-hairline-live]){position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
    // the drawing: plates are filled with the plate colour and painted back to front
    `${SVG} :where(path,polygon,ellipse,line){fill:var(--hl-plate);stroke:var(--hl-mid);stroke-width:var(--hl-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;transition:stroke 260ms ${EASE}}`,
    `${SVG} :where(.nf){fill:none}`,
    `${SVG} :where(.fo){stroke:none}`,
    `${SVG} :where(.sil){stroke:var(--hl-edge)}`,
    `${SVG} :where(.hi){stroke:var(--hl-hi)}`,
    `${SVG} :where(.lo){stroke:var(--hl-lo)}`,
    `${SVG} :where(.dash){stroke-dasharray:1 3}`,
    `${SVG} :where(.dot){stroke:none;fill:var(--hl-hi);transition:fill 260ms ${EASE}}`,
    `${SVG} :where(.dot.m){fill:var(--hl-edge)}`,
    `${SVG} :where(.dot.off){fill:var(--hl-lo)}`,
    `${SVG} :where(.ghost path){fill:none;stroke:var(--hl-mid)}`,
    `${SVG} :where(.bands){opacity:0;transition:opacity 240ms ${EASE};pointer-events:none}`,
    `${SVG} :where(.bands.show){opacity:1}`,
    `${SVG} :where(.bands path){fill:none;stroke:var(--hl-mid);stroke-dasharray:2 3}`,
    `${SVG} :where(.bands path.on){stroke:var(--hl-hi);stroke-dasharray:none}`,
  ].join("");
}

const done = new WeakSet<Document | ShadowRoot>();

/** Puts the stylesheet in a document or a shadow root, once: adopted where that exists, a `<style>` element where it doesn't. */
export function inject(root: Document | ShadowRoot): void {
  if (done.has(root)) return;
  done.add(root);
  const doc = root.nodeType === 9 ? (root as Document) : (root as ShadowRoot).ownerDocument;
  const win = doc.defaultView;
  const text = css(!!win?.CSS?.supports?.("color", "light-dark(#000,#fff)"));
  if (win && "adoptedStyleSheets" in root) {
    try {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(text);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch {
      // no constructable stylesheets here: fall through to an element
    }
  }
  const style = doc.createElement("style");
  style.setAttribute("data-hairline-style", "");
  style.textContent = text;
  (root.nodeType === 9 ? doc.head ?? doc.documentElement : root).appendChild(style);
}
```

- [ ] **Step 5: Write the mount**

`create` turns an engine and a `Spec` into a `Figure`:
- It replaces any figure already on the element.
- It injects the stylesheet into the element's root.
- It sets only the attributes the element does not already have.
- It catches each caption through a `Readout` and passes it to `onRead` when it changes, reporting a throwing `onRead` without stopping the loop.
- It applies option updates, and on `destroy` takes back exactly what it added.

`packages/hairline/src/mount.ts`
```ts
import { inject } from "./core/styles";
import type { FigureEls, FigureHandle, Readout } from "./core/stage";
import { number, type Range } from "./ranges";

/**
 * Hairline — the public wrapper around an engine. An engine draws into an svg
 * it is handed and writes its caption to a read-out; this file makes both,
 * dresses the host element, and gives back the two calls a consumer needs.
 *
 * It only ever removes what it added: the svg, the live region, and the
 * attributes the host did not already have.
 */

export type Theme = "auto" | "light" | "dark";

export type BaseOptions = {
  /** `"auto"` follows the page: an ancestor with class `dark` or `data-theme="dark"`, then the page's `color-scheme`. Default `"auto"`. */
  theme?: Theme;
  /** The accessible name. Each figure has a default description in English. */
  label?: string;
  /** The figure's caption, each time it changes. Called once at mount with the rest caption. */
  onRead?: (text: string) => void;
};

export type Figure<O> = {
  /** Changes options on the running figure. A key set to `undefined` goes back to its default. */
  update(options: Partial<O>): void;
  /** Stops the figure and removes what it added to the element. Safe to call twice. */
  destroy(): void;
};

/** What a figure is: its engine, the one number it takes, and what it says about itself. */
export type Spec<O extends BaseOptions, H extends FigureHandle> = {
  id: string;
  /** The default accessible name. */
  label: string;
  /** The caption at rest, for an engine that writes none until it is touched. */
  rest: string;
  /** The numeric option, and its range. */
  key: keyof O & string;
  range: Range;
  engine: (els: FigureEls, value: number) => H;
  /** Operable from the keyboard: a focusable group with a live region, not an image. */
  focusable?: boolean;
  /** Options beyond the number. Runs at mount and after every update; must be safe to repeat. */
  apply?: (engine: H, options: O) => void;
};

const NS = "http://www.w3.org/2000/svg";
const mounted = new WeakMap<Element, () => void>();

/** An error from a consumer's callback, reported as uncaught without unwinding the frame loop every figure shares. */
const report = (err: unknown) => {
  if (typeof reportError === "function") reportError(err);
  else setTimeout(() => { throw err; });
};

export function create<O extends BaseOptions, H extends FigureHandle>(spec: Spec<O, H>, el: HTMLElement, options?: O): Figure<O> {
  if (typeof document === "undefined") {
    throw new Error(`hairline: ${spec.id}() needs a DOM. Call it in the browser, once the element exists: in an effect, in onMount, or in a script after the element.`);
  }
  if (!el || el.nodeType !== 1) {
    throw new TypeError(`hairline: ${spec.id}() takes an element as its first argument, and got ${el === null ? "null" : typeof el}.`);
  }
  mounted.get(el)?.();

  const opts = { ...options } as O;
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

  let value = number(opts[spec.key], spec.range);
  const engine = spec.engine({ stage: el, svg, read }, value);
  spec.apply?.(engine, opts);
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
      for (const k in next) {
        if (next[k] === undefined) delete opts[k];
        else opts[k] = next[k] as O[typeof k];
      }
      const v = number(opts[spec.key], spec.range);
      if (v !== value) { value = v; engine.set(v); }
      dress();
      spec.apply?.(engine, opts);
    },
    destroy,
  };
}
```

- [ ] **Step 6: Write the entry**

Each function names its own engine, so importing one figure bundles one engine. The JSDoc on every option gives its unit, range and default, as the spec asks.

`packages/hairline/src/index.ts`
```ts
import { create, type BaseOptions, type Figure } from "./mount";
import { ranges } from "./ranges";
import { mount as explodedEngine } from "./figures/exploded";
import { mount as phosphorEngine } from "./figures/phosphor";
import { mount as riffleEngine } from "./figures/riffle";
import { mount as slowEngine } from "./figures/slow";
import { mount as terrainEngine } from "./figures/terrain";
import { mount as turntableEngine } from "./figures/turntable";

/**
 * @lucasmarkes/hairline — six isometric line figures that answer the pointer.
 *
 * One function per figure. Each takes an element and its own options, draws
 * into the element, and returns `{ update, destroy }`. Each function names
 * its engine itself, so a bundle that imports one figure carries one.
 */

export { ranges, type Range } from "./ranges";
export type { BaseOptions, Figure, Theme } from "./mount";

export type RiffleOptions = BaseOptions & {
  /** The delay between one card and the next as they lean, in ms. 0 to 90. Default 40. */
  stagger?: number;
  /** Shows the bands the pointer is tested against. Default `false`. */
  bands?: boolean;
  /** Names for the eight cards, card 01 first. A named card is read out as `"03 · Dock"`, an unnamed one as `"03"`. */
  labels?: readonly string[];
};

export type TerrainOptions = BaseOptions & {
  /** How far the rise reaches around the pointer, in cells. 1.5 to 5. Default 3. */
  radius?: number;
};

export type ExplodedOptions = BaseOptions & {
  /** The space between two layers when fully open, in viewBox units (the drawing is 400 × 320). 12 to 40. Default 28. */
  gap?: number;
};

export type PhosphorOptions = BaseOptions & {
  /** How long a painted dot takes to fade, in ms. 150 to 1500. Default 520. */
  afterglow?: number;
};

export type SlowOptions = BaseOptions & {
  /** The clock's speed while the pointer is over the figure, as a multiple of normal. 0.05 to 0.6. Default 0.2. */
  rate?: number;
};

export type TurntableOptions = BaseOptions & {
  /** How long a flick keeps the table turning, in ms. 200 to 1500. Default 650. */
  coast?: number;
};

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. */
export function riffle(el: HTMLElement, options?: RiffleOptions): Figure<RiffleOptions> {
  return create({
    id: "riffle",
    label: "A tray of eight cards. Hover or use the arrow keys to pull a card.",
    rest: "rest",
    key: "stagger",
    range: ranges.riffle.stagger,
    engine: riffleEngine,
    focusable: true,
    apply(engine, o) {
      engine.bands(o.bands === true);
      engine.labels(Array.isArray(o.labels) ? o.labels.slice(0, 8).map((s) => (typeof s === "string" ? s : "")) : []);
    },
  }, el, options);
}

/** Eighty-one pillars on a plinth that rise around the pointer. */
export function terrain(el: HTMLElement, options?: TerrainOptions): Figure<TerrainOptions> {
  return create({
    id: "terrain",
    label: "Eighty-one pillars on a plinth that rise around the pointer and rest as a dune with two rises.",
    rest: "rest",
    key: "radius",
    range: ranges.terrain.radius,
    engine: terrainEngine,
  }, el, options);
}

/** An app window in four layers. Moving across opens the gap; moving down picks a layer. */
export function exploded(el: HTMLElement, options?: ExplodedOptions): Figure<ExplodedOptions> {
  return create({
    id: "exploded",
    label: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    rest: "",
    key: "gap",
    range: ranges.exploded.gap,
    engine: explodedEngine,
  }, el, options);
}

/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. */
export function phosphor(el: HTMLElement, options?: PhosphorOptions): Figure<PhosphorOptions> {
  return create({
    id: "phosphor",
    label: "A seven by seven dot matrix on a floating tile that plays a loop, and fades like phosphor where you paint it.",
    rest: "loop",
    key: "afterglow",
    range: ranges.phosphor.afterglow,
    engine: phosphorEngine,
  }, el, options);
}

/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. */
export function slow(el: HTMLElement, options?: SlowOptions): Figure<SlowOptions> {
  return create({
    id: "slow",
    label: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    rest: "rate 1.00×",
    key: "rate",
    range: ranges.slow.rate,
    engine: slowEngine,
  }, el, options);
}

/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. */
export function turntable(el: HTMLElement, options?: TurntableOptions): Figure<TurntableOptions> {
  return create({
    id: "turntable",
    label: "Blocks on a turntable. Flick across it to spin it; it settles on the nearest quarter turn.",
    rest: "az 045° · el 30°",
    key: "coast",
    range: ranges.turntable.coast,
    engine: turntableEngine,
  }, el, options);
}
```

- [ ] **Step 7: Run the tests and see them pass**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected:
- `geometry`, `ranges` and `mount` all pass.
- The typecheck passes.
- `dist/index.js` now exports the six functions and `ranges`.

- [ ] **Step 8: Commit**

```bash
git add packages/hairline/src packages/hairline/test/dom.ts packages/hairline/test/mount.test.ts
git commit -m "API: the vanilla entry, six functions over one mount, with styles injected per root

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 7: Browser tests: parity with the website, behaviour and theme

**Files:**
- Create: `packages/hairline/playwright.config.ts`
- Create: `packages/hairline/test/browser/serve.mjs`, `harness.html`, `entry.ts`
- Test: `packages/hairline/test/browser/parity.spec.ts`, `figures.spec.ts`, `theme.spec.ts`
- Modify: `.github/workflows/ci.yml` (add the browser step)

**Interfaces:**
- Consumes:
  - From Task 3: `clock.js`, `play`, `normalise` (inside `play`), `FIGURES`, `OPTION`, `SCRIPTS` and the goldens.
  - From Task 6: the entry `src/index.ts`.
- Produces:
  - `window.__hl` on the harness page (`http://localhost:4310`):
    - `hairline`: the whole entry.
    - `mount(id, options?, el?)`: records captions.
    - `read()`: the last caption.
    - `reads`: every caption.
    - `figure`: the current handle.
  - `pnpm test:browser` runs these specs. The site adds its own browser specs in Task 12.

This task meets the spec's phase 1 exit criterion: parity for all six figures. Each figure is mounted through the public API and driven by the same script, on the same frozen clock, that captured the goldens. Its SVG must match the website's at every checkpoint, character for character, after `normalise` renumbers the mask and gradient ids. It also holds Review Focus item 5: the last two tests in `figures.spec.ts`.

These tests check code that already exists (Tasks 4–6), so they should pass the first time. A failure here is a bug in the port or the mount: fix the code, never the golden. Step 5 breaks an engine on purpose, to prove that parity can fail.

- [ ] **Step 1: Write the harness**

esbuild bundles the package's source, not `dist`, so the browser tests need no build.

`packages/hairline/playwright.config.ts`
```ts
import { defineConfig } from "@playwright/test";

/** Browser tests run in the installed Chrome, against the harness page (test/browser/serve.mjs). */
export default defineConfig({
  testDir: "test/browser",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4310",
    channel: "chrome",
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  },
  webServer: { command: "node test/browser/serve.mjs", url: "http://localhost:4310", reuseExistingServer: !process.env.CI },
});
```

`packages/hairline/test/browser/serve.mjs`
```js
/**
 * The browser tests' server: the harness page and the package source, bundled
 * by esbuild at start. Playwright starts it (playwright.config.ts).
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const PORT = 4310;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const bundle = await build({ entryPoints: [here("./entry.ts")], bundle: true, format: "esm", target: "es2020", write: false });
const routes = {
  "/": ["text/html", readFileSync(here("./harness.html"))],
  "/entry.js": ["text/javascript", bundle.outputFiles[0].contents],
};

createServer((req, res) => {
  const hit = routes[new URL(req.url, "http://x").pathname];
  if (!hit) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": `${hit[0]}; charset=utf-8`, "cache-control": "no-store" }).end(hit[1]);
}).listen(PORT, () => console.log(`harness on http://localhost:${PORT}`));
```

`packages/hairline/test/browser/harness.html`
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>hairline — test harness</title>
<link rel="icon" href="data:,">
<style>
  body { margin: 0; padding: 40px; }
  #host { width: 640px; }
</style>
</head>
<body>
  <div id="host"></div>
  <script type="module" src="/entry.js"></script>
</body>
</html>
```

`packages/hairline/test/browser/entry.ts`
```ts
import * as hairline from "../../src/index";

/**
 * The harness page's script: the package, on `window`, with one figure at a
 * time on #host. Tests drive it through page.evaluate.
 */
type Id = "riffle" | "terrain" | "exploded" | "phosphor" | "slow" | "turntable";
type Loose = Record<string, unknown>;
type Mount = (el: HTMLElement, options?: Loose) => { update(o: Loose): void; destroy(): void };

const api = {
  hairline,
  /** Every caption the current figure has written, in order. */
  reads: [] as string[],
  figure: null as ReturnType<Mount> | null,
  /** Mounts a figure on `el` (default #host), recording its captions. */
  mount(id: Id, options: Loose = {}, el: HTMLElement = document.getElementById("host")!) {
    api.reads = [];
    api.figure = (hairline[id] as unknown as Mount)(el, { ...options, onRead: (text: string) => api.reads.push(text) });
    return api.figure;
  },
  read: () => api.reads[api.reads.length - 1] ?? null,
};

declare global {
  interface Window {
    __hl: typeof api;
    /** test/parity/clock.js, when a test adds it */
    __realTimeout: typeof setTimeout;
    __advance(ms: number): number;
  }
}
window.__hl = api;
```

- [ ] **Step 2: Write the parity test**

`packages/hairline/test/browser/parity.spec.ts`
```ts
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { play } from "../parity/driver.mjs";
import { FIGURES, OPTION, SCRIPTS } from "../parity/scripts.mjs";

/**
 * The package draws what the site draws. Each golden is the site's svg at
 * every checkpoint of a pointer script (test/parity/capture.mjs); the same
 * script is played here against the package, on the same virtual clock.
 */
const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const clock = file("../parity/clock.js") + "\nwindow.__freeze(1000);";

/* The site names its eight cards; the package takes names as an option. */
const NAMES = ["Radial menu", "Drum", "Dock", "Condense", "Settle", "Upload", "Badge", "Spark"];

type Checkpoint = { at: string; read: string; svg: string };

for (const id of FIGURES as string[]) {
  test(`${id} draws what the site draws`, async ({ context, page }) => {
    const golden = JSON.parse(file(`../parity/golden/${id}.json`)) as { checkpoints: Checkpoint[] };
    const [key, value] = (OPTION as unknown as Record<string, [string, number]>)[id];
    await context.addInitScript(clock);
    await page.goto("/");
    await page.evaluate(([id, labels]) => { window.__hl.mount(id as "riffle", id === "riffle" ? { labels } : {}); }, [id, NAMES] as const);
    const stage = page.locator("#host");
    await stage.locator("svg > *").first().waitFor();
    /* a figure sleeps until its IntersectionObserver reports it on screen, and that report comes on the browser's own time */
    await page.evaluate(() => new Promise((done) => window.__realTimeout(done, 500)));

    const got: Checkpoint[] = await play(page, {
      stage,
      snap: () => page.evaluate(() => ({ svg: document.querySelector("#host > svg")!.innerHTML, read: window.__hl.read() })),
      set: () => page.evaluate(([key, value]) => window.__hl.figure!.update({ [key]: value }), [key, value] as const),
    }, (SCRIPTS as Record<string, object[]>)[id]);

    expect(got.map((c) => c.at)).toEqual(golden.checkpoints.map((c) => c.at));
    for (const [i, want] of golden.checkpoints.entries()) {
      expect(got[i].read, `caption at "${want.at}"`).toBe(want.read);
      expect(got[i].svg, `drawing at "${want.at}"`).toBe(want.svg);
    }
  });
}
```

- [ ] **Step 3: Write the behaviour and theme tests**

`figures.spec.ts` covers the spec's layer 4:
- Every figure answers the pointer with a clean console.
- Riffle answers the arrow keys and announces the card.
- Turntable seats on a quarter turn after a flick.
- Reduced motion.
- Review Focus item 5.

`packages/hairline/test/browser/figures.spec.ts`
```ts
import { expect, test, type Page } from "@playwright/test";

/** The figures in a real browser: input, focus, reduced motion, shadow roots, a clean console. */

const IDS = ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"] as const;
type Id = (typeof IDS)[number];

const mount = (page: Page, id: Id, options: Record<string, unknown> = {}) =>
  page.evaluate(([id, options]) => { window.__hl.mount(id, options); }, [id, options] as const);
const read = (page: Page) => page.evaluate(() => window.__hl.read());
/** A pointer event at a point of the 400 × 320 viewBox; no point is a leave. */
const fire = (page: Page, type: string, pt?: [number, number]) => page.locator("#host").evaluate((el, [type, pt]) => {
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent(type, {
    pointerType: "mouse", pointerId: 1, bubbles: type !== "pointerleave",
    clientX: pt ? r.left + (pt[0] / 400) * r.width : r.left - 40,
    clientY: pt ? r.top + (pt[1] / 320) * r.height : r.top - 40,
  }));
}, [type, pt] as const);

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("every figure mounts, answers the pointer and leaves, with nothing on the console", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  for (const id of IDS) {
    await mount(page, id);
    const host = page.locator("#host");
    await expect(host.locator("svg > *").first()).toBeAttached();
    const box = (await host.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(5 / 4, 2);
    await host.hover({ position: { x: box.width * 0.45, y: box.height * 0.5 } });
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45, { steps: 6 });
    await page.waitForTimeout(150);
    await page.mouse.move(2, 2);
    await page.evaluate(() => window.__hl.figure!.destroy());
    expect(await host.evaluate((el) => el.outerHTML)).toBe('<div id="host"></div>');
  }
  expect(problems).toEqual([]);
});

test("Riffle walks its cards from the keyboard and says each one in the live region", async ({ page }) => {
  await mount(page, "riffle", { labels: ["Radial menu", "Drum"] });
  const host = page.locator("#host"), live = host.locator("[data-hairline-live]");
  await page.keyboard.press("Tab");
  await expect(host).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(live).toHaveText("01 · Radial menu");
  await page.keyboard.press("ArrowRight");
  await expect(live).toHaveText("02 · Drum");
  await page.keyboard.press("ArrowRight");
  await expect(live).toHaveText("03");
  await page.keyboard.press("Escape");
  await expect(live).toHaveText("rest");
  await page.keyboard.press("ArrowLeft");
  await host.blur();
  await expect(live).toHaveText("rest");
  /* read, not seen */
  const box = (await live.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(1);
  expect(box.height).toBeLessThanOrEqual(1);
});

test("Turntable settles on a quarter turn after a flick", async ({ page }) => {
  await mount(page, "turntable");
  expect(await read(page)).toBe("az 045° · el 30°");
  for (const x of [50, 120, 200, 280, 350]) { await fire(page, "pointermove", [x, 176]); await page.waitForTimeout(16); }
  await fire(page, "pointerleave");
  await expect.poll(() => read(page), { timeout: 8000 }).toMatch(/^az (045|135|225|315)° · el 30°$/);
  const settled = await read(page);
  await page.waitForTimeout(400);
  expect(await read(page)).toBe(settled);
  expect(await page.evaluate(() => window.__hl.reads.length)).toBeGreaterThan(3);
});

test("under reduced motion the loops hold still", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  for (const id of ["phosphor", "slow"] as const) {
    await mount(page, id);
    await page.waitForTimeout(700);
    const a = await page.locator("#host > svg").innerHTML();
    await page.waitForTimeout(500);
    expect(await page.locator("#host > svg").innerHTML(), id).toBe(a);
  }
  await context.close();
});

test("a figure in a shadow root is styled there, and only there", async ({ page }) => {
  const fill = await page.evaluate(() => {
    const outer = document.createElement("div");
    document.body.append(outer);
    const root = outer.attachShadow({ mode: "open" });
    const el = document.createElement("div");
    el.style.width = "400px";
    root.append(el);
    window.__hl.mount("terrain", { theme: "dark" }, el);
    return {
      fill: getComputedStyle(el.querySelector("svg .sil")!).fill,
      position: getComputedStyle(el).position,
      inShadow: root.adoptedStyleSheets.length,
      inDocument: document.adoptedStyleSheets.length + document.querySelectorAll("style[data-hairline-style]").length,
    };
  });
  expect(fill).toEqual({ fill: "rgb(8, 9, 10)", position: "relative", inShadow: 1, inDocument: 0 });
});

// Review Focus 5: frameworks build a node first and attach it afterwards
test("a figure mounted on a detached element is drawn and styled once attached", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const el = document.createElement("div");
    el.style.width = "400px";
    window.__hl.mount("slow", {}, el);
    const before = el.querySelector("svg")!.childElementCount;
    document.body.append(el);
    await new Promise((done) => setTimeout(done, 300));
    const first = el.querySelector("svg")!.innerHTML;
    await new Promise((done) => setTimeout(done, 300));
    return {
      before: before > 0,
      box: [el.offsetWidth, el.offsetHeight],
      fill: getComputedStyle(el.querySelector("svg .sil")!).fill,
      running: el.querySelector("svg")!.innerHTML !== first,
    };
  });
  expect(result).toEqual({ before: true, box: [400, 320], fill: "rgb(255, 255, 255)", running: true });
});
```

`theme.spec.ts` covers the four palette rules, in order, plus the two fallbacks the spec's risk table names: no `adoptedStyleSheets`, and no `light-dark()`.

`packages/hairline/test/browser/theme.spec.ts`
```ts
import { expect, test, type Page } from "@playwright/test";

/**
 * The palette rules, in the order the stylesheet applies them: the `theme`
 * option, an ancestor that says dark, the page's color-scheme, light. Read
 * off a real computed style: the plate colour a silhouette is filled with.
 */
const LIGHT = "rgb(255, 255, 255)", DARK = "rgb(8, 9, 10)";

const plate = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector("#host svg .sil")!).fill);
const mount = (page: Page, options: Record<string, unknown> = {}) =>
  page.evaluate((options) => { window.__hl.mount("terrain", options); }, options);

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("light when nothing says otherwise", async ({ page }) => {
  await mount(page);
  expect(await plate(page)).toBe(LIGHT);
});

test("follows the page's color-scheme", async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { document.documentElement.style.colorScheme = "dark"; });
  expect(await plate(page)).toBe(DARK);
  await page.evaluate(() => { document.documentElement.style.colorScheme = "light dark"; });
  expect(await plate(page)).toBe(LIGHT);
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await plate(page)).toBe(DARK);
});

test("an ancestor with class dark or data-theme=dark wins over the color-scheme", async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { document.documentElement.style.colorScheme = "light"; document.body.className = "dark"; });
  expect(await plate(page)).toBe(DARK);
  await page.evaluate(() => { document.body.className = ""; document.documentElement.dataset.theme = "dark"; });
  expect(await plate(page)).toBe(DARK);
});

test("the theme option wins over both", async ({ page }) => {
  await page.evaluate(() => { document.body.className = "dark"; document.documentElement.style.colorScheme = "dark"; });
  await mount(page, { theme: "light" });
  expect(await plate(page)).toBe(LIGHT);
  await page.evaluate(() => window.__hl.figure!.update({ theme: "dark" }));
  await page.evaluate(() => { document.body.className = ""; document.documentElement.style.colorScheme = "light"; });
  expect(await plate(page)).toBe(DARK);
  await page.evaluate(() => window.__hl.figure!.update({ theme: "auto" }));
  expect(await plate(page)).toBe(LIGHT);
});

test("a --hairline-* property wins over every palette, and a page rule over the stylesheet", async ({ page }) => {
  await mount(page, { theme: "dark" });
  await page.addStyleTag({ content: "#host { --hairline-plate: rgb(1, 2, 3); --hairline-stroke: 2; } [data-hairline] { aspect-ratio: 1; }" });
  expect(await plate(page)).toBe("rgb(1, 2, 3)");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("#host svg .sil")!).strokeWidth)).toBe("2px");
  const box = (await page.locator("#host").boundingBox())!;
  expect(box.width).toBe(box.height);
});

test("without constructable stylesheets it falls back to a style element", async ({ context, page }) => {
  await context.addInitScript(() => { delete (Document.prototype as { adoptedStyleSheets?: unknown }).adoptedStyleSheets; });
  await page.goto("/");
  await mount(page, { theme: "dark" });
  await mount(page, { theme: "dark" });
  expect(await page.locator("style[data-hairline-style]").count()).toBe(1);
  expect(await plate(page)).toBe(DARK);
});

test("without light-dark() it stays light under a dark color-scheme, and the class still works", async ({ context, page }) => {
  await context.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((a: string, b?: string) => (String(b ?? a).includes("light-dark") ? false : b === undefined ? supports(a) : supports(a, b))) as typeof CSS.supports;
  });
  await page.goto("/");
  await mount(page);
  await page.evaluate(() => { document.documentElement.style.colorScheme = "dark"; });
  expect(await plate(page)).toBe(LIGHT);
  await page.evaluate(() => { document.body.className = "dark"; });
  expect(await plate(page)).toBe(DARK);
});
```

- [ ] **Step 4: Run them**

Run: `pnpm -C packages/hairline test:browser`
Expected: 19 passed: 6 parity, 6 figures, 7 theme.

- [ ] **Step 5: Prove that parity can fail**

In `packages/hairline/src/figures/turntable-geometry.ts`, change `export const HOME = 45;` to `export const HOME = 46;`.

Run: `pnpm -C packages/hairline exec playwright test parity -g turntable`
Expected: FAIL. The svg at the first checkpoint differs from the golden.

Revert the change, and confirm the file matches the commit: `git diff --exit-code packages/hairline/src` exits 0.

- [ ] **Step 6: Add the browser tests to CI**

This is CI with the browser step. Task 9 adds the static release gate.

`.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

# A newer push to the same branch or PR cancels the run in flight.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # Corepack activates the pnpm pinned in package.json's packageManager.
      - name: Enable Corepack
        run: corepack enable

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit and component tests
        run: pnpm test

      # The browser tests drive the Chrome that ubuntu-latest ships
      # (playwright.config.ts sets channel: "chrome"), so nothing is downloaded.
      - name: Browser tests
        run: pnpm test:browser

```

- [ ] **Step 7: Commit and push**

```bash
git add packages/hairline/playwright.config.ts packages/hairline/test/browser .github/workflows/ci.yml
git commit -m "Tests: parity with lucasmarkes.com for all six figures, behaviour and theme in Chrome

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: CI passes, including "Browser tests". It runs on ubuntu-latest's own Chrome, so nothing is downloaded.

If parity passes locally but fails in CI, stop and report the diff to Lucas. Never re-capture or edit a golden to make CI pass: a figure that draws differently on Linux is a finding, not noise.

### Task 8: The React entry

**Files:**
- Create: `packages/hairline/src/react.tsx`
- Modify (replace): `packages/hairline/tsup.config.ts`
- Test: `packages/hairline/test/react.test.tsx`, `packages/hairline/test/ssr.test.tsx`, `packages/hairline/test/types.test-d.tsx`

**Interfaces:**
- Consumes:
  - From Task 6: the six functions and six option types from `./index`.
  - From Task 6's tests: `test/dom.ts` (`observers`, `pending`).
- Produces, the entry `./react`:
  - `type FigureProps<O> = O & Omit<ComponentPropsWithoutRef<"div">, "children" | keyof O>`
  - `type FigureComponent<O> = ForwardRefExoticComponent<FigureProps<O> & RefAttributes<HTMLDivElement>>`
  - The components `Riffle`, `Terrain`, `Exploded`, `Phosphor`, `Slow` and `Turntable`.
  - The types `RiffleProps`, `TerrainProps`, `ExplodedProps`, `PhosphorProps`, `SlowProps` and `TurntableProps`.
  - `dist/react.js`: starts with `"use client";` and imports the core from `"@lucasmarkes/hairline"`. Task 9's tarball gate checks both.

This task holds Review Focus item 4, in `react.test.tsx`: "does not remount, and does not loop, on an inline onRead and inline labels" and "calls a state setter from onRead without looping". `ssr.test.tsx` runs with no DOM at all; it is the spec's `renderToString` check. `types.test-d.tsx` is layer 5: `pnpm typecheck` compiles it, and each `@ts-expect-error` must stay an error.

- [ ] **Step 1: Write the failing tests**

`packages/hairline/test/react.test.tsx`
```tsx
// @vitest-environment jsdom
import { StrictMode, createRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { observers, pending } from "./dom";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "../src/react";

afterEach(cleanup);

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("components", () => {
  it("renders each figure into one div", () => {
    const { container } = render(<><Riffle /><Terrain /><Exploded /><Phosphor /><Slow /><Turntable /></>);
    const ids = [...container.children].map((el) => el.getAttribute("data-hairline"));
    expect(ids).toEqual(["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"]);
    for (const el of container.children) expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
  });

  it("passes div attributes through, forwards the ref, and keeps the options off the DOM", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Riffle ref={ref} id="cards" className="w-80" data-x="1" style={{ width: 320 }} stagger={60} bands labels={["a"]} theme="dark" />);
    const el = container.firstElementChild as HTMLDivElement;
    expect(ref.current).toBe(el);
    expect(el.id).toBe("cards");
    expect(el.className).toBe("w-80");
    expect(el.getAttribute("data-x")).toBe("1");
    expect(el.style.width).toBe("320px");
    expect(el.style.aspectRatio).toBe("5 / 4");
    for (const name of ["stagger", "bands", "labels", "theme", "onread"]) expect(el.hasAttribute(name)).toBe(false);
    expect(el.getAttribute("data-hairline-theme")).toBe("dark");
    expect(el.querySelector(".bands")!.classList.contains("show")).toBe(true);
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
    const el = container.firstElementChild!, svg = el.querySelector("svg");
    rerender(<Riffle theme="light" bands />);
    expect(el.getAttribute("data-hairline-theme")).toBe("light");
    expect(el.querySelector(".bands")!.classList.contains("show")).toBe(true);
    rerender(<Riffle />);
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    expect(el.querySelector(".bands")!.classList.contains("show")).toBe(false);
    expect(el.querySelector("svg")).toBe(svg);
  });

  // Review Focus 4: a function or an array written inline is new on every render
  it("does not remount, and does not loop, on an inline onRead and inline labels", () => {
    const seen: string[] = [];
    let renders = 0;
    function App({ n }: { n: number }) {
      renders++;
      return <Riffle data-n={n} labels={["Radial menu", "Drum"]} onRead={(t) => seen.push(`${n}:${t}`)} />;
    }
    const { container, rerender } = render(<App n={1} />);
    const el = container.firstElementChild!, svg = el.querySelector("svg");
    rerender(<App n={2} />);
    rerender(<App n={3} />);
    expect(renders).toBe(3);
    expect(el.querySelector("svg")).toBe(svg);
    key(el, "ArrowLeft");
    // one call at mount, and the latest function is the one called afterwards
    expect(seen).toEqual(["1:rest", "3:01 · Radial menu"]);
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

`packages/hairline/test/ssr.test.tsx`
```tsx
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

/* No DOM here on purpose: this is what a server sees. */
describe("on the server", () => {
  it("imports both entries without touching a DOM", async () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
    await expect(import("../src/index")).resolves.toBeTypeOf("object");
    await expect(import("../src/react")).resolves.toBeTypeOf("object");
  });

  it("renders a component as an empty box of the right shape", async () => {
    const { Riffle } = await import("../src/react");
    const html = renderToString(createElement(Riffle, { className: "w-80", stagger: 60, labels: ["a"], onRead() {} }));
    expect(html).toBe('<div class="w-80" style="aspect-ratio:5 / 4"></div>');
  });

  it("says what is wrong when a figure is mounted without a DOM", async () => {
    const { riffle } = await import("../src/index");
    expect(() => riffle({} as HTMLElement)).toThrow(/needs a DOM/);
  });
});
```

`packages/hairline/test/types.test-d.tsx`
```tsx
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
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm -C packages/hairline exec vitest run test/react.test.tsx test/ssr.test.tsx; pnpm typecheck`
Expected:
- Vitest fails with `Failed to resolve import "../src/react"`.
- `tsc` fails with `Cannot find module '../src/react'` in `types.test-d.tsx`.

- [ ] **Step 3: Write the components**

Each component is one `<div>` with an inline `aspect-ratio`:
- The figure is mounted in a layout effect, and only when the component mounts.
- A changed option is passed on as `update`.
- `onRead` and `labels` are read through refs, so a new function or array on every render neither remounts the figure nor loops.

`packages/hairline/src/react.tsx`
```tsx
import {
  forwardRef, useCallback, useEffect, useLayoutEffect, useRef,
  type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type RefAttributes,
} from "react";
import {
  exploded, phosphor, riffle, slow, terrain, turntable,
  type BaseOptions, type ExplodedOptions, type Figure, type PhosphorOptions, type RiffleOptions,
  type SlowOptions, type TerrainOptions, type TurntableOptions,
} from "./index";

/**
 * @lucasmarkes/hairline/react — the six figures as components.
 *
 * A component renders one empty `<div>` and mounts the figure on it in a
 * layout effect, so on the server the box is there and the drawing is not.
 * It mounts once: a changed option reaches the running figure as `update`,
 * and `onRead` is called through a ref, so an inline function never remounts.
 */

/** A figure's options, plus every `<div>` attribute except `children`. */
export type FigureProps<O> = O & Omit<ComponentPropsWithoutRef<"div">, "children" | keyof O>;
export type FigureComponent<O> = ForwardRefExoticComponent<FigureProps<O> & RefAttributes<HTMLDivElement>>;

type Loose = Record<string, unknown>;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function make<O extends BaseOptions>(
  name: string,
  mount: (el: HTMLElement, options?: O) => Figure<O>,
  keys: readonly (keyof O & string)[],
): FigureComponent<O> {
  /* the body is typed loosely and the signature strictly: O is generic here, and a props type built from it does not resolve inside */
  const Component = forwardRef<HTMLDivElement, Loose>(function Hairline(props, ref) {
    /* the figure's options out of the props; every key is present, so one that was removed resets */
    const options: Loose = {};
    const rest: Loose = {};
    for (const k in props) if (!(keys as readonly string[]).includes(k) && k !== "onRead") rest[k] = props[k];
    for (const k of keys) options[k] = props[k];
    /* aria-label stays on the div and is the figure's label too, so the two never disagree about the name */
    if (options.label === undefined) options.label = props["aria-label"];

    const el = useRef<HTMLDivElement | null>(null);
    const figure = useRef<Figure<O> | null>(null);
    const onRead = useRef(props.onRead as BaseOptions["onRead"]);
    const set = useCallback((node: HTMLDivElement | null) => {
      el.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    useIsoLayoutEffect(() => { onRead.current = props.onRead as BaseOptions["onRead"]; });

    useIsoLayoutEffect(() => {
      const f = mount(el.current!, { ...options, onRead: (text: string) => onRead.current?.(text) } as O);
      figure.current = f;
      return () => { f.destroy(); figure.current = null; };
      // mounts once; options reach the figure through the effect below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* an array made inline is new on every render: compare what is in it */
    const deps = keys.map((k) => { const v = options[k]; return Array.isArray(v) ? v.join("\u0000") : v; });
    useIsoLayoutEffect(() => { figure.current?.update(options as Partial<O>); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    const { style, ...attrs } = rest as ComponentPropsWithoutRef<"div">;
    return <div {...attrs} ref={set} style={{ aspectRatio: "5 / 4", ...style }} />;
  });
  Component.displayName = name;
  return Component as unknown as FigureComponent<O>;
}

const BASE = ["theme", "label"] as const;

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. */
export const Riffle = make<RiffleOptions>("Riffle", riffle, [...BASE, "stagger", "bands", "labels"]);
/** Eighty-one pillars on a plinth that rise around the pointer. */
export const Terrain = make<TerrainOptions>("Terrain", terrain, [...BASE, "radius"]);
/** An app window in four layers. Moving across opens the gap; moving down picks a layer. */
export const Exploded = make<ExplodedOptions>("Exploded", exploded, [...BASE, "gap"]);
/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. */
export const Phosphor = make<PhosphorOptions>("Phosphor", phosphor, [...BASE, "afterglow"]);
/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. */
export const Slow = make<SlowOptions>("Slow", slow, [...BASE, "rate"]);
/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. */
export const Turntable = make<TurntableOptions>("Turntable", turntable, [...BASE, "coast"]);

export type RiffleProps = FigureProps<RiffleOptions>;
export type TerrainProps = FigureProps<TerrainOptions>;
export type ExplodedProps = FigureProps<ExplodedOptions>;
export type PhosphorProps = FigureProps<PhosphorOptions>;
export type SlowProps = FigureProps<SlowOptions>;
export type TurntableProps = FigureProps<TurntableOptions>;
```

- [ ] **Step 4: Build the React entry against the core by package name**

`packages/hairline/tsup.config.ts`
```ts
import { defineConfig, type Options } from "tsup";

const shared = { format: ["esm"], target: "es2020", dts: true, sourcemap: true } satisfies Options;

/**
 * The React entry imports the figures from "./index" in source, so types and
 * tests need no build. In the bundle that import becomes the package's own
 * name and stays external: both entries then run on one copy of the core, and
 * so on one frame loop.
 */
const self: NonNullable<Options["esbuildPlugins"]>[number] = {
  name: "core-by-package-name",
  setup(build) {
    build.onResolve({ filter: /^\.\/index$/ }, () => ({ path: "@lucasmarkes/hairline", external: true }));
  },
};

export default defineConfig([
  { ...shared, entry: ["src/index.ts"] },
  { ...shared, entry: ["src/react.tsx"], external: ["react"], esbuildPlugins: [self], banner: { js: '"use client";' } },
]);
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: every Vitest file passes (geometry, ranges, mount, react, ssr), and the typecheck passes, type tests included.

- [ ] **Step 6: Check the built entry**

Run:
```bash
cd packages/hairline
head -c 14 dist/react.js; echo
grep -c 'from "@lucasmarkes/hairline"' dist/react.js
grep -c IntersectionObserver dist/react.js || true
```
Expected, in order:
- `"use client";`
- `1`: one import of the core, by its package name.
- `0`: no copy of the frame loop in the React entry.

- [ ] **Step 7: Commit**

```bash
cd ~/estudos/hairline
git add packages/hairline/src/react.tsx packages/hairline/tsup.config.ts packages/hairline/test
git commit -m "API: the React entry, a client module that shares the core's frame loop

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 9: The release gate, the README and CONTRIBUTING

**Files:**
- Create: `scripts/release.mjs`, `CONTRIBUTING.md`, `assets/hero.gif`
- Modify (replace the stub): `README.md`
- Modify: `.github/workflows/ci.yml` (add the static release gate; the file is final after this)

**Interfaces:**
- Consumes: the built package from Tasks 6–8, and the `size-limit` budgets in `packages/hairline/package.json` (Task 1).
- Produces:
  - `pnpm run release`: everything.
  - `pnpm run release --static`: no network.

  Both print `✓`/`✗` lines and exit 1 on any failure. The full gate calls `node scripts/consumers.mjs` (Task 11), and `node registry/build.mjs` and `node registry/validate.mjs` (Task 10). Until those exist, run only `--static`.

  The package's `prepack` copies the root `README.md` and `LICENSE` into `packages/hairline`. Both copies are git-ignored.

The gate is the spec's "Package gates":
- publint, attw with the ESM-only profile, and the size budgets.
- A tarball inspection: what ships, no `workspace:` range, no dependencies, `"use client"`, the core imported by package name, and a real README.

- [ ] **Step 1: Write the gate**

`scripts/release.mjs`
```js
#!/usr/bin/env node
/**
 * The release gate. Builds, tests, lints the package, packs it with pnpm and
 * inspects the tarball, then installs that tarball in the consumer fixtures.
 * It never publishes: publishing is .github/workflows/publish.yml, on a tag.
 *
 *   pnpm release            everything
 *   pnpm release --static   what needs no network: CI runs this on every push.
 *                           Skips the consumer fixtures (they install from npm)
 *                           and the registry checks (they need npm auth).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PKG = "packages/hairline";
const NAME = "@lucasmarkes/hairline";
const STATIC = process.argv.includes("--static");

let failures = 0;
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);
const note = (msg) => console.log(`  – ${msg}`);
const check = (ok, good, bad) => (ok ? pass(good) : fail(bad));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });
/** Runs a step and reports it; on failure prints the end of what the command said. */
function step(label, cmd, args, opts) {
  try { run(cmd, args, opts); pass(label); return true; }
  catch (err) { fail(`${label}\n${String((err.stdout ?? "") + (err.stderr ?? "") || err.message).trim().split("\n").slice(-30).join("\n")}`); return false; }
}

console.log("\n▸ runner");
const agent = process.env.npm_config_user_agent ?? "";
check(agent.startsWith("pnpm"), "running under pnpm", "not running under pnpm. Use `pnpm release`: only pnpm rewrites workspace: ranges when it packs.");

console.log("\n▸ build, typecheck, test");
step("build", "pnpm", ["-w", "build"]);
step("typecheck (includes the type tests)", "pnpm", ["-w", "typecheck"]);
step("unit and component tests", "pnpm", ["-w", "test"]);
step("browser tests (includes parity with the site)", "pnpm", ["-w", "test:browser"]);

console.log("\n▸ package");
step("publint --strict", "pnpm", ["exec", "publint", "--strict"], { cwd: PKG });
step("are the types wrong (esm-only)", "pnpm", ["exec", "attw", "--pack", ".", "--profile", "esm-only"], { cwd: PKG });
step("size budgets", "pnpm", ["exec", "size-limit"], { cwd: PKG });

console.log("\n▸ tarball");
const staging = mkdtempSync(join(tmpdir(), "hairline-release-"));
step("pnpm pack", "pnpm", ["pack", "--pack-destination", staging], { cwd: PKG });
const tgz = readdirSync(staging).filter((f) => f.endsWith(".tgz")).map((f) => join(staging, f))[0];
let version = "";
if (!tgz) fail("no tarball was written");
else {
  const files = run("tar", ["-tzf", tgz]).trim().split("\n").map((f) => f.replace(/^package\//, ""));
  const manifest = JSON.parse(run("tar", ["-xzOf", tgz, "package/package.json"]));
  const text = (file) => run("tar", ["-xzOf", tgz, `package/${file}`]);
  version = manifest.version;

  const stray = files.filter((f) => !f.startsWith("dist/") && !["package.json", "README.md", "LICENSE"].includes(f));
  check(stray.length === 0, "only dist, README.md, LICENSE and package.json", `unexpected files: ${stray.join(", ")}`);
  for (const f of ["dist/index.js", "dist/index.d.ts", "dist/react.js", "dist/react.d.ts", "README.md", "LICENSE"]) {
    check(files.includes(f), `ships ${f}`, `missing ${f}`);
  }
  check(files.every((f) => !/\.(cjs|cts)$/.test(f)), "ESM only", "a CommonJS file is in the tarball");

  const ranges = Object.entries({ ...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies });
  const unresolved = ranges.filter(([, r]) => String(r).startsWith("workspace:"));
  check(unresolved.length === 0, "no workspace: range", `unresolved ${unresolved.map(([n, r]) => `${n}@${r}`).join(", ")}`);
  check(Object.keys(manifest.dependencies ?? {}).length === 0, "no dependencies", `dependencies: ${Object.keys(manifest.dependencies ?? {}).join(", ")}`);
  check(manifest.peerDependencies?.react === ">=18" && manifest.peerDependenciesMeta?.react?.optional === true,
    "react >=18 is an optional peer", "react must be an optional peer dependency, >=18");
  check(manifest.sideEffects === false, "sideEffects: false", "sideEffects must be false");
  check(manifest.type === "module", "type: module", 'type must be "module"');
  check(manifest.publishConfig?.access === "public", "publishConfig.access = public", 'publishConfig.access must be "public"');
  check(manifest.repository?.url?.includes("github.com/lucasmarkes/hairline") && manifest.repository?.directory === PKG,
    "repository points at the package's directory", "repository.url and repository.directory must point at packages/hairline: provenance compares them with the workflow's repository");
  check(!!manifest.homepage && !!manifest.bugs?.url, "homepage and bugs", "homepage and bugs.url are missing");

  if (files.includes("dist/react.js") && files.includes("dist/index.js")) {
    const react = text("dist/react.js"), core = text("dist/index.js");
    check(/^\s*["']use client["'];?/.test(react), 'react.js starts with "use client"', 'react.js does not start with "use client": Server Components would fail to import it');
    check(react.includes(`from "${NAME}"`) && !react.includes("IntersectionObserver"),
      "react.js imports the core by package name", "react.js carries its own copy of the core: two entries would run two frame loops");
    check(!/^\s*["']use client["']/.test(core), "index.js is not a client module", "index.js must not be marked use client");
    check(!/\bfrom\s*["'][^."']/.test(core), "index.js imports nothing", "index.js imports a package");
  }
  check(text("README.md").length > 1500, "README.md is the real one", "README.md is a stub");
}
rmSync(staging, { recursive: true, force: true });

console.log("\n▸ consumers");
if (STATIC) note("skipped (--static): the fixtures install from the npm registry");
else step("Next.js and Vite fixtures install the tarball, build and draw", "node", ["scripts/consumers.mjs"]);

console.log("\n▸ shadcn item");
if (STATIC) note("skipped (--static): the schema is fetched from ui.shadcn.com");
else {
  step("registry/build.mjs", "node", ["registry/build.mjs"]);
  step("the item validates against shadcn's schema", "node", ["registry/validate.mjs"]);
}

console.log("\n▸ registry");
if (STATIC) note("skipped (--static): needs network and npm auth");
else {
  let whoami = "";
  try { whoami = run("npm", ["whoami"]).trim(); } catch { /* not logged in */ }
  if (!whoami) note("not logged in to npm: the scope is unverified (the publish workflow uses NPM_TOKEN)");
  else check(whoami === "lucasmarkes", "logged in as the scope's owner", `logged in as ${whoami}, and the scope is @lucasmarkes`);
  try {
    const res = await fetch(`https://registry.npmjs.org/${NAME.replace("/", "%2f")}`, { signal: AbortSignal.timeout(15_000) });
    if (res.status === 404) pass(`${NAME} is unclaimed on the registry`);
    else if (res.ok) {
      const doc = await res.json();
      check(!doc.versions?.[version], `${version} is not published yet`, `${version} is already on the registry: bump the version`);
    } else fail(`the registry answered ${res.status}`);
  } catch (err) { fail(`could not reach the registry (${err.message})`); }
}

if (failures > 0) { console.error(`\n✗ ${failures} check(s) failed. Not ready to release.\n`); process.exit(1); }
console.log(`\n✓ All checks passed for ${NAME}@${version}. Nothing has been published.\n  To release: update CHANGELOG.md, commit, then  git tag v${version} && git push origin v${version}\n`);
```

- [ ] **Step 2: Run it and see it fail on the stub README**

Run: `pnpm run release --static`
Expected: every check passes except one: `✗ README.md is a stub`. The run ends with `✗ 1 check(s) failed. Not ready to release.` and exits 1.

If a size budget fails instead, the build has grown since the budgets were set. Do not raise a budget without asking Lucas.

- [ ] **Step 3: Make the hero clip**

The README shows the lead tweet's board of six. Make it from the website's rendered video:

```bash
ls ~/estudos/lucasmarkes.com/website/video/out/hairline-grid-x-1080p.mp4
mkdir -p assets
ffmpeg -y -v error -i ~/estudos/lucasmarkes.com/website/video/out/hairline-grid-x-1080p.mp4 \
  -vf "fps=20,scale=800:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  -loop 0 assets/hero.gif
ls -l assets/hero.gif
```
Expected: `assets/hero.gif` is about 3.7 MB and 800 px wide, and it loops. Open it and check that the six tiles move.

If the `.mp4` is missing, render it first. It is git-ignored output from the website's branch `hairline-video`:
1. `git -C ~/estudos/lucasmarkes.com/website switch hairline-video`.
2. In that repository, run `pnpm build && pnpm start -p 3124`.
3. In a second terminal, run `pnpm video:hairline --fig grid`.

- [ ] **Step 4: Write the README**

This is the npm page and the GitHub page. The gif is linked by its raw GitHub URL, so npm can render it. That URL works once the repository is public (Task 16).

`README.md`
````markdown
# hairline

Six isometric line figures that answer the pointer. For React and for anything with a DOM.

[![npm](https://img.shields.io/npm/v/@lucasmarkes/hairline)](https://www.npmjs.com/package/@lucasmarkes/hairline)
[![CI](https://github.com/lucasmarkes/hairline/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasmarkes/hairline/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@lucasmarkes/hairline)](./LICENSE)

![The six figures: a tray of cards, a field of pillars, a window in layers, a dot matrix, a conveyor belt and a turntable](https://raw.githubusercontent.com/lucasmarkes/hairline/main/assets/hero.gif)

Live, with a slider for every option: **[hairline.lucasmarkes.com](https://hairline.lucasmarkes.com)**

## Install

```sh
pnpm add @lucasmarkes/hairline
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
  return <Terrain radius={4} className="w-96" />;
}
```

The entry is a client module, so a Server Component can render it with no `"use client"` of its own. A component takes its figure's options and every `<div>` attribute, and forwards its ref to the `<div>`.

### Anything else

```ts
import { terrain } from "@lucasmarkes/hairline";

const figure = terrain(document.getElementById("figure")!, { radius: 4 });

figure.update({ radius: 2 });
figure.destroy();
```

A figure draws into the element you give it, at the element's width and a 5:4 aspect ratio. `update` changes options on the running figure; `destroy` removes what the figure added. That is the shape of a Svelte action, so `use:terrain={{ radius }}` works as it is.

## The figures

| Function | Component | What it is | Option | Range | Default |
| --- | --- | --- | --- | --- | --- |
| `riffle` | `Riffle` | A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. | `stagger` | 0 to 90 ms | 40 |
| `terrain` | `Terrain` | Eighty-one pillars on a plinth that rise around the pointer. | `radius` | 1.5 to 5 cells | 3 |
| `exploded` | `Exploded` | An app window in four layers. Moving across opens the gap; moving down picks a layer. | `gap` | 12 to 40 units | 28 |
| `phosphor` | `Phosphor` | A dot matrix that plays a loop, and fades like phosphor where the pointer paints it. | `afterglow` | 150 to 1500 ms | 520 |
| `slow` | `Slow` | Crates riding a belt through a gate. Hovering slows the clock without stopping it. | `rate` | 0.05 to 0.6 × | 0.2 |
| `turntable` | `Turntable` | Blocks on a turntable. A flick spins it; it settles on the nearest quarter turn. | `coast` | 200 to 1500 ms | 650 |

A number outside its range is clamped, and anything that is not a number falls back to the default. The bounds are exported, so a slider or a table never repeats them:

```ts
import { ranges } from "@lucasmarkes/hairline";

ranges.terrain.radius; // { min: 1.5, max: 5, step: 0.25, default: 3, unit: "cells" }
```

Riffle takes two more options: `bands` (boolean) shows the bands the pointer is tested against, and `labels` (up to eight strings) names the cards.

Every figure also takes:

| Option | Type | Default | |
| --- | --- | --- | --- |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | `"auto"` follows the page: an ancestor with class `dark` or `data-theme="dark"`, then the page's `color-scheme`. |
| `label` | `string` | a description in English | The accessible name. In React, `aria-label` does the same. |
| `onRead` | `(text: string) => void` | | The figure's caption, each time it changes: `"03 · Dock"`, `"gap 28.0"`, `"rate 0.20×"`. |

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

- [hairline.lucasmarkes.com](https://hairline.lucasmarkes.com): every figure live, a theme editor, and snippets for Next.js, Vue, Svelte, Astro and a CDN.
- [The essay](https://lucasmarkes.com/lab/hairline): how the figures are drawn, and why with lines.
- [CHANGELOG.md](https://github.com/lucasmarkes/hairline/blob/main/CHANGELOG.md) and [CONTRIBUTING.md](https://github.com/lucasmarkes/hairline/blob/main/CONTRIBUTING.md).

The style is a study of the illustrations on [Linear](https://linear.app)'s home page.

## License

MIT © Lucas Marques
````

- [ ] **Step 5: Write CONTRIBUTING**

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

The port is held to the essay by the parity tests. `packages/hairline/test/parity/golden` holds the SVG each figure drew on the essay's page, under a frozen clock, at four moments of a scripted pointer path; `test/browser/parity.spec.ts` replays the same script against the package, on the same frozen clock, and expects the same SVG and the same caption, character for character.

So a change to an engine that moves a line fails parity, and that is the point. If the change is meant, say so in the pull request and update the golden file for that figure by hand. The goldens are not regenerated from the package: `pnpm -C packages/hairline capture <commit> [url]` records them from the essay's site at that commit, and exists for the day the essay changes.

## Adding an option

1. Add its bounds to `src/ranges.ts`. The site's sliders and tables, and the tests, read them from there.
2. Add it to the figure's options type in `src/index.ts`, with a doc comment that states the range and the default.
3. Add its name to the component's key list in `src/react.tsx`.
4. Describe it in `apps/site/lib/figures.ts`. The site's tests hold its tables and snippets to `ranges`.

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

- [ ] **Step 6: Run the gate and see it pass**

Run: `pnpm run release --static`
Expected:
- Every check passes, including "README.md is the real one" and the three size budgets.
- The three sections that need the network print `– skipped (--static)`.
- The last line is `✓ All checks passed for @lucasmarkes/hairline@0.0.0. Nothing has been published.`

- [ ] **Step 7: Add the static gate to CI**

This is the final CI:

`.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

# A newer push to the same branch or PR cancels the run in flight.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # Corepack activates the pnpm pinned in package.json's packageManager.
      - name: Enable Corepack
        run: corepack enable

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit and component tests
        run: pnpm test

      # The browser tests drive the Chrome that ubuntu-latest ships
      # (playwright.config.ts sets channel: "chrome"), so nothing is downloaded.
      - name: Browser tests
        run: pnpm test:browser

      # The release gate without the network: publint, attw, size budgets, pack
      # and tarball inspection. Its build, typecheck and unit tests replay from
      # the turbo cache the steps above filled.
      - name: Release gate (static)
        run: pnpm run release --static
```

- [ ] **Step 8: Commit and push**

```bash
git add scripts/release.mjs README.md CONTRIBUTING.md assets/hero.gif .github/workflows/ci.yml
git commit -m "Release gate: publint, attw, size budgets and the tarball; README and CONTRIBUTING

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: CI passes, including "Release gate (static)".

### Task 10: The shadcn registry item

**Files:**
- Create: `scripts/base-url.mjs`, `registry/src/hairline.tsx`, `registry/build.mjs`, `registry/validate.mjs`, `apps/site/.gitignore`
- Modify: `package.json` (root, via `pnpm add`: `ajv` as a dev dependency), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the React entry from Task 8. The item's file imports `* as Hairline from "@lucasmarkes/hairline/react"`, and each of its six components takes `ComponentProps<typeof Hairline.X>`.
- Produces:
  - `scripts/base-url.mjs`:
    - `FALLBACK = "http://localhost:3000"`
    - `resolveBase(): { url: string; source: "HAIRLINE_REGISTRY_URL" | "VERCEL_PROJECT_PRODUCTION_URL" | "VERCEL_URL" | "fallback" }`
    - `resolveBaseUrl(): string`: the same, without a trailing slash.

    The site (Task 12) uses `resolveBaseUrl` in `next.config.mjs`.
  - `node registry/build.mjs` writes `apps/site/public/r/hairline.json` and `apps/site/public/r/registry.json`. That folder is generated and git-ignored. The site's `prebuild` and `predev` (Task 12) and `scripts/consumers.mjs` (Task 11) call it.
  - `node registry/validate.mjs` checks the item against shadcn's schema, fetched from `ui.shadcn.com`, and against the rules below. It exits 1 on any problem. The full release gate (Task 9) calls it.

The item is the spec's "The shadcn registry item":
- It depends on `@lucasmarkes/hairline` and nothing else.
- It writes `components/ui/hairline.tsx`, which starts with `"use client";` and re-exports the six components with the token mapping from the spec's table. A `style` the user passes wins over the mapping.
- The item's URL comes from the environment, never from the source.

`validate.mjs` checks each of these. It also refuses an item that points at localhost when it runs on Vercel.

- [ ] **Step 1: Add the schema validator**

Run: `pnpm add -Dw -E ajv@8.20.0`
Expected: the root `package.json` gains `"ajv": "8.20.0"` under `devDependencies`, and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Write the base URL resolver**

`scripts/base-url.mjs`
```js
/**
 * Where this build thinks it lives.
 *
 * Two things need an absolute URL in their output and may not have one in
 * their source: the shadcn registry item, which `shadcn add` fetches by URL,
 * and the Open Graph tags, which crawlers do not resolve relatively. Both ask
 * here, so localhost, a preview and production differ only by environment.
 *
 * The ladder goes from the most specific answer to the least. An explicit
 * override wins; production names itself; anything else on Vercel is a preview
 * and names itself too, which is what makes a preview testable: its registry
 * item installs from that preview.
 */

export const FALLBACK = "http://localhost:3000";

export function resolveBase() {
  const explicit = process.env.HAIRLINE_REGISTRY_URL?.trim();
  if (explicit) return { url: explicit, source: "HAIRLINE_REGISTRY_URL" };

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && productionHost) {
    return { url: `https://${productionHost}`, source: "VERCEL_PROJECT_PRODUCTION_URL" };
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return { url: `https://${deploymentHost}`, source: "VERCEL_URL" };

  return { url: FALLBACK, source: "fallback" };
}

/** The same answer without trailing slashes, ready to have a path added. */
export function resolveBaseUrl() {
  return resolveBase().url.replace(/\/+$/, "");
}
```

- [ ] **Step 3: Write the validator first, and see it fail**

`registry/validate.mjs`
```js
#!/usr/bin/env node
/**
 * Checks the generated registry item against shadcn's own schema, fetched
 * from ui.shadcn.com, and against what this repository promises about it.
 *
 *   node registry/build.mjs && node registry/validate.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";

const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const file = join(import.meta.dirname, "..", "apps", "site", "public", "r", "hairline.json");

let item;
try { item = JSON.parse(readFileSync(file, "utf8")); }
catch { console.error(`No item at ${file}. Run \`node registry/build.mjs\` first.`); process.exit(1); }

const response = await fetch(SCHEMA);
if (!response.ok) { console.error(`Could not fetch ${SCHEMA}: ${response.status}`); process.exit(1); }
const schema = await response.json();
// The schema names its draft by an https URL that Ajv does not know; draft-07 is Ajv's default.
delete schema.$schema;
const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);

const problems = [];
if (!validate(item)) for (const e of validate.errors) problems.push(`schema: ${e.instancePath || "/"} ${e.message}`);
const [source] = item.files ?? [];
if (item.dependencies?.join() !== "@lucasmarkes/hairline") problems.push("dependencies must be exactly @lucasmarkes/hairline");
if (source?.path !== "components/ui/hairline.tsx") problems.push("the file must be components/ui/hairline.tsx");
if (!source?.content?.startsWith('"use client";')) problems.push('the file must start with "use client"');
for (const name of ["Riffle", "Terrain", "Exploded", "Phosphor", "Slow", "Turntable"]) {
  if (!source?.content?.includes(`export function ${name}(`)) problems.push(`the file does not export ${name}`);
}
if (/localhost/.test(JSON.stringify(item)) && process.env.VERCEL) problems.push("the item points at localhost in a deployed build");

if (problems.length) { console.error(problems.map((p) => `  ✗ ${p}`).join("\n")); process.exit(1); }
console.log("  ✓ hairline.json is a valid shadcn registry item");
```

Run: `node registry/validate.mjs`
Expected: FAIL, exit 1, with `No item at …/apps/site/public/r/hairline.json. Run \`node registry/build.mjs\` first.`

- [ ] **Step 4: Write the item's file and the build**

`registry/src/hairline.tsx`
```tsx
"use client";

import type { ComponentProps, CSSProperties } from "react";
import * as Hairline from "@lucasmarkes/hairline/react";

/**
 * hairline, wearing your theme. The six figures from @lucasmarkes/hairline,
 * with their palette mapped to shadcn's tokens, so they follow light, dark and
 * whatever you have made of them. A `style` you pass wins over the mapping.
 *
 * Docs: https://hairline.lucasmarkes.com
 */
const tokens = {
  "--hairline-plate": "var(--background)",
  "--hairline-hi": "var(--foreground)",
  "--hairline-edge": "var(--muted-foreground)",
  "--hairline-mid": "color-mix(in oklab, var(--muted-foreground) 55%, var(--background))",
  "--hairline-lo": "var(--border)",
} as CSSProperties;

export function Riffle({ style, ...props }: ComponentProps<typeof Hairline.Riffle>) {
  return <Hairline.Riffle style={{ ...tokens, ...style }} {...props} />;
}

export function Terrain({ style, ...props }: ComponentProps<typeof Hairline.Terrain>) {
  return <Hairline.Terrain style={{ ...tokens, ...style }} {...props} />;
}

export function Exploded({ style, ...props }: ComponentProps<typeof Hairline.Exploded>) {
  return <Hairline.Exploded style={{ ...tokens, ...style }} {...props} />;
}

export function Phosphor({ style, ...props }: ComponentProps<typeof Hairline.Phosphor>) {
  return <Hairline.Phosphor style={{ ...tokens, ...style }} {...props} />;
}

export function Slow({ style, ...props }: ComponentProps<typeof Hairline.Slow>) {
  return <Hairline.Slow style={{ ...tokens, ...style }} {...props} />;
}

export function Turntable({ style, ...props }: ComponentProps<typeof Hairline.Turntable>) {
  return <Hairline.Turntable style={{ ...tokens, ...style }} {...props} />;
}
```

`registry/build.mjs`
```js
#!/usr/bin/env node
/**
 * Writes the shadcn registry item into the site's public folder.
 *
 * `shadcn add` fetches an item by absolute URL, so a hostname has to be in the
 * output and may not be in the source: it comes from the environment (see
 * scripts/base-url.mjs). Everything under apps/site/public/r is generated.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FALLBACK, resolveBase } from "../scripts/base-url.mjs";

const SRC = join(import.meta.dirname, "src");
const OUT = join(import.meta.dirname, "..", "apps", "site", "public", "r");

const resolved = resolveBase();
if (resolved.source === "fallback") {
  console.warn(`[registry] no site URL in the environment; using ${FALLBACK}.\n[registry] A deployed build that prints this line has published an item that points at localhost.`);
}
const BASE = resolved.url.replace(/\/+$/, "");

const item = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "hairline",
  type: "registry:ui",
  title: "Hairline",
  description: "Six isometric line figures that answer the pointer, with their palette mapped to your theme's tokens.",
  dependencies: ["@lucasmarkes/hairline"],
  files: [{ path: "components/ui/hairline.tsx", type: "registry:ui", content: readFileSync(join(SRC, "hairline.tsx"), "utf8") }],
  docs: `Docs: ${BASE}`,
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "hairline.json"), JSON.stringify(item, null, 2) + "\n");
writeFileSync(join(OUT, "registry.json"), JSON.stringify({ $schema: "https://ui.shadcn.com/schema/registry.json", name: "hairline", homepage: BASE, items: [item] }, null, 2) + "\n");

console.log(`[registry] ${BASE}/r/hairline.json (base from ${resolved.source})`);
```

The generated folder lives in the site, which Task 12 builds. Ignore it there now, with the site's other build output:

`apps/site/.gitignore`
```text
.next/
next-env.d.ts
# written by registry/build.mjs before every build
public/r/
```

- [ ] **Step 5: Build the item and see it validate**

Run:
```bash
node registry/build.mjs
node registry/validate.mjs
HAIRLINE_REGISTRY_URL=https://hairline.lucasmarkes.com node registry/build.mjs
grep -c '"docs": "Docs: https://hairline.lucasmarkes.com"' apps/site/public/r/hairline.json
```
Expected, in order:
1. A warning that names the fallback (`[registry] no site URL in the environment; using http://localhost:3000.`), then `[registry] http://localhost:3000/r/hairline.json (base from fallback)`.
2. `✓ hairline.json is a valid shadcn registry item`.
3. `[registry] https://hairline.lucasmarkes.com/r/hairline.json (base from HAIRLINE_REGISTRY_URL)`.
4. `1`.

Then run `git status --short`. Expected: `apps/site/public/r` is not listed.

The item's file is compiled for real in Task 11, where the Next.js fixture builds it.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/base-url.mjs registry apps/site/.gitignore
git commit -m "Registry: the shadcn item, its URL from the environment, validated against shadcn's schema

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 11: Consumer fixtures: the package as a stranger installs it

**Files:**
- Create: `fixtures/next-app/.gitignore`, `fixtures/next-app/package.json`, `fixtures/next-app/tsconfig.json`, `fixtures/next-app/next.config.mjs`
- Create: `fixtures/next-app/app/layout.tsx`, `fixtures/next-app/app/page.tsx`, `fixtures/next-app/app/vanilla.tsx`, `fixtures/next-app/app/registry/page.tsx`
- Create: `fixtures/vite-vanilla/.gitignore`, `fixtures/vite-vanilla/package.json`, `fixtures/vite-vanilla/tsconfig.json`, `fixtures/vite-vanilla/index.html`, `fixtures/vite-vanilla/src/main.ts`
- Create: `scripts/consumers.mjs`, `.github/workflows/consumers.yml`

**Interfaces:**
- Consumes:
  - From Tasks 6 and 8: the built package (`pnpm build`). The fixtures use only its public entries:
    - `riffle`…`turntable`, `ranges`, `Figure` and `RiffleOptions` from `@lucasmarkes/hairline`.
    - `Riffle` and `Slow` from `@lucasmarkes/hairline/react`.
  - From Task 10: `registry/build.mjs` and `apps/site/public/r/hairline.json`.
  - From Task 7: `@playwright/test`, which `consumers.mjs` resolves from `packages/hairline`, using the system Chrome.
- Produces:
  - `node scripts/consumers.mjs [next|vite]` exits 1 on any failed check. The full release gate (Task 9) calls it.
  - The `Consumers` workflow runs it on pull requests that touch what ships.

This is layer 6 of the spec. The fixtures are not workspace packages: `pnpm-workspace.yaml` lists only `packages/*` and `apps/*`. `consumers.mjs` copies each fixture to a temporary folder outside the repository and installs the packed tarball there with npm, so nothing resolves through a workspace symlink.

What it checks:
- **Next.js**:
  - A Server Component page renders the React components.
  - The server sends empty `<div>`s and no `<svg>`.
  - A client component on the same page uses the vanilla entry.
  - The registry item's file is written where `shadcn add` writes it, compiled by the app, and draws with the app's `--background`.
- **Both apps**:
  - Every figure draws at 5:4.
  - All figures share one adopted stylesheet and one frame loop: one `requestAnimationFrame` per frame, however many figures are mounted.
  - The console stays clean.
- **Vite**: `onRead` reaches the page.

- [ ] **Step 1: Write the Next.js fixture**

`fixtures/next-app/.gitignore`
```text
node_modules/
.next/
next-env.d.ts
package-lock.json
# written by scripts/consumers.mjs from the registry item
components/
```

`fixtures/next-app/package.json`
```json
{
  "name": "hairline-fixture-next",
  "private": true,
  "scripts": {
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "5.9.3"
  }
}
```

`fixtures/next-app/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "skipLibCheck": true,
    "allowJs": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`fixtures/next-app/next.config.mjs`
```js
/** A consumer's project, as plain as one gets: no transpilePackages, no aliases. */
export default {};
```

`fixtures/next-app/app/layout.tsx`
```tsx
import type { ReactNode } from "react";

export const metadata = { title: "hairline fixture", icons: { icon: "data:," } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`fixtures/next-app/app/page.tsx`
```tsx
import { Riffle, Slow } from "@lucasmarkes/hairline/react";
import { Vanilla } from "./vanilla";

/**
 * A Server Component: no "use client" here. The components come from the
 * React entry, which marks itself as a client module; the third figure comes
 * from the vanilla entry, so the page loads both entries at once.
 */
export default function Page() {
  return (
    <main style={{ display: "grid", gap: 24, width: 400, margin: "40px auto" }}>
      <Riffle id="riffle" labels={["Radial menu", "Drum"]} />
      <Slow id="slow" rate={0.4} theme="dark" />
      <Vanilla />
    </main>
  );
}
```

`fixtures/next-app/app/vanilla.tsx`
```tsx
"use client";

import { useEffect, useRef } from "react";
import { phosphor } from "@lucasmarkes/hairline";

export function Vanilla() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const figure = phosphor(ref.current!, { afterglow: 900 });
    return () => figure.destroy();
  }, []);
  return <div id="phosphor" ref={ref} />;
}
```

`fixtures/next-app/app/registry/page.tsx`
```tsx
import type { CSSProperties } from "react";
import { Terrain } from "@/components/ui/hairline";

/** shadcn's tokens, as a dark theme would define them. */
const tokens = { "--background": "#101014", "--foreground": "#fafafa", "--muted-foreground": "#a1a1aa", "--border": "#27272a" } as CSSProperties;

/**
 * The shadcn registry item, as `shadcn add` would leave it:
 * scripts/consumers.mjs writes components/ui/hairline.tsx from the built item
 * before it builds this app.
 */
export default function Page() {
  return (
    <main style={{ width: 400, margin: "40px auto", background: "var(--background)", ...tokens }}>
      <Terrain id="themed" />
    </main>
  );
}
```

- [ ] **Step 2: Write the Vite fixture**

`fixtures/vite-vanilla/.gitignore`
```text
node_modules/
dist/
package-lock.json
```

`fixtures/vite-vanilla/package.json`
```json
{
  "name": "hairline-fixture-vite",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vite": "8.3.2"
  }
}
```

`fixtures/vite-vanilla/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": false
  },
  "include": ["src"]
}
```

`fixtures/vite-vanilla/index.html`
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>hairline fixture</title>
<link rel="icon" href="data:,">
<style>
  main { display: grid; grid-template-columns: repeat(3, 300px); gap: 24px; margin: 40px; }
</style>
</head>
<body>
  <main>
    <div id="riffle"></div>
    <div id="terrain"></div>
    <div id="exploded"></div>
    <div id="phosphor"></div>
    <div id="slow"></div>
    <div id="turntable"></div>
  </main>
  <output id="read"></output>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`fixtures/vite-vanilla/src/main.ts`
```ts
import { exploded, phosphor, ranges, riffle, slow, terrain, turntable, type Figure, type RiffleOptions } from "@lucasmarkes/hairline";

/** No framework: six elements, six calls. */
const el = (id: string) => document.getElementById(id)!;
const read = el("read");

const cards: Figure<RiffleOptions> = riffle(el("riffle"), {
  stagger: ranges.riffle.stagger.max,
  labels: ["Radial menu", "Drum"],
  onRead: (text) => { read.textContent = text; },
});
terrain(el("terrain"), { radius: 4 });
exploded(el("exploded"));
phosphor(el("phosphor"), { theme: "dark" });
slow(el("slow"));
turntable(el("turntable"));

cards.update({ bands: true });
```

- [ ] **Step 3: Write the runner**

`scripts/consumers.mjs`
```js
#!/usr/bin/env node
/**
 * Layer 6: the package as a stranger gets it. Packs it, installs the tarball
 * with npm into a copy of each fixture (outside the workspace, so nothing
 * resolves through a symlink), builds the fixture with its own toolchain,
 * serves the build and opens it in Chrome.
 *
 *   node scripts/consumers.mjs          both fixtures
 *   node scripts/consumers.mjs next     one of them (next | vite)
 *
 * Needs the network (npm installs next, react and vite) and a built package.
 */
import { execFileSync, spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PKG = join(ROOT, "packages/hairline");
const { chromium } = createRequire(join(PKG, "package.json"))("@playwright/test");

const FIXTURES = {
  next: { dir: "fixtures/next-app", port: 4311, serve: (port) => ["npx", ["next", "start", "-p", String(port)]], figures: ["riffle", "slow", "phosphor"] },
  vite: { dir: "fixtures/vite-vanilla", port: 4312, serve: (port) => ["npx", ["vite", "preview", "--port", String(port), "--strictPort"]], figures: ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"] },
};
const only = process.argv[2];
if (only && !FIXTURES[only]) { console.error(`Unknown fixture "${only}". Use: ${Object.keys(FIXTURES).join(" | ")}`); process.exit(2); }

let failures = 0;
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => (ok ? pass(good) : fail(bad));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });
function step(label, cmd, args, cwd) {
  try { run(cmd, args, cwd); pass(label); return true; }
  catch (err) { fail(`${label}\n${String((err.stdout ?? "") + (err.stderr ?? "") || err.message).trim().split("\n").slice(-30).join("\n")}`); return false; }
}
async function up(url, tries = 100) {
  for (let i = 0; i < tries; i++) {
    try { if ((await fetch(url)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * Counts the animation frames requested between one frame and the next. A
 * page with any number of figures keeps one loop, so it asks for one frame per
 * frame; a second copy of the engine would ask for two.
 */
const COUNT_FRAMES = `(() => {
  const raf = window.requestAnimationFrame.bind(window);
  let asked = 0;
  window.__asked = [];
  window.requestAnimationFrame = (fn) => { asked++; return raf(fn); };
  const tally = () => { window.__asked.push(asked); asked = 0; raf(tally); };
  raf(tally);
})();`;

const staging = mkdtempSync(join(tmpdir(), "hairline-consumers-"));
console.log("\n▸ tarball");
step("pnpm pack", "pnpm", ["pack", "--pack-destination", staging], PKG);
const tgz = readdirSync(staging).filter((f) => f.endsWith(".tgz")).map((f) => join(staging, f))[0];
if (!tgz) { console.error("\nNo tarball to install.\n"); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, fx] of Object.entries(FIXTURES)) {
  if (only && only !== name) continue;
  console.log(`\n▸ ${fx.dir}`);
  const dir = join(staging, name);
  cpSync(join(ROOT, fx.dir), dir, { recursive: true, filter: (src) => !/\/(node_modules|\.next|dist)$/.test(src) });
  if (name === "next") {
    // what `shadcn add` does with the registry item: write its file into the app
    run("node", ["registry/build.mjs"], ROOT);
    const item = JSON.parse(readFileSync(join(ROOT, "apps/site/public/r/hairline.json"), "utf8"));
    for (const file of item.files) {
      mkdirSync(join(dir, file.path, ".."), { recursive: true });
      writeFileSync(join(dir, file.path), file.content);
    }
    pass("the registry item's file is in place");
  }
  if (!step("npm install (the tarball, as a dependency)", "npm", ["install", "--no-audit", "--no-fund", tgz], dir)) continue;
  if (!step("build (the fixture's own typecheck and bundler)", "npm", ["run", "build"], dir)) continue;

  const [cmd, args] = fx.serve(fx.port);
  const server = spawn(cmd, args, { cwd: dir, stdio: "ignore" });
  try {
    const url = `http://localhost:${fx.port}/`;
    if (!(await up(url))) { fail(`nothing answered at ${url}`); continue; }

    if (name === "next") {
      const html = await (await fetch(url)).text();
      check(/<div id="riffle"[^>]*><\/div>/.test(html), "the server renders an empty <div> for a figure", "the server-rendered page has no empty <div id=\"riffle\">");
      check(!html.includes("<svg"), "no figure is drawn on the server", "the server-rendered page already has an <svg>");
    }

    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await context.addInitScript(COUNT_FRAMES);
    const page = await context.newPage();
    const noise = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(`${m.type()}: ${m.text()}`); });
    page.on("pageerror", (e) => noise.push(`pageerror: ${e}`));
    await page.goto(url, { waitUntil: "networkidle" });

    for (const id of fx.figures) {
      const drawn = await page.locator(`#${id} svg > *`).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
      const box = drawn ? await page.locator(`#${id} svg`).boundingBox() : null;
      check(drawn && box.width > 100 && Math.abs(box.width / box.height - 1.25) < 0.01, `${id} is drawn, 5:4`, `${id} is not drawn (box ${JSON.stringify(box)})`);
    }
    check((await page.locator("style[data-hairline-style]").count()) === 0 && (await page.evaluate(() => document.adoptedStyleSheets.length)) === 1,
      "one adopted stylesheet for every figure", "the figures did not share one adopted stylesheet");

    await page.waitForTimeout(500);
    const asked = await page.evaluate(() => { const from = window.__asked.length; return new Promise((r) => setTimeout(() => r(window.__asked.slice(from)), 500)); });
    check(asked.length > 10 && asked.every((n) => n === 1), `one loop for ${fx.figures.length} figures (${asked.length} frames, one request each)`, `expected one frame request per frame, saw ${[...new Set(asked)].join(", ")} over ${asked.length} frames`);

    if (name === "next") {
      await page.goto(`${url}registry`, { waitUntil: "networkidle" });
      const fill = await page.locator("#themed svg path").first().evaluate((el) => getComputedStyle(el).fill).catch(() => "");
      check(fill === "rgb(16, 16, 20)", "the registry item draws with the app's tokens", `the registry item's figure is filled ${fill || "(not drawn)"}, not --background`);
    }
    if (name === "vite") check((await page.locator("#read").textContent()) !== "", "onRead reached the page", "onRead never wrote to the page");
    check(noise.length === 0, "console is clean", `console:\n${noise.join("\n")}`);
    await context.close();
  } finally {
    server.kill();
  }
}
await browser.close();
rmSync(staging, { recursive: true, force: true });

if (failures) { console.error(`\n${failures} consumer check${failures > 1 ? "s" : ""} failed.\n`); process.exit(1); }
console.log("\nBoth consumers install, build and draw.\n");
```

- [ ] **Step 4: Run it**

Run: `pnpm build && node scripts/consumers.mjs`
Expected: it ends with `Both consumers install, build and draw.` and exits 0. Every line under `▸ fixtures/next-app` and `▸ fixtures/vite-vanilla` is a `✓`, including:
- `one loop for 3 figures (… frames, one request each)` for Next.js.
- `one loop for 6 figures (…)` for Vite.
- `the registry item draws with the app's tokens`.

It needs the network, because npm installs next, react and vite. The first run takes a few minutes.

A failure here is a real defect in what ships. Fix the package or the item, never the fixture's expectations. In particular:
- A second request per frame means the React entry bundled its own copy of the core. Check the `core-by-package-name` plugin in Task 8's `tsup.config.ts`.
- A server-rendered `<svg>` means a figure drew outside an effect.

- [ ] **Step 5: Run the gate's network checks for the first time**

Run: `pnpm run release`
Expected:
- Every section passes up to `▸ registry`. The consumers run again inside the gate.
- Under `▸ registry`:
  - `@lucasmarkes/hairline is unclaimed on the registry`, unless the name was claimed in the meantime. If so, stop and tell Lucas.
  - A note that npm auth is not checked, or `logged in as the scope's owner`.
- The last line is `✓ All checks passed for @lucasmarkes/hairline@0.0.0. Nothing has been published.`

- [ ] **Step 6: Run the fixtures in CI on pull requests**

`.github/workflows/consumers.yml`
```yaml
name: Consumers

# Layer 6: the packed tarball installed in a Next.js app and a Vite app, built
# and opened in a browser. Slow and network-bound, so it runs only when what
# ships (or what checks it) changes. The release gate runs it too.
on:
  pull_request:
    paths:
      - 'packages/**'
      - 'fixtures/**'
      - 'scripts/consumers.mjs'
      - '.github/workflows/consumers.yml'

concurrency:
  group: consumers-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  consumers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Enable Corepack
        run: corepack enable

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Install, build and open the fixtures
        run: node scripts/consumers.mjs
```

- [ ] **Step 7: Commit and push**

```bash
git add fixtures scripts/consumers.mjs .github/workflows/consumers.yml
git commit -m "Tests: the packed tarball installed in a Next.js app and a Vite app, built and opened in Chrome

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: CI passes. The `Consumers` workflow runs on pull requests only, so this push does not start it.

### Task 12: The site: one page of showcase and docs

**Files:**
- Create: `apps/site/package.json`, `apps/site/turbo.json`, `apps/site/tsconfig.json`, `apps/site/next.config.mjs`, `apps/site/postcss.config.mjs`, `apps/site/vitest.config.ts`, `apps/site/playwright.config.ts`, `apps/site/public/icon.svg`
- Create: `apps/site/lib/figures.ts`, `apps/site/lib/snippets.ts`, `apps/site/lib/llms.ts`, `apps/site/lib/highlight.ts`
- Create: `apps/site/app/globals.css`, `apps/site/app/layout.tsx`, `apps/site/app/page.tsx`, `apps/site/app/llms.txt/route.ts`
- Create: `apps/site/components/tile.tsx`, `apps/site/components/figure-demo.tsx`, `apps/site/components/tabs.tsx`, `apps/site/components/theme-editor.tsx`
- Test: `apps/site/test/docs.test.ts`, `apps/site/test/site.spec.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes:
  - The package through its public entries only, never `src/`:
    - `ranges`, `Range` and the six functions from `@lucasmarkes/hairline`.
    - The six components and their props types from `@lucasmarkes/hairline/react`.
  - From Task 10: `resolveBaseUrl()` from `scripts/base-url.mjs`, and `node registry/build.mjs` as the site's `prebuild` and `predev`.
- Produces:
  - `@hairline/site`, a private workspace package. Its scripts are `build`, `dev` (port 3000), `start`, `typecheck`, `test` (Vitest) and `test:browser` (Playwright against `next start` on port 4320), so the root's turbo tasks run it with the package.
  - `process.env.NEXT_PUBLIC_SITE_URL`, set at build.
  - `lib/figures.ts`:
    - `FigureId`, `FigureDoc`, `FIGURES`, `CARDS`, `span(range)`, `shown(value, range)`.
    - `Row`, `rows(doc)`, `SHARED`, `THEME`, `NOTES`, `LINKS`.
  - `lib/snippets.ts`: `PACKAGE`, `install(base)`, `react(doc, value)`, `vanilla(doc, value)`, `FRAMEWORKS`, `themeCss(colors, stroke)`.
  - `lib/llms.ts`: `llms(base): string`.
  - `lib/highlight.ts`: `LIVE`, `highlight(code, lang, initial?)`, `plain(code)`.
  - `components/tile.tsx`: `Tile({ id, index, name, options?, style? })`. Task 13's Open Graph route uses it.
  - Routes: `/` and `/llms.txt`, both static, and `/r/*.json`, generated by `prebuild`.

The page is the spec's "The site", in order:
1. **Hero**: six live tiles and the install tabs (pnpm, npm, yarn, bun, shadcn).
2. **One section per figure**: a tile, a slider built from `ranges`, React and vanilla code that follows the slider, and the props table.
3. **Theme**: a live editor that writes the CSS.
4. **Frameworks**: Next.js, Vue, Svelte, Astro and plain HTML from a CDN.
5. **Notes**.
6. **Footer**: GitHub, npm, the essay, the credit to Linear, MIT.

Code is highlighted with Shiki at build. The live value is a span marked with `LIVE` that the client swaps, so no highlighter ships to the browser.

`docs.test.ts` is the spec's "a test asserts that the props tables match `ranges`". It also checks that the snippets install from the address the site is built for, and that `/llms.txt` has no hole in it (no `undefined`, `NaN` or `[object`).

- [ ] **Step 1: Write the site's package and configuration**

`apps/site/package.json`
```json
{
  "name": "@hairline/site",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "prebuild": "node ../../registry/build.mjs",
    "build": "next build",
    "predev": "node ../../registry/build.mjs",
    "dev": "next dev -p 3000",
    "start": "next start -p 3000",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:browser": "playwright test",
    "clean": "rm -rf .next .turbo public/r"
  },
  "dependencies": {
    "@lucasmarkes/hairline": "workspace:*",
    "@vercel/analytics": "2.0.1",
    "geist": "1.7.2",
    "next": "16.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "shiki": "4.5.0"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@tailwindcss/postcss": "4.3.3",
    "@types/node": "^22",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3",
    "vitest": "5.0.3"
  }
}
```

The site's build reads files outside its folder and depends on the deploy's address, so its turbo task names both:

`apps/site/turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "inputs": ["$TURBO_DEFAULT$", "../../registry/**", "../../scripts/base-url.mjs"],
      "outputs": [".next/**", "!.next/cache/**", "public/r/**"],
      "env": ["HAIRLINE_REGISTRY_URL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"]
    }
  }
}
```

`apps/site/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "noEmit": true,
    "jsx": "react-jsx",
    "allowJs": true,
    "incremental": true,
    "resolveJsonModule": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/site/next.config.mjs`
```js
import { resolveBaseUrl } from "../../scripts/base-url.mjs";

/**
 * The site's own address, resolved once at build (see scripts/base-url.mjs):
 * the Open Graph tags, the shadcn command and /llms.txt all need it absolute.
 */
export default {
  env: { NEXT_PUBLIC_SITE_URL: resolveBaseUrl() },
};
```

`apps/site/postcss.config.mjs`
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`apps/site/vitest.config.ts`
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
```

`apps/site/playwright.config.ts`
```ts
import { defineConfig } from "@playwright/test";

/** The built site, served by `next start`. Run `pnpm build` first; turbo does. */
export default defineConfig({
  testDir: "test",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: { channel: "chrome", baseURL: "http://localhost:4320", viewport: { width: 1200, height: 900 } },
  webServer: { command: "pnpm exec next start -p 4320", url: "http://localhost:4320", reuseExistingServer: !process.env.CI },
});
```

`apps/site/public/icon.svg`
```text
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fff"/><path d="M16 7 26 12.5 16 18 6 12.5Z M6 12.5v7L16 25l10-5.5v-7 M16 18v7" fill="none" stroke="#232327" stroke-width="1.5" stroke-linejoin="round"/></svg>
```

Run: `pnpm install`
Expected: the site's dependencies install, and `pnpm-lock.yaml` gains the `apps/site` importer.

- [ ] **Step 2: Write the docs test, and see it fail**

`apps/site/test/docs.test.ts`
````ts
import { describe, expect, it } from "vitest";
import { ranges } from "@lucasmarkes/hairline";
import * as components from "@lucasmarkes/hairline/react";
import * as figures from "@lucasmarkes/hairline";
import { FIGURES, SHARED, rows, span } from "@/lib/figures";
import { llms } from "@/lib/llms";
import { FRAMEWORKS, install, react, vanilla } from "@/lib/snippets";

/** The docs are generated from the package, and these check that nothing was written by hand around it. */

describe("the props tables", () => {
  it("have one figure per entry of ranges, in the same order", () => {
    expect(FIGURES.map((f) => f.id)).toEqual(Object.keys(ranges));
  });

  it.each(FIGURES)("$name's first row is its numeric option, with the package's default and bounds", (doc) => {
    const range = (ranges[doc.id] as Record<string, { min: number; max: number; default: number }>)[doc.option];
    const [row] = rows(doc);
    expect(range).toBeDefined();
    expect(row.name).toBe(doc.option);
    expect(row.type).toBe("number");
    expect(row.default).toBe(String(range.default));
    expect(row.description).toContain(String(range.min));
    expect(row.description).toContain(String(range.max));
  });

  it("list Riffle's two other options and nobody else's", () => {
    expect(rows(FIGURES[0]).map((r) => r.name)).toEqual(["stagger", "bands", "labels"]);
    for (const doc of FIGURES.slice(1)) expect(rows(doc)).toHaveLength(1);
  });

  it("list the shared options", () => {
    expect(SHARED.map((r) => r.name)).toEqual(["theme", "label", "onRead"]);
  });

  it("write a range the way a person would", () => {
    expect(span(ranges.riffle.stagger)).toBe("0 to 90 ms");
    expect(span(ranges.slow.rate)).toBe("0.05× to 0.6×");
    expect(span(ranges.exploded.gap)).toBe("12 to 40 units");
  });
});

describe("the snippets", () => {
  it.each(FIGURES)("name an export that exists: $name", (doc) => {
    expect(components).toHaveProperty(doc.name);
    expect(figures).toHaveProperty(doc.id);
    expect(react(doc, 7)).toContain(`<${doc.name} ${doc.option}={7}`);
    expect(vanilla(doc, 7)).toContain(`${doc.id}(document.getElementById("figure")!, { ${doc.option}: 7 })`);
  });

  it("install from the address the site is built for", () => {
    const commands = install("https://example.test");
    expect(commands.map((c) => c.label)).toEqual(["pnpm", "npm", "yarn", "bun", "shadcn"]);
    expect(commands[4].code).toBe("npx shadcn@latest add https://example.test/r/hairline.json");
  });

  it("cover the five frameworks", () => {
    expect(FRAMEWORKS.map((f) => f.label)).toEqual(["Next.js", "Vue", "Svelte", "Astro", "CDN"]);
  });
});

describe("/llms.txt", () => {
  const text = llms("https://example.test");

  it.each(FIGURES)("documents $name with its range and both snippets", (doc) => {
    expect(text).toContain(`### ${doc.name}`);
    expect(text).toContain(span(doc.range));
    expect(text).toContain(react(doc, doc.range.default).trimEnd());
    expect(text).toContain(vanilla(doc, doc.range.default).trimEnd());
  });

  it("names every theme property and the registry item", () => {
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(text).toContain(`--hairline-${key}`);
    expect(text).toContain("https://example.test/r/hairline.json");
  });

  it("has no hole in it", () => {
    // outside the code blocks, where `undefined` is a word TypeScript uses
    const prose = text.replace(/```[\s\S]*?```/g, "");
    expect(prose).not.toMatch(/undefined|NaN|\[object/);
  });
});
````

Run: `pnpm --filter @hairline/site test`
Expected: FAIL with `Error: Cannot find package '@/lib/figures' imported from …/test/docs.test.ts`.

- [ ] **Step 3: Write the docs data**

Everything the page says about an option comes from `ranges` and from these four files. The page and `/llms.txt` read the same text.

`apps/site/lib/figures.ts`
```ts
import { ranges, type Range } from "@lucasmarkes/hairline";

/**
 * The page's copy about each figure. Everything numeric comes from the
 * package's own `ranges`, so a slider, a props table and /llms.txt cannot
 * disagree with what the figure does.
 */

export type FigureId = keyof typeof ranges;

export type FigureDoc = {
  id: FigureId;
  /** The React component, and the figure's name on the page. */
  name: string;
  /** The figure's one numeric option. */
  option: string;
  range: Range;
  summary: string;
  optionDoc: string;
};

const COPY: Record<FigureId, { name: string; summary: string; optionDoc: string }> = {
  riffle: {
    name: "Riffle",
    summary: "A tray of eight cards. The card under the pointer stands up and its neighbours lean after it. The arrow keys walk the cards.",
    optionDoc: "The delay between one card and the next as they lean.",
  },
  terrain: {
    name: "Terrain",
    summary: "Eighty-one pillars on a plinth. They rise around the pointer and settle back into a dune with two rises.",
    optionDoc: "How far the rise reaches around the pointer.",
  },
  exploded: {
    name: "Exploded",
    summary: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    optionDoc: "The space between two layers when fully open, in viewBox units (the drawing is 400 × 320).",
  },
  phosphor: {
    name: "Phosphor",
    summary: "A seven by seven dot matrix playing a loop. Where the pointer paints, the dots fade like phosphor.",
    optionDoc: "How long a painted dot takes to fade.",
  },
  slow: {
    name: "Slow",
    summary: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    optionDoc: "The clock's speed while the pointer is over the figure, as a multiple of normal.",
  },
  turntable: {
    name: "Turntable",
    summary: "Blocks on a turntable. A flick across it spins it, and it settles on the nearest quarter turn.",
    optionDoc: "How long a flick keeps the table turning.",
  },
};

export const FIGURES: FigureDoc[] = (Object.keys(ranges) as FigureId[]).map((id) => {
  const [option, range] = Object.entries(ranges[id])[0] as [string, Range];
  return { id, option, range, ...COPY[id] };
});

/** Names for Riffle's eight cards on this page. */
export const CARDS = ["Radial menu", "Drum", "Dock", "Condense", "Settle", "Upload", "Badge", "Spark"] as const;

/** "0 to 90 ms", "0.05× to 0.6×", "12 to 40 units" */
export function span(range: Range): string {
  if (range.unit === "×") return `${range.min}× to ${range.max}×`;
  return `${range.min} to ${range.max} ${range.unit === "u" ? "units" : range.unit}`;
}

/** A value as the page shows it next to a slider: "40 ms", "0.2×" */
export function shown(value: number, range: Range): string {
  return range.unit === "×" ? `${value}×` : `${value} ${range.unit}`;
}

export type Row = { name: string; type: string; default: string; description: string };

/** A figure's own options, the numeric one first. */
export function rows(doc: FigureDoc): Row[] {
  const out: Row[] = [
    { name: doc.option, type: "number", default: String(doc.range.default), description: `${doc.optionDoc} ${span(doc.range)}.` },
  ];
  if (doc.id === "riffle") {
    out.push(
      { name: "bands", type: "boolean", default: "false", description: "Shows the bands the pointer is tested against." },
      { name: "labels", type: "readonly string[]", default: "[]", description: "Names for the eight cards, card 01 first. A named card is read out as \"03 · Dock\", an unnamed one as \"03\"." },
    );
  }
  return out;
}

/** The options every figure takes. */
export const SHARED: Row[] = [
  { name: "theme", type: "\"auto\" | \"light\" | \"dark\"", default: "\"auto\"", description: "\"auto\" follows the page: an ancestor with class dark or data-theme=\"dark\", then the page's color-scheme." },
  { name: "label", type: "string", default: "a description in English", description: "The accessible name. In React, aria-label does the same." },
  { name: "onRead", type: "(text: string) => void", default: "", description: "The figure's caption, each time it changes. Called once at mount with the rest caption." },
];

/** The public theme: six custom properties, set on the figure or on anything above it. */
export const THEME: { property: string; role: string }[] = [
  { property: "--hairline-plate", role: "The fill of every plate. It hides what is drawn behind, so it must be the colour the figure sits on." },
  { property: "--hairline-hi", role: "The stroke of what is lit: the card pulled, the layer picked, a dot that is on." },
  { property: "--hairline-edge", role: "Silhouettes, and dots at half strength." },
  { property: "--hairline-mid", role: "Every other stroke." },
  { property: "--hairline-lo", role: "What recedes: guides, and dots that are off." },
  { property: "--hairline-stroke", role: "The stroke width, in CSS pixels at any size. Default 0.9." },
];

export const NOTES: { title: string; body: string }[] = [
  { title: "Accessibility", body: "A figure is an image with a description you can replace with label. Riffle is the exception: it is a focusable group, the arrow keys walk its cards, and a live region reads the card out." },
  { title: "Reduced motion", body: "With prefers-reduced-motion, the figures that play on their own (Phosphor and Slow) hold still, and every figure still answers the pointer." },
  { title: "Performance", body: "Every figure on a page shares one requestAnimationFrame loop. A figure off screen, or at rest, does no work, and the loop stops when nothing is moving." },
  { title: "Server rendering", body: "On the server a figure is an empty box with a 5:4 aspect ratio, so nothing shifts when it draws. The drawing itself happens in the browser." },
  { title: "Size", body: "No dependencies. A bundle that imports one figure carries one figure." },
];

export const LINKS = {
  github: "https://github.com/lucasmarkes/hairline",
  npm: "https://www.npmjs.com/package/@lucasmarkes/hairline",
  essay: "https://lucasmarkes.com/lab/hairline",
  linear: "https://linear.app",
} as const;
```

`apps/site/lib/snippets.ts`
```ts
import type { FigureDoc } from "./figures";

/**
 * Every piece of code the page shows, as plain text. The page highlights it;
 * /llms.txt prints it as it is.
 */

export const PACKAGE = "@lucasmarkes/hairline";

export function install(base: string): { label: string; code: string }[] {
  return [
    { label: "pnpm", code: `pnpm add ${PACKAGE}` },
    { label: "npm", code: `npm install ${PACKAGE}` },
    { label: "yarn", code: `yarn add ${PACKAGE}` },
    { label: "bun", code: `bun add ${PACKAGE}` },
    { label: "shadcn", code: `npx shadcn@latest add ${base}/r/hairline.json` },
  ];
}

export function react(doc: FigureDoc, value: string | number): string {
  return `import { ${doc.name} } from "${PACKAGE}/react";

export function Figure() {
  return <${doc.name} ${doc.option}={${value}} className="w-80" />;
}
`;
}

export function vanilla(doc: FigureDoc, value: string | number): string {
  return `import { ${doc.id} } from "${PACKAGE}";

const figure = ${doc.id}(document.getElementById("figure")!, { ${doc.option}: ${value} });

// later
figure.update({ ${doc.option}: ${doc.range.max} });
figure.destroy();
`;
}

export const FRAMEWORKS: { label: string; lang: string; code: string }[] = [
  {
    label: "Next.js",
    lang: "tsx",
    code: `// app/page.tsx — a Server Component. The React entry is a client module,
// so there is no "use client" to write.
import { Terrain } from "${PACKAGE}/react";

export default function Page() {
  return <Terrain radius={4} className="w-96" />;
}
`,
  },
  {
    label: "Vue",
    lang: "vue",
    code: `<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { terrain, type Figure, type TerrainOptions } from "${PACKAGE}";

const el = ref<HTMLElement>();
let figure: Figure<TerrainOptions> | undefined;

onMounted(() => { figure = terrain(el.value!, { radius: 4 }); });
onBeforeUnmount(() => figure?.destroy());
</script>

<template>
  <div ref="el" />
</template>
`,
  },
  {
    label: "Svelte",
    lang: "svelte",
    code: `<script lang="ts">
  import { terrain, type TerrainOptions } from "${PACKAGE}";

  // A figure has the shape of a Svelte action: { update, destroy }.
  const figure = (el: HTMLElement, options: TerrainOptions) => terrain(el, options);
  let radius = 4;
</script>

<div use:figure={{ radius }} />
`,
  },
  {
    label: "Astro",
    lang: "astro",
    code: `<div id="figure"></div>

<script>
  import { terrain } from "${PACKAGE}";

  terrain(document.getElementById("figure")!, { radius: 4 });
</script>
`,
  },
  {
    label: "CDN",
    lang: "html",
    code: `<div id="figure" style="width: 400px"></div>

<script type="module">
  import { terrain } from "https://esm.sh/${PACKAGE}";

  terrain(document.getElementById("figure"), { radius: 4 });
</script>
`,
  },
];

/** What the theme editor prints. */
export function themeCss(colors: Record<string, string>, stroke: number): string {
  const lines = Object.entries(colors).map(([k, v]) => `  --hairline-${k}: ${v};`);
  return `.figures {\n${lines.join("\n")}\n  --hairline-stroke: ${stroke};\n}\n`;
}
```

`apps/site/lib/llms.ts`
````ts
import { FIGURES, LINKS, NOTES, SHARED, THEME, rows, type Row } from "./figures";
import { FRAMEWORKS, PACKAGE, install, react, vanilla } from "./snippets";

/** The page as plain text, for a model to read: the same data, the same copy. */

const table = (list: Row[]) => list.map((r) => `- \`${r.name}\` (${r.type}${r.default ? `, default ${r.default}` : ""}): ${r.description}`).join("\n");
const fence = (lang: string, code: string) => "```" + lang + "\n" + code.trimEnd() + "\n```";

export function llms(base: string): string {
  const out: string[] = [
    "# hairline",
    "",
    `> ${PACKAGE}: six isometric line figures that answer the pointer. SVG, no dependencies, ESM only. A function per figure, and a React component per figure.`,
    "",
    "## Install",
    "",
    fence("sh", install(base).map((i) => i.code).join("\n")),
    "",
    "## Use",
    "",
    `Vanilla: \`import { ${FIGURES.map((f) => f.id).join(", ")} } from "${PACKAGE}"\`. Each function takes an element and options, draws into the element, and returns \`{ update(options), destroy() }\`.`,
    "",
    `React: \`import { ${FIGURES.map((f) => f.name).join(", ")} } from "${PACKAGE}/react"\`. Each component renders a \`<div>\`, takes the figure's options and any \`<div>\` attribute, and forwards its ref. The entry is a client module: render it from a Server Component without writing "use client".`,
    "",
    "A figure fills its element's width at a 5:4 aspect ratio. Give the element a width.",
    "",
    "## Options every figure takes",
    "",
    table(SHARED),
    "",
    "## Figures",
  ];
  for (const doc of FIGURES) {
    out.push("", `### ${doc.name}`, "", doc.summary, "", table(rows(doc)), "", fence("tsx", react(doc, doc.range.default)), "", fence("ts", vanilla(doc, doc.range.default)));
  }
  out.push(
    "", "## Ranges", "",
    `\`import { ranges } from "${PACKAGE}"\` gives every numeric option's \`min\`, \`max\`, \`step\`, \`default\` and \`unit\`. A value outside its range is clamped; a value that is not a number becomes the default.`,
    "", "## Theme", "",
    "Six CSS custom properties, set on the figure or on any ancestor. Without them a figure is light, or dark when an ancestor has class `dark` or `data-theme=\"dark\"`, or when the page's `color-scheme` is dark.",
    "", THEME.map((t) => `- \`${t.property}\`: ${t.role}`).join("\n"),
    "", "## Frameworks",
  );
  for (const f of FRAMEWORKS) out.push("", `### ${f.label}`, "", fence(f.lang, f.code));
  out.push("", "## Notes", "", NOTES.map((n) => `- ${n.title}: ${n.body}`).join("\n"));
  out.push("", "## Links", "", `- Site: ${base}`, `- Source: ${LINKS.github}`, `- npm: ${LINKS.npm}`, `- The essay the figures come from: ${LINKS.essay}`, `- shadcn registry item: ${base}/r/hairline.json`, "");
  return out.join("\n");
}
````

`apps/site/lib/highlight.ts`
```ts
import { codeToHtml } from "shiki";

/**
 * Highlighting happens here, at build, so no highlighter reaches the browser.
 *
 * A snippet that follows a slider is written with LIVE where the value goes.
 * After highlighting, LIVE becomes a marked span holding the default; the
 * client only ever changes that span's text.
 */
export const LIVE = "424242";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function highlight(code: string, lang: string, initial?: string | number): Promise<string> {
  const html = await codeToHtml(code.trimEnd(), { lang, theme: "min-light" });
  return initial === undefined ? html : html.replaceAll(LIVE, `<span data-live>${escape(String(initial))}</span>`);
}

/** A shell command, unhighlighted, in the same wrapper the highlighter writes. */
export function plain(code: string): string {
  return `<pre class="shiki"><code>${escape(code.trimEnd())}</code></pre>`;
}
```

Run: `pnpm --filter @hairline/site test`
Expected: PASS, 26 tests.

- [ ] **Step 4: Write the components**

`apps/site/components/tile.tsx`
```tsx
"use client";

import { useState, type ComponentType, type CSSProperties } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { CARDS, type FigureId } from "@/lib/figures";

const COMPONENTS = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

/** A live figure on a white tile, with its number, its name and its caption in the corners. */
export function Tile({ id, index, name, options, style }: { id: FigureId; index: number; name: string; options?: Record<string, unknown>; style?: CSSProperties }) {
  const [read, setRead] = useState("");
  const Figure = COMPONENTS[id] as unknown as ComponentType<Record<string, unknown>>;
  return (
    <div className="tile" style={style} data-figure={id}>
      <Figure {...(id === "riffle" ? { labels: CARDS } : null)} {...options} onRead={setRead} />
      <span className="cap left-4 top-3">Fig. {index}</span>
      <span className="cap right-4 top-3">{name}</span>
      <span className="cap bottom-3 left-4" data-read aria-hidden="true">{read}</span>
    </div>
  );
}
```

`apps/site/components/figure-demo.tsx`
```tsx
"use client";

import { useId, useState } from "react";
import type { Range } from "@lucasmarkes/hairline";
import { shown, type FigureId } from "@/lib/figures";
import { Tabs, type Tab } from "./tabs";
import { Tile } from "./tile";

/** A figure, the slider for its option, and the code that follows the slider. */
export function FigureDemo({ id, index, name, option, range, tabs }: { id: FigureId; index: number; name: string; option: string; range: Range; tabs: Tab[] }) {
  const [value, setValue] = useState(range.default);
  const slider = useId();
  return (
    <div className="grid items-start gap-6 md:grid-cols-2 [&>*]:min-w-0">
      <Tile id={id} index={index} name={name} options={{ [option]: value }} />
      <div className="grid gap-4 [&>*]:min-w-0">
        <div className="flex items-center gap-4 font-mono text-[13px]">
          <label htmlFor={slider} className="w-20 text-ink">{option}</label>
          <input id={slider} type="range" className="slider" min={range.min} max={range.max} step={range.step} value={value} onChange={(event) => setValue(Number(event.target.value))} />
          <output htmlFor={slider} className="w-20 text-right text-muted">{shown(value, range)}</output>
        </div>
        <Tabs tabs={tabs} label={`${name} code`} live={String(value)} />
      </div>
    </div>
  );
}
```

`apps/site/components/tabs.tsx`
```tsx
"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type Tab = { label: string; html: string };

/**
 * Code behind tabs, with a copy button. The HTML is highlighted at build; when
 * `live` is given, every span marked data-live shows it, so a snippet follows
 * a slider without a highlighter in the browser.
 */
export function Tabs({ tabs, label, live }: { tabs: Tab[]; label: string; live?: string }) {
  const [at, setAt] = useState(0);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (live === undefined) return;
    panel.current?.querySelectorAll("[data-live]").forEach((node) => { node.textContent = live; });
  }, [live, at]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(panel.current?.textContent ?? "");
      setCopied(true);
    } catch {
      // no clipboard permission: the text is still selectable
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (at + step + tabs.length) % tabs.length;
    setAt(next);
    list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className="code">
      <div className="code-bar">
        <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1">
          {tabs.map((tab, i) => (
            <button key={tab.label} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={i === at} aria-controls={`${id}-panel`} tabIndex={i === at ? 0 : -1} onClick={() => setAt(i)} className="code-tab">
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="code-copy" aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div ref={panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${at}`} tabIndex={0} className="code-panel" dangerouslySetInnerHTML={{ __html: tabs[at].html }} />
    </div>
  );
}
```

`apps/site/components/theme-editor.tsx`
```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { themeCss } from "@/lib/snippets";
import { Tile } from "./tile";

type Colors = { plate: string; hi: string; edge: string; mid: string; lo: string };

/** The package's own palettes, and one that is neither. */
const PRESETS: Record<string, Colors> = {
  Light: { plate: "#ffffff", hi: "#232327", edge: "#a4a4ac", mid: "#c3c3c9", lo: "#e0e0e4" },
  Dark: { plate: "#08090a", hi: "#d0d6e0", edge: "#5b5d64", mid: "#3e3e44", lo: "#29292d" },
  Blueprint: { plate: "#0f2f57", hi: "#eaf2ff", edge: "#8fb2e0", mid: "#5b83ba", lo: "#2b4f80" },
};
const KEYS = ["plate", "hi", "edge", "mid", "lo"] as const;

/** The six theme properties, live: change one and the figure and the CSS below both follow. */
export function ThemeEditor() {
  const [colors, setColors] = useState<Colors>(PRESETS.Light);
  const [stroke, setStroke] = useState(0.9);
  const [copied, setCopied] = useState(false);
  const css = themeCss(colors, stroke);
  const style = { background: colors.plate, "--hairline-stroke": stroke, ...Object.fromEntries(KEYS.map((k) => [`--hairline-${k}`, colors[k]])) } as CSSProperties;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // no clipboard permission: the text is still selectable
    }
  };

  return (
    <div className="grid items-start gap-6 md:grid-cols-2 [&>*]:min-w-0">
      <Tile id="exploded" index={3} name="Exploded" style={style} />
      <div className="grid gap-4 [&>*]:min-w-0">
        <div className="flex gap-2">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button key={name} type="button" className="chip" aria-pressed={KEYS.every((k) => colors[k] === preset[k])} onClick={() => setColors(preset)}>
              {name}
            </button>
          ))}
        </div>
        <div className="grid gap-2 font-mono text-[13px]">
          {KEYS.map((key) => (
            <label key={key} className="flex items-center gap-3">
              <input type="color" className="swatch" value={colors[key]} onChange={(event) => setColors({ ...colors, [key]: event.target.value })} />
              <span className="text-ink">--hairline-{key}</span>
              <span className="ml-auto text-muted">{colors[key]}</span>
            </label>
          ))}
          <label className="flex items-center gap-3">
            <span className="text-ink">--hairline-stroke</span>
            <input type="range" className="slider" min={0.5} max={2} step={0.1} value={stroke} onChange={(event) => setStroke(Number(event.target.value))} />
            <span className="w-8 text-right text-muted">{stroke}</span>
          </label>
        </div>
        <div className="code">
          <div className="code-bar">
            <span className="code-tab" aria-selected="true">CSS</span>
            <button type="button" onClick={copy} className="code-copy" aria-live="polite">{copied ? "Copied" : "Copy"}</button>
          </div>
          <pre className="code-panel" data-theme-css>{css}</pre>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write the page and its routes**

`apps/site/app/globals.css`
```css
@import "tailwindcss";

/* The look of the tweet videos: warm paper, white tiles with a soft shadow, mono captions in the corners. */
@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --color-ground: #efebe5;
  --color-ink: #232327;
  --color-muted: #77736c;
  --color-line: rgba(28, 22, 14, 0.1);
}

html { color-scheme: light; scroll-behavior: smooth; }

body {
  min-height: 100vh;
  color: var(--color-ink);
  background:
    radial-gradient(60% 75% at 16% 8%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0) 70%) fixed,
    linear-gradient(160deg, #f7f5f2 0%, #f0ece6 55%, #e9e4dd 100%) fixed,
    var(--color-ground);
}

.tile {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 2px 6px rgba(28, 22, 14, 0.05),
    0 20px 50px -18px rgba(28, 22, 14, 0.18);
}

.cap {
  position: absolute;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.02em;
  color: var(--hairline-edge, #a4a4ac);
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.code { overflow: hidden; border-radius: 12px; background: rgba(255, 255, 255, 0.66); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05); }
.code-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 6px 6px 8px; border-bottom: 1px solid var(--color-line); }
.code-tab, .code-copy, .chip { border-radius: 7px; padding: 5px 10px; font: 500 12px/1 var(--font-mono); color: var(--color-muted); }
.code-tab[aria-selected="true"], .chip[aria-pressed="true"] { background: rgba(28, 22, 14, 0.07); color: var(--color-ink); }
.code-copy:hover, .code-tab:hover, .chip:hover { color: var(--color-ink); }
.chip { box-shadow: 0 0 0 1px var(--color-line); }
.code-panel { margin: 0; overflow-x: auto; padding: 14px 16px; font: 400 13px/1.6 var(--font-mono); }
.code-panel pre { margin: 0; background: transparent !important; }
.code-panel code { font: inherit; }
:is(.code-tab, .code-copy, .chip, .code-panel, .slider, .swatch, a):focus-visible { outline: 1.5px solid var(--color-ink); outline-offset: 2px; }

.slider { flex: 1; min-width: 0; height: 18px; appearance: none; background: transparent; cursor: pointer; }
.slider::-webkit-slider-runnable-track { height: 2px; border-radius: 1px; background: rgba(28, 22, 14, 0.18); }
.slider::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; margin-top: -6px; border-radius: 50%; background: var(--color-ink); }
.slider::-moz-range-track { height: 2px; border-radius: 1px; background: rgba(28, 22, 14, 0.18); }
.slider::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 50%; background: var(--color-ink); }

.swatch { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 7px; background: none; cursor: pointer; }
.swatch::-webkit-color-swatch-wrapper { padding: 0; }
.swatch::-webkit-color-swatch { border: 1px solid var(--color-line); border-radius: 7px; }

.props { width: 100%; border-collapse: collapse; font-size: 13px; }
.props th { padding: 8px 12px 8px 0; text-align: left; font: 500 11px/1 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); }
.props td { padding: 10px 12px 10px 0; vertical-align: top; border-top: 1px solid var(--color-line); }
.props td:nth-child(-n + 3) { font-family: var(--font-mono); white-space: nowrap; }
.props td:nth-child(2), .props td:nth-child(3) { color: var(--color-muted); }

@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

The metadata names `/og.png`. Task 13 makes it, and nothing on the page loads it before then.

`apps/site/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;
const DESCRIPTION = "Six isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "hairline",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: "hairline", description: DESCRIPTION, url: "/", siteName: "hairline", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "The six hairline figures on a board." }] },
  twitter: { card: "summary_large_image", title: "hairline", description: DESCRIPTION, images: ["/og.png"], creator: "@lucasmarkes" },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

`apps/site/app/page.tsx`
```tsx
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FigureDemo } from "@/components/figure-demo";
import { Tabs } from "@/components/tabs";
import { ThemeEditor } from "@/components/theme-editor";
import { CARDS, FIGURES, LINKS, NOTES, SHARED, THEME, rows, type Row } from "@/lib/figures";
import { LIVE, highlight, plain } from "@/lib/highlight";
import { FRAMEWORKS, install, react, vanilla } from "@/lib/snippets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;

function Props({ list }: { list: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="props">
        <thead>
          <tr><th>Option</th><th>Type</th><th>Default</th><th>What it does</th></tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.name}><td>{row.name}</td><td>{row.type}</td><td>{row.default}</td><td>{row.description}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heading({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 max-w-[62ch]">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{kicker}</p>
      <h2 id={id} className="mt-2 scroll-mt-10 text-[28px] font-medium tracking-[-0.03em]">
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children ? <p className="mt-3 text-[16px] leading-[1.55] text-muted">{children}</p> : null}
    </header>
  );
}

/**
 * The whole site. A Server Component: the six figures in the hero are the
 * package's React components rendered straight from here, so every deploy
 * runs them through server rendering and hydration.
 */
export default async function Page() {
  const demos = await Promise.all(
    FIGURES.map(async (doc) => [
      { label: "React", html: await highlight(react(doc, LIVE), "tsx", doc.range.default) },
      { label: "Vanilla", html: await highlight(vanilla(doc, LIVE), "ts", doc.range.default) },
    ]),
  );
  const frameworks = await Promise.all(FRAMEWORKS.map(async (f) => ({ label: f.label, html: await highlight(f.code, f.lang) })));
  const commands = install(SITE).map((i) => ({ label: i.label, html: plain(i.code) }));
  const hero = [
    <Riffle key="riffle" labels={CARDS} />, <Terrain key="terrain" />, <Exploded key="exploded" />,
    <Phosphor key="phosphor" />, <Slow key="slow" />, <Turntable key="turntable" />,
  ];

  return (
    <main className="mx-auto grid max-w-[1040px] gap-28 px-6 pb-24 pt-20 [&>*]:min-w-0">
      <section aria-labelledby="hairline">
        <div className="max-w-[52ch]">
          <h1 id="hairline" className="text-[44px] font-medium leading-none tracking-[-0.04em]">hairline</h1>
          <p className="mt-4 text-[19px] leading-[1.45] text-muted">
            Six isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3" data-hero>
          {FIGURES.map((doc, i) => (
            <a key={doc.id} href={`#${doc.id}`} className="tile" aria-label={`${doc.name}, figure ${i + 1}`}>
              {hero[i]}
              <span className="cap left-4 top-3">Fig. {i + 1}</span>
              <span className="cap right-4 top-3">{doc.name}</span>
            </a>
          ))}
        </div>
        <div className="mt-8 max-w-[560px]" data-install>
          <Tabs tabs={commands} label="Install" />
        </div>
      </section>

      {FIGURES.map((doc, i) => (
        <section key={doc.id} aria-labelledby={doc.id} data-section={doc.id}>
          <Heading id={doc.id} kicker={`Fig. ${i + 1}`} title={doc.name}>{doc.summary}</Heading>
          <FigureDemo id={doc.id} index={i + 1} name={doc.name} option={doc.option} range={doc.range} tabs={demos[i]} />
          <div className="mt-8"><Props list={rows(doc)} /></div>
        </section>
      ))}

      <section aria-labelledby="options">
        <Heading id="options" kicker="API" title="Options every figure takes">
          A figure fills the width of its element at a 5:4 aspect ratio. In React, every other prop goes to the <code className="font-mono text-[14px]">&lt;div&gt;</code>, and the ref is forwarded.
        </Heading>
        <Props list={SHARED} />
      </section>

      <section aria-labelledby="theme">
        <Heading id="theme" kicker="Theme" title="Six properties">
          Set them on a figure or on anything above it. Without them a figure is light, or dark when the page says so. The plate colour hides what is drawn behind each plate, so it has to match what the figure sits on.
        </Heading>
        <ThemeEditor />
        <ul className="mt-8 grid gap-2 text-[14px] leading-[1.5]">
          {THEME.map((t) => (
            <li key={t.property} className="grid gap-x-6 md:grid-cols-[190px_1fr]">
              <code className="font-mono text-[13px]">{t.property}</code>
              <span className="text-muted">{t.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="frameworks">
        <Heading id="frameworks" kicker="Use" title="Anywhere there is an element">
          The vanilla entry is a function that takes an element and returns <code className="font-mono text-[14px]">update</code> and <code className="font-mono text-[14px]">destroy</code>, which is all a framework needs.
        </Heading>
        <Tabs tabs={frameworks} label="Frameworks" />
      </section>

      <section aria-labelledby="notes">
        <Heading id="notes" kicker="Notes" title="What it does when you are not looking" />
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {NOTES.map((n) => (
            <div key={n.title}>
              <dt className="text-[15px] font-medium">{n.title}</dt>
              <dd className="mt-1 text-[14px] leading-[1.55] text-muted">{n.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line pt-6 font-mono text-[12px] text-muted">
        <a className="text-ink" href={LINKS.github}>GitHub</a>
        <a className="text-ink" href={LINKS.npm}>npm</a>
        <a className="text-ink" href={LINKS.essay}>The essay</a>
        <a className="text-ink" href="/llms.txt">llms.txt</a>
        <span className="md:ml-auto">
          After the figures on <a className="text-ink" href={LINKS.linear}>Linear</a>’s home page. MIT, Lucas Marques.
        </span>
      </footer>
    </main>
  );
}
```

`apps/site/app/llms.txt/route.ts`
```ts
import { llms } from "@/lib/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(llms(process.env.NEXT_PUBLIC_SITE_URL!), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
```

Run: `pnpm build && pnpm typecheck`
Expected:
- The site builds.
- The `[registry]` fallback warning prints, which is expected locally.
- Next's route table lists `○ /` and `○ /llms.txt` as static.
- The typecheck passes. It runs after the build, because `next build` writes `next-env.d.ts`.

Run `pnpm --filter @hairline/site start`, open `http://localhost:3000`, and look at the page:
- Thirteen figures move under the pointer: the six in the hero, the six in their sections, and the one in the theme editor.
- A slider changes its figure and both snippets.
- The page has no horizontal scroll at phone width.

Stop the server.

- [ ] **Step 6: Write the browser test**

`apps/site/test/site.spec.ts`
```ts
import { expect, test, type Page } from "@playwright/test";

const IDS = ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"];

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

test("the page prerenders empty boxes and draws thirteen figures with a clean console", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("<svg");
  expect(html).toContain("pnpm add @lucasmarkes/hairline");

  const noise = watch(page);
  await page.goto("/");
  // six in the hero, one per section, one in the theme editor
  await expect(page.locator("[data-hairline] > svg")).toHaveCount(13);
  await expect(page.locator("[data-hero] [data-hairline] > svg > *").first()).toBeVisible();
  // every figure but Exploded has a caption at rest
  for (const id of IDS.filter((id) => id !== "exploded")) await expect(page.locator(`[data-section="${id}"] [data-read]`)).not.toBeEmpty();
  expect(noise).toEqual([]);
});

test("a slider moves the figure's option and both snippets", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('[data-section="riffle"]');
  await expect(section.locator(".code-panel")).toContainText("<Riffle stagger={40}");
  await section.locator("input[type=range]").fill("75");
  await expect(section.locator("output")).toHaveText("75 ms");
  await expect(section.locator(".code-panel")).toContainText("<Riffle stagger={75}");
  await section.getByRole("tab", { name: "Vanilla" }).click();
  await expect(section.locator(".code-panel")).toContainText("{ stagger: 75 }");
});

test("the install tabs switch and copy", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const install = page.locator("[data-install]");
  await install.getByRole("tab", { name: "npm", exact: true }).click();
  await expect(install.locator(".code-panel")).toHaveText("npm install @lucasmarkes/hairline");
  await install.getByRole("button", { name: "Copy" }).click();
  await expect(install.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm install @lucasmarkes/hairline");
  await install.getByRole("tab", { name: "npm", exact: true }).press("ArrowLeft");
  await expect(install.getByRole("tab", { name: "pnpm" })).toBeFocused();
  await expect(install.locator(".code-panel")).toHaveText("pnpm add @lucasmarkes/hairline");
});

test("the theme editor repaints the figure and rewrites the CSS", async ({ page }) => {
  await page.goto("/");
  const theme = page.locator("section[aria-labelledby=theme]");
  await theme.getByRole("button", { name: "Dark" }).click();
  await expect(theme.locator("[data-theme-css]")).toContainText("--hairline-plate: #08090a;");
  const fill = await theme.locator("[data-hairline] svg path").first().evaluate((el) => getComputedStyle(el).fill);
  expect(fill).toBe("rgb(8, 9, 10)");
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

test("the page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
```

Run: `pnpm --filter @hairline/site test:browser`
Expected: 6 passed.

- [ ] **Step 7: Run everything**

Run: `pnpm test && pnpm test:browser && pnpm run release --static`
Expected:
- Vitest passes in both workspaces: the package's 65 tests and the site's 26.
- Playwright passes in both: the package's 19 and the site's 6.
- The static gate ends with `✓ All checks passed`.

- [ ] **Step 8: Commit and push**

```bash
git add apps/site pnpm-lock.yaml
git status --short apps/site   # expect nothing left: .next, next-env.d.ts and public/r are ignored
git commit -m "Site: one page of showcase and docs, generated from ranges, with /llms.txt and the registry item

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: CI passes, and its browser step now runs the site's specs too.

### Task 13: The Open Graph card

**Files:**
- Create: `apps/site/app/og/page.tsx`, `scripts/og.mjs`, `apps/site/public/og.png`

**Interfaces:**
- Consumes, from Task 12:
  - `Tile`, `FIGURES`, and the `text-muted` and `text-ink` colours from `globals.css`.
  - The `openGraph` and `twitter` metadata in `layout.tsx`, which already names `/og.png` at 1200 × 630.
- Produces:
  - `/og`: a 1200 × 630 page with the name, the sentence, the install command and the six tiles. It sets `robots: { index: false }`.
  - `node scripts/og.mjs [base]` photographs `/og` at device scale 2 into `apps/site/public/og.png`. The PNG is committed, so the deploy does not need a browser.

- [ ] **Step 1: Write the card**

`apps/site/app/og/page.tsx`
```tsx
import type { Metadata } from "next";
import { Tile } from "@/components/tile";
import { FIGURES } from "@/lib/figures";

/** The Open Graph card, as a page: scripts/og.mjs photographs it at 1200 × 630 into public/og.png. */
export const metadata: Metadata = { robots: { index: false } };

export default function Og() {
  return (
    <main className="flex h-[630px] w-[1200px] items-center gap-14 overflow-hidden px-16">
      <div className="w-[300px] shrink-0">
        <h1 className="text-[56px] font-medium leading-none tracking-[-0.04em]">hairline</h1>
        <p className="mt-5 text-[22px] leading-[1.35] text-muted">Six isometric line figures that answer the pointer.</p>
        <p className="mt-8 font-mono text-[15px] text-ink">npm i @lucasmarkes/hairline</p>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-4">
        {FIGURES.map((doc, i) => <Tile key={doc.id} id={doc.id} index={i + 1} name={doc.name} />)}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write the photographer**

It waits until all six figures have drawn and the fonts have loaded, then waits a moment more, so that Phosphor and Slow are mid-loop.

`scripts/og.mjs`
```js
#!/usr/bin/env node
/**
 * Photographs the site's /og route into apps/site/public/og.png, the Open
 * Graph card. The result is committed; run this again when the figures or the
 * card change.
 *
 *   pnpm build && pnpm --filter @hairline/site start     (in one terminal)
 *   node scripts/og.mjs [http://localhost:3000]          (in another)
 */
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = join(ROOT, "apps/site");
const { chromium } = createRequire(join(SITE, "package.json"))("@playwright/test");
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
try {
  await page.goto(`${base}/og`, { waitUntil: "networkidle" });
} catch {
  console.error(`Nothing at ${base}/og. Build and start the site first:\n  pnpm build && pnpm --filter @hairline/site start`);
  await browser.close();
  process.exit(1);
}
await page.waitForFunction(() => document.querySelectorAll("[data-hairline] > svg > *").length >= 6 && document.fonts.status === "loaded");
// Phosphor and Slow play on their own: give them a moment to be mid-loop.
await page.waitForTimeout(1200);
const out = join(SITE, "public/og.png");
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log(`wrote ${out}`);
```

- [ ] **Step 3: Take the photograph**

Run: `node scripts/og.mjs`
Expected: FAIL, exit 1. Nothing is listening yet, so the script prints `Nothing at http://localhost:3000/og. Build and start the site first:` and the two commands.

Then:
```bash
pnpm build
pnpm --filter @hairline/site start &
SITE=$!
until curl -sf -o /dev/null http://localhost:3000/og; do sleep 0.5; done
node scripts/og.mjs
kill $SITE
file apps/site/public/og.png
```
Expected:
- `wrote …/apps/site/public/og.png`.
- `file` reports `PNG image data, 2400 x 1260`.

Open the PNG. Check that:
- All six tiles are drawn.
- No figure is cut off.
- The text is set in Geist, not a fallback font.

If any of that fails, fix `app/og/page.tsx` and take the photograph again.

- [ ] **Step 4: Check that the card is served**

Run:
```bash
pnpm build
pnpm --filter @hairline/site start &
SITE=$!
until curl -sf -o /dev/null http://localhost:3000/og; do sleep 0.5; done
curl -sI http://localhost:3000/og.png | head -1
curl -s http://localhost:3000/ | grep -o '<meta property="og:image" content="[^"]*"'
kill $SITE
```
Expected:
- `HTTP/1.1 200 OK`.
- `<meta property="og:image" content="http://localhost:3000/og.png"`. On Vercel the host is the deployment's own (Task 14).

- [ ] **Step 5: Commit**

```bash
git add apps/site/app/og/page.tsx scripts/og.mjs apps/site/public/og.png
git commit -m "Site: the Open Graph card, a route photographed into a committed PNG

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

### Task 14: The Vercel project and a preview Lucas reviews

**Files:**
- Create: `apps/site/vercel.json`

**Interfaces:**
- Consumes:
  - From Task 12: the site, and its turbo task's `env` list (`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`).
  - From Task 10: `scripts/base-url.mjs`, which turns those variables into the site's address.
  - From Task 2: the private GitHub repository `lucasmarkes/hairline`.
- Produces:
  - The Vercel project `hairline` in the team `lucasmarkes-team-projects`, the same team as motes. Its root directory is `apps/site`, and it is connected to the GitHub repository:
    - A preview for every pull request.
    - Production from `main`, at the project's `*.vercel.app` address. The custom domain waits for Task 16.
  - The PR `Site on Vercel`, merged once Lucas has reviewed its preview.

This task meets phase 4's exit criterion: Lucas has reviewed a Vercel preview. Creating the project and connecting it to GitHub is outward-facing: **confirm** with Lucas before Step 3, and do nothing in the Vercel dashboard or CLI before then.

Vercel installs and builds from the repository root, because the site needs the package built first. The root directory still has to be `apps/site`, so Vercel finds the Next.js app and its output.

- [ ] **Step 1: Write the Vercel configuration on a branch**

```bash
git switch -c site-on-vercel
```

`apps/site/vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=@hairline/site"
}
```

```bash
git add apps/site/vercel.json
git commit -m "Site: build on Vercel from the repository root, through turbo

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Do not push yet. The push in Step 4 opens the PR whose preview is the first build.

- [ ] **Step 2: Check the Vercel account**

Run:
```bash
vercel whoami
vercel teams list
vercel project list --scope lucasmarkes-team-projects | grep -E '^\s*(motes|hairline)\b'
```
Expected:
- `lucasmarkess`.
- The team list includes `lucasmarkes-team-projects`.
- `motes` is listed and `hairline` is not.

If `hairline` already exists, stop and ask Lucas.

- [ ] **Step 3: Create the project and connect it (confirm)**

Ask Lucas: "Create the Vercel project `hairline` in `lucasmarkes-team-projects`, with root directory `apps/site`, connected to `lucasmarkes/hairline`, with Web Analytics on?" Run this only after a yes:

```bash
vercel project add hairline --scope lucasmarkes-team-projects
vercel project update hairline --root-directory apps/site --framework nextjs --yes --scope lucasmarkes-team-projects
vercel link --yes --project hairline --team lucasmarkes-team-projects
vercel git connect --yes
vercel project web-analytics enable hairline --scope lucasmarkes-team-projects
vercel project inspect hairline --scope lucasmarkes-team-projects
```
Expected:
- `vercel link` writes `.vercel/project.json` at the repository root. It is git-ignored, and `git status --short` shows nothing new.
- `vercel git connect` reports `lucasmarkes/hairline` connected.
- `project inspect` shows `Root Directory: apps/site` and `Framework Preset: Next.js`.

If `git connect` says Vercel cannot access the repository, the Vercel GitHub app is limited to selected repositories. Lucas adds `hairline` to it on GitHub (Settings → Applications → Vercel → Repository access); then run `vercel git connect --yes` again.

- [ ] **Step 4: Open the PR and wait for its preview**

```bash
git push -u origin site-on-vercel
gh pr create --title "Site on Vercel" --body "Builds apps/site on Vercel from the repository root, through turbo. The preview is the first deploy of the site."
gh pr checks --watch
vercel ls hairline --scope lucasmarkes-team-projects | head -5
```
Expected:
- The PR's checks include the CI job and a Vercel deployment check, and all of them pass.
- `vercel ls` lists one `Preview` deployment, `● Ready`.

Put its URL in `PREVIEW`, for example `PREVIEW=https://hairline-abc123-lucasmarkes-team-projects.vercel.app`.

If the Vercel build fails, read it with `vercel inspect "$PREVIEW" --logs`. Fix the cause in the repository and push to the branch; never fix it in the dashboard. The build's own `[registry]` line must read `(base from VERCEL_URL)`, not the fallback warning.

- [ ] **Step 5: Check the preview**

Previews sit behind Vercel's deployment protection, so check them with `vercel curl`, which passes it:

```bash
vercel curl /r/hairline.json --deployment "$PREVIEW" | grep '"docs"'
vercel curl /llms.txt --deployment "$PREVIEW" | head -3
vercel curl / --deployment "$PREVIEW" | grep -o '<meta property="og:image" content="[^"]*"'
```
Expected:
- `"docs": "Docs: $PREVIEW"`: the item names the preview itself, not localhost.
- `# hairline`, then the sentence.
- `og:image` points at `$PREVIEW/og.png`.

- [ ] **Step 6: Lucas reviews the preview**

Send Lucas the preview URL. Ask them to check, logged in to Vercel, on a laptop and a phone:
- All thirteen figures answer the pointer.
- The sliders work.
- Copy works on every install tab.
- The theme editor works.
- The page reads well at phone width.

Wait for their answer. Fix anything they ask for on this branch, push, and send the new preview. This review is the gate for phase 4.

- [ ] **Step 7: Merge, and check the first production build**

After Lucas approves:
```bash
gh pr merge --merge --delete-branch
git switch main && git pull
vercel ls hairline --environment production --scope lucasmarkes-team-projects | head -5
```
Expected: one `Production` deployment, `● Ready`. Put its URL in `PROD`.

The team's `.vercel.app` addresses sit behind deployment protection, production included; only a custom domain is open. So check with `vercel curl` here too:
```bash
vercel curl /r/hairline.json --deployment "$PROD" | grep '"docs"'
```
Expected: `"docs": "Docs: https://hairline-….vercel.app"`. This is the project's production domain, not `$PROD` itself and not localhost, because `VERCEL_ENV` is `production`.

Task 16 adds the custom domain and builds production again, so that this line names `https://hairline.lucasmarkes.com`.

### Task 15: The changelog, the publish workflow and the release candidate's version

**Files:**
- Create: `CHANGELOG.md`, `scripts/changelog.mjs`, `.github/workflows/publish.yml`
- Modify: `packages/hairline/package.json` (`version`: `0.0.0` → `0.1.0-rc.0`)

**Interfaces:**
- Consumes:
  - From Tasks 9 and 11: `pnpm run release`, the full gate.
  - From Task 1: the package's `prepack`.
- Produces:
  - `node scripts/changelog.mjs <version>` prints that version's section of `CHANGELOG.md` without its heading. A pre-release with no section of its own (`0.1.0-rc.0`) gets the section of the version it leads to (`0.1.0`). A version with no section exits 1. It also exports `section(changelog, version): string | null`.
  - `.github/workflows/publish.yml` runs on a pushed `v*` tag, in the protected `release` environment. It runs these steps in order, and any failure stops it before the registry:
    1. It checks that the tag matches the manifest.
    2. It picks the dist-tag: `next` for a version with a `-`, `latest` otherwise.
    3. It writes the notes with `changelog.mjs`.
    4. It runs the full gate.
    5. It packs with pnpm and publishes that tarball with npm, using `--provenance --access public`.
    6. It creates the GitHub Release, marked as a pre-release under `next`.

This is the spec's "Release", the motes flow. The workflow cannot run yet. The `release` environment and its `NPM_TOKEN` are created in Task 16, after the repository is public. On a private repository, GitHub's Free and Pro plans do not enforce a required reviewer, and npm provenance needs a public repository anyway.

- [ ] **Step 1: Write the changelog**

`CHANGELOG.md`
```markdown
# Changelog

Every release of `@lucasmarkes/hairline`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[semver](https://semver.org/).

## 0.1.0 - 2026-10-01

First release.

### Added

- Six isometric line figures, each a function that draws into an element:
  `riffle`, `terrain`, `exploded`, `phosphor`, `slow`, `turntable`.
- A React entry, `@lucasmarkes/hairline/react`, with one component per figure.
  It is a client module, so it can be rendered from a Server Component.
- One option per figure, exported with its bounds as `ranges`.
- Theming with six CSS custom properties (`--hairline-plate`, `--hairline-hi`,
  `--hairline-edge`, `--hairline-mid`, `--hairline-lo`, `--hairline-stroke`),
  a `theme` option, and automatic light and dark.
- A shadcn registry item at `https://hairline.lucasmarkes.com/r/hairline.json`.
```

- [ ] **Step 2: Write the notes script, and check its three cases**

`scripts/changelog.mjs`
```js
#!/usr/bin/env node
/**
 * Prints one version's section of CHANGELOG.md, without its heading: the body
 * of the GitHub Release.
 *
 *   node scripts/changelog.mjs 0.1.0
 *
 * A pre-release (0.1.0-rc.0) with no section of its own gets the section of
 * the version it leads to (0.1.0). No section at all is an error.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function section(changelog, version) {
  const lines = changelog.split("\n");
  const heading = (v) => lines.findIndex((l) => l.startsWith("## ") && l.slice(3).trim().replace(/^\[|\].*$| .*$/g, "") === v);
  let start = heading(version);
  if (start < 0 && version.includes("-")) start = heading(version.split("-")[0]);
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim();
}

if (import.meta.filename === process.argv[1]) {
  const version = process.argv[2];
  if (!version) { console.error("Usage: node scripts/changelog.mjs <version>"); process.exit(2); }
  const notes = section(readFileSync(join(import.meta.dirname, "..", "CHANGELOG.md"), "utf8"), version);
  if (!notes) { console.error(`CHANGELOG.md has no "## ${version}" section.`); process.exit(1); }
  console.log(notes);
}
```

Run:
```bash
node scripts/changelog.mjs 0.1.0 | head -1
node scripts/changelog.mjs 0.1.0-rc.0 | head -1
node scripts/changelog.mjs 0.2.0; echo "exit $?"
```
Expected, in order:
1. `First release.`
2. `First release.`: the release candidate falls back to 0.1.0's section.
3. `CHANGELOG.md has no "## 0.2.0" section.`, then `exit 1`.

- [ ] **Step 3: Write the publish workflow**

`.github/workflows/publish.yml`
```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

permissions:
  # Writes the GitHub Release.
  contents: write
  # npm provenance: the OIDC token npm exchanges for a signed attestation of
  # where and how the tarball was built.
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    # The protected `release` environment: a required reviewer approves before
    # any step runs, and NPM_TOKEN exists only here, so a pushed tag alone
    # cannot reach the registry.
    environment: release
    steps:
      - uses: actions/checkout@v7

      - name: Enable Corepack
        run: corepack enable

      # registry-url writes an .npmrc wired to NODE_AUTH_TOKEN, so the gate's
      # `npm whoami` and the publish below both authenticate with NPM_TOKEN.
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Verify the tag matches the manifest
        run: |
          TAG="${GITHUB_REF_NAME#v}"
          PKG="$(node -p "require('./packages/hairline/package.json').version")"
          echo "tag=$TAG  package=$PKG"
          if [ "$TAG" != "$PKG" ]; then
            echo "::error::Tag v$TAG does not match packages/hairline/package.json ($PKG). Refusing to publish."
            exit 1
          fi
          echo "VERSION=$TAG" >> "$GITHUB_ENV"
          # A version with a pre-release suffix (0.1.0-rc.0) goes to the `next`
          # dist-tag, so `npm install @lucasmarkes/hairline` never picks it up.
          case "$TAG" in
            *-*) echo "DIST_TAG=next" >> "$GITHUB_ENV" ;;
            *)   echo "DIST_TAG=latest" >> "$GITHUB_ENV" ;;
          esac

      # Fails here, before anything is published, if the changelog has no
      # section for this version.
      - name: Release notes from the changelog
        run: node scripts/changelog.mjs "$VERSION" > "$RUNNER_TEMP/notes.md"

      # Everything: build, typecheck, every test layer, publint, attw, size
      # budgets, the tarball, both consumer fixtures, npm auth and the registry.
      # It packs but never publishes.
      - name: Release gate (full)
        run: pnpm run release
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # pnpm packs (it runs prepack, which copies the README and LICENSE in);
      # npm publishes that exact tarball, because npm signs provenance.
      - name: Publish with provenance
        run: |
          STAGING="$(mktemp -d)"
          pnpm -C packages/hairline pack --pack-destination "$STAGING"
          npm publish "$STAGING/lucasmarkes-hairline-${VERSION}.tgz" --provenance --access public --tag "$DIST_TAG"
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: GitHub Release
        run: |
          if [ "$DIST_TAG" = "next" ]; then PRE="--prerelease"; else PRE=""; fi
          gh release create "$GITHUB_REF_NAME" --title "$GITHUB_REF_NAME" --notes-file "$RUNNER_TEMP/notes.md" $PRE
        env:
          GH_TOKEN: ${{ github.token }}
```

- [ ] **Step 4: Set the release candidate's version**

Run:
```bash
(cd packages/hairline && npm pkg set version=0.1.0-rc.0)
grep '"version"' packages/hairline/package.json
pnpm run release --static
```
Expected:
- `"version": "0.1.0-rc.0",`.
- The gate ends with `✓ All checks passed for @lucasmarkes/hairline@0.1.0-rc.0. Nothing has been published.`

- [ ] **Step 5: Commit and push**

```bash
git add CHANGELOG.md scripts/changelog.mjs .github/workflows/publish.yml packages/hairline/package.json
git commit -m "Release: the changelog, the publish workflow behind the release environment, and 0.1.0-rc.0

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: CI passes. Publish does not run, because nothing is tagged.

### Task 16: Launch

**Files:**
- Modify: `packages/hairline/package.json` (`version`: `0.1.0-rc.0` → `0.1.0`)
- Modify, only if the release date is not 2026-10-01: `CHANGELOG.md` (the date in `## 0.1.0 - …`)

**Interfaces:**
- Consumes:
  - From Task 15: `publish.yml` and `changelog.mjs`.
  - From Task 14: the Vercel project `hairline`.
  - From Task 12: the site, whose address comes from `VERCEL_PROJECT_PRODUCTION_URL` at build time.
- Produces:
  - `@lucasmarkes/hairline@0.1.0-rc.0` under `next`, and `@lucasmarkes/hairline@0.1.0` under `latest`, both with provenance.
  - Two GitHub Releases.
  - `https://hairline.lucasmarkes.com`.

This is the spec's launch checklist, one step per item, in its order. Each step marked **confirm** is public or hard to undo. Ask Lucas before it, every time; a yes to one step is not a yes to the next. A published npm version can never be reused, even after an unpublish.

- [ ] **Step 1: Make the repository public (confirm)**

First, check that nothing private is in the history:
```bash
git log --all --name-only --format= | sort -u | grep -E '(^|/)(\.env|\.vercel/)' || echo "nothing private"
git grep -nIE 'npm_[A-Za-z0-9]{36}|gh[pousr]_[A-Za-z0-9]{36}' $(git rev-list --all) || echo "no tokens"
```
Expected: `nothing private`, then `no tokens`.

Ask Lucas: "Make `lucasmarkes/hairline` public now, with its description, topics and homepage?" After a yes:
```bash
gh repo edit lucasmarkes/hairline --visibility public --accept-visibility-change-consequences \
  --description "Six isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else." \
  --homepage https://hairline.lucasmarkes.com \
  --add-topic svg --add-topic isometric --add-topic animation --add-topic react --add-topic typescript --add-topic shadcn
gh repo view lucasmarkes/hairline --json visibility,homepageUrl --jq '.visibility + " " + .homepageUrl'
curl -sI https://raw.githubusercontent.com/lucasmarkes/hairline/main/assets/hero.gif | head -1
```
Expected:
- `PUBLIC https://hairline.lucasmarkes.com`.
- `HTTP/2 200`: the README's gif now loads, on GitHub and later on npm.

- [ ] **Step 2: Create the `release` environment and its token**

Create the environment, with Lucas as its required reviewer and only `v*` tags allowed to deploy to it:
```bash
USER_ID="$(gh api user --jq .id)"
gh api -X PUT repos/lucasmarkes/hairline/environments/release --input - <<EOF
{ "reviewers": [{ "type": "User", "id": $USER_ID }],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
EOF
gh api -X POST repos/lucasmarkes/hairline/environments/release/deployment-branch-policies -f name='v*' -f type=tag
gh api repos/lucasmarkes/hairline/environments/release --jq '[.protection_rules[].type] | join(",")'
```
Expected: `required_reviewers,branch_policy`.

Lucas creates the npm token. Ask Lucas to make it on npmjs.com (Access Tokens → Generate New Token → Granular Access Token) with these settings:
- Permissions: Read and write.
- Packages: all packages. `@lucasmarkes/hairline` does not exist yet, so it cannot be picked by name.
- Expiration: 30 days.
- Bypass two-factor authentication: on, so the workflow can publish.

Then Lucas stores it themselves, so the token never passes through this session:
```
! gh secret set NPM_TOKEN --env release --repo lucasmarkes/hairline
```
Check:
```bash
gh secret list --env release --repo lucasmarkes/hairline
```
Expected: one line, `NPM_TOKEN`.

- [ ] **Step 3: Publish the release candidate (confirm)**

Ask Lucas: "Tag `v0.1.0-rc.0`? It publishes `@lucasmarkes/hairline@0.1.0-rc.0` under `next` once you approve the run." After a yes:
```bash
git switch main && git pull
grep '"version"' packages/hairline/package.json
git tag v0.1.0-rc.0
git push origin v0.1.0-rc.0
gh run list --workflow Publish --limit 1
```
Expected: `"version": "0.1.0-rc.0",`, and a Publish run that is `waiting`.

Lucas approves it, in the run's page on GitHub or with `gh run view <id> --web`. Then:
```bash
gh run watch --exit-status "$(gh run list --workflow Publish --limit 1 --json databaseId --jq '.[0].databaseId')"
npm view @lucasmarkes/hairline dist-tags
gh release view v0.1.0-rc.0 --json isPrerelease --jq .isPrerelease
```
Expected:
- The run passes. The "Release gate (full)" step logs `✓ logged in as the scope's owner`.
- `{ next: '0.1.0-rc.0' }`.
- `true`.

If the run fails before "Publish with provenance", nothing was published. Fix the cause and commit it. Then move the tag (`git tag -f v0.1.0-rc.0 && git push -f origin v0.1.0-rc.0`) and approve the new run. If it fails after that step, the version is spent: bump to `0.1.0-rc.1`, and ask Lucas before tagging again.

- [ ] **Step 4: Check the release candidate from outside the repository**

Each check uses only what a stranger has: the npm registry and a CDN. The site's production address stays behind Vercel's protection until Step 6 gives it a domain. Until then, the shadcn item is served from a local build of the site, made for that address.

```bash
RC=/tmp/hairline-rc && rm -rf "$RC" && mkdir -p "$RC" && cd "$RC"

# A new Next.js app, with a Server Component page
npx create-next-app@latest next --ts --app --tailwind --no-src-dir --import-alias "@/*" --use-npm --yes
cd next && npm install @lucasmarkes/hairline@next
cat > app/page.tsx <<'EOF'
import { Riffle } from "@lucasmarkes/hairline/react";

export default function Page() {
  return <main style={{ width: 400, margin: "40px auto" }}><Riffle /></main>;
}
EOF
npm run build
npx next start -p 4400 &
APP=$!
until curl -sf -o /dev/null http://localhost:4400; do sleep 0.5; done; open http://localhost:4400
```
Expected: the build passes, and the page shows Riffle, answering the pointer, with a clean console. Then `kill $APP`.

```bash
# The shadcn item, served by a local build of the site
cd ~/estudos/hairline
HAIRLINE_REGISTRY_URL=http://localhost:3000 pnpm build
pnpm --filter @hairline/site start &
SITE=$!
until curl -sf -o /dev/null http://localhost:3000/r/hairline.json; do sleep 0.5; done
cd /tmp/hairline-rc/next
npx shadcn@latest init --defaults --yes
npx shadcn@latest add http://localhost:3000/r/hairline.json --yes
kill $SITE
head -1 components/ui/hairline.tsx && npm run build
```
Expected: `components/ui/hairline.tsx` starts with `"use client";`, and the app still builds. Until 0.1.0 exists, npm has no `latest` version to install. If shadcn stops at its dependency install with `No matching version found`, check that the file was still written; Step 7 repeats this check against production and the final release.

```bash
cd "$RC"
# A new Vite app, no framework
npm create vite@latest vite -- --template vanilla-ts
cd vite && npm install && npm install @lucasmarkes/hairline@next
cat > src/main.ts <<'EOF'
import { terrain } from "@lucasmarkes/hairline";

document.body.innerHTML = '<div id="figure" style="width: 400px"></div>';
terrain(document.getElementById("figure")!, { radius: 4 });
EOF
npm run build
npx vite preview --port 4401 &
APP=$!
until curl -sf -o /dev/null http://localhost:4401; do sleep 0.5; done; open http://localhost:4401
```
Expected: the build passes, and Terrain answers the pointer. Then `kill $APP`.

```bash
cd "$RC"
# Plain HTML, from a CDN: the site's own CDN snippet, pinned to the release candidate
cat > cdn.html <<'EOF'
<div id="figure" style="width: 400px"></div>

<script type="module">
  import { terrain } from "https://esm.sh/@lucasmarkes/hairline@0.1.0-rc.0";

  terrain(document.getElementById("figure"), { radius: 4 });
</script>
EOF
npx -y serve -l 4402 . &
APP=$!
until curl -sf -o /dev/null http://localhost:4402/cdn.html; do sleep 0.5; done; open http://localhost:4402/cdn.html
```
Expected: Terrain draws and answers the pointer. Then `kill $APP`.

If any check fails, it is a defect in what ships. Fix it in the repository, add a fixture check that would have caught it, and publish `0.1.0-rc.1` through Step 3 again.

- [ ] **Step 5: Publish 0.1.0 (confirm)**

```bash
cd ~/estudos/hairline
(cd packages/hairline && npm pkg set version=0.1.0)
date +%F   # if this is not 2026-10-01, change the date in CHANGELOG.md's "## 0.1.0 - …" heading to it
pnpm run release
```
Expected: the full gate ends with `✓ All checks passed for @lucasmarkes/hairline@0.1.0. Nothing has been published.`

```bash
git add packages/hairline/package.json CHANGELOG.md
git commit -m "Release 0.1.0

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
gh run watch --exit-status "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Ask Lucas: "Tag `v0.1.0`? It publishes `@lucasmarkes/hairline@0.1.0` under `latest` once you approve the run." After a yes:
```bash
git tag v0.1.0
git push origin v0.1.0
```
Lucas approves the run. Then:
```bash
gh run watch --exit-status "$(gh run list --workflow Publish --limit 1 --json databaseId --jq '.[0].databaseId')"
npm view @lucasmarkes/hairline dist-tags
```
Expected: `{ next: '0.1.0-rc.0', latest: '0.1.0' }`.

- [ ] **Step 6: Add the domain (confirm)**

Ask Lucas: "Add `hairline.lucasmarkes.com` to the Vercel project `hairline`?" After a yes:
```bash
vercel domains add hairline.lucasmarkes.com hairline --scope lucasmarkes-team-projects
vercel project inspect hairline --scope lucasmarkes-team-projects | grep -A4 -i domains
```
Expected: the domain is added and listed. `lucasmarkes.com` uses Vercel's nameservers, so there is no DNS record to create, and the certificate is issued within a minute or two.

The site's address is fixed at build time from `VERCEL_PROJECT_PRODUCTION_URL`. Vercel sets that to the shortest custom production domain, so production has to be built again for the registry item and the Open Graph tags to name the domain:
```bash
LAST="$(vercel ls hairline --environment production --scope lucasmarkes-team-projects --format json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log("https://"+JSON.parse(s).deployments[0].url))')"
vercel redeploy "$LAST" --target production --scope lucasmarkes-team-projects
```
Expected: a new production deployment, `● Ready`. In its build log (`vercel inspect <its URL> --logs`), the `[registry]` line reads `https://hairline.lucasmarkes.com/r/hairline.json (base from VERCEL_PROJECT_PRODUCTION_URL)`.

- [ ] **Step 7: Check production**

```bash
SITE=https://hairline.lucasmarkes.com
curl -sI "$SITE" | head -1
curl -s "$SITE/r/hairline.json" | grep '"docs"'
curl -s "$SITE/llms.txt" | head -1
curl -s "$SITE" | grep -o '<meta property="og:image" content="[^"]*"'
curl -sI "$SITE/og.png" | head -1
npm view @lucasmarkes/hairline@0.1.0 dist.attestations.provenance.predicateType
```
Expected, in order:
1. `HTTP/2 200`.
2. `"docs": "Docs: https://hairline.lucasmarkes.com"`.
3. `# hairline`.
4. `content="https://hairline.lucasmarkes.com/og.png"`.
5. `HTTP/2 200`.
6. `https://slsa.dev/provenance/v1`.

Then, in the release candidate's Next.js app from Step 4:
```bash
cd /tmp/hairline-rc/next
npm install @lucasmarkes/hairline@latest
npx shadcn@latest add https://hairline.lucasmarkes.com/r/hairline.json --yes --overwrite
npm run build
```
Expected: shadcn installs the dependency and writes the file, and the app builds.

Last, by eye:
- `https://www.npmjs.com/package/@lucasmarkes/hairline` shows the provenance badge, and the README renders with the gif.
- The site answers on the domain, on a laptop and a phone.
- The Open Graph card renders. Lucas pastes the link into a draft post, or checks it on opengraph.xyz.

Then clean up:
```bash
rm -rf /tmp/hairline-rc
```

The launch checklist is complete. Tell Lucas, in order:
- The npm page, with its version and provenance.
- The site.
- The two GitHub Releases.
- The token's expiry date, since it was made for 30 days. The spec's "After 0.1.0" replaces it with npm trusted publishing.
