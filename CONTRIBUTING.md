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
