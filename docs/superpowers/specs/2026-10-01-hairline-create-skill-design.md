# `hairline-create`: a skill that draws new Hairline figures

Date: 2026-10-01. Status: design approved in conversation, awaiting review of this document.

## Purpose

Hairline ships six figures. This skill lets anyone with a coding agent make a seventh: they type `/hairline-create <idea>` and get one new isometric line figure that answers the pointer, drawn to the same ten rules and with the same engine as the six in the package.

It is for people outside this repository, on any agent that reads skills (Claude Code, Cursor, Codex and others). Success is a figure Lucas would not be embarrassed to see next to Terrain: rounded, quiet, wordless, designed at rest, calm under the hand.

## Decisions made

| Question | Decision |
| --- | --- |
| What comes out | One self-contained HTML file with no dependencies. Published as an Artifact where the agent can publish one; saved as `hairline-<name>.html` where it cannot. Same content either way. |
| Flow | Concept first: the skill offers two or three one-line concepts, the person picks, then it builds. |
| Where the code comes from | A ready kernel, extracted from the package's `src/core`, pasted unaltered. The agent writes only the new figure. |
| How it is checked | A validator script, then a look in a browser. Whatever could not be checked is said at hand-off. |
| Where it lives | `skills/hairline-create/` in this repository, installed with `npx skills add lucasmarkes/hairline`. |
| What the page shows | The figure on a bench: stage with corner read-out, one `intensity` slider, light/dark switch, one line saying what the figure means and which rules it leans on. |

## What the person lives through

1. **Concepts.** For `/hairline-create a sales funnel` the skill answers with two or three concepts, one line each: the object, what the pointer does, what the read-out says. If the person arrived with the metaphor already chosen, this step is skipped.
2. **Build.** The agent assembles one HTML file from three parts: the bench (a fixed template), the kernel (pasted as is), and the figure (the only part it writes).
3. **Check.** It runs the validator and, with a browser, the look. It fixes what fails before handing anything over.
4. **Hand-off.** Artifact or file, plus one line each for: the metaphor used, the rules the figure leans on, anything not verified.
5. **Adjustments.** The person asks for changes while using the bench. The agent edits only the figure and checks again.

What reaches the person's machine on install is the skill folder and nothing else: small text files, no `npm install`, no package. Node is needed only to run the validator.

## Files in `skills/hairline-create/`

| File | Role |
| --- | --- |
| `SKILL.md` | The flow above, short. Points to each other file at the moment it is needed. Frontmatter: `name: hairline-create`, a description that says when to use it. |
| `rules.md` | The ten rules from the study (01 hit, 02 order, 03 reach, 04 accent, 05 rest, 06 honesty, 07 cost, 08 clock, 09 radius, 10 quiet), each with its numbers and with the test that rejects a figure. |
| `concepts.md` | How to turn an idea into a figure: the ways of answering the pointer already proven in the package, and what makes a concept weak (dead at rest, needs words to be understood, more than one idea, no reason for the pointer). |
| `kernel.js` | The engine as plain JavaScript, generated from `packages/hairline/src/core`. |
| `bench.html` | The page template, with two marked slots: kernel and figure. |
| `examples/terrain.js`, `examples/riffle.js` | Two figures of the package in the skill's format: a continuous field (springs, falloff by distance) and discrete items (stagger, tweens, identity by geometry). |
| `validate.mjs` | The validator. No dependencies. |
| `look.md` | The checklist for the look, and how to do it by reading code when there is no browser. |

## The kernel

- **Content.** The four files of `packages/hairline/src/core`: `iso.ts` (camera, projection, rounded solids), `motion.ts` (springs, the 700ms curve, tweens, reduced motion), `stage.ts` (the shared loop that sleeps offscreen, the pointer, disposal), `styles.ts` (the light and dark palettes and the stroke classes).
- **Generation.** `scripts/kernel.mjs` bundles them with esbuild into one unminified, type-free file that defines a single global, `HL`. Unminified so the agent can read what it is calling.
- **Marking.** In the output HTML the kernel sits between two marker comments carrying a hash of its content. That is how the validator knows it was not touched.
- **The package does not change.** Nothing in `packages/hairline/src` is edited and no public API is added.

## The figure contract

The same contract as the six engines (`FigureMount` in `core/stage.ts`): the figure receives `{ stage, svg, read }` and a number, and returns `{ set(value), destroy() }`.

Beside the mount function a figure declares:

- `name`: what the read-out and the file are called.
- `means`: the one line the bench shows under the stage.
- `rules`: the rule numbers it leans on.
- `range`: three numbers, the figure's own value at `intensity` 0, 0.5 and 1, joined by two straight lines, as in the package's `intensity.ts`. The middle one is the default.

The bench owns everything else: it creates the host and the SVG, injects the kernel's stylesheet, maps the slider through `range` and calls `set`, switches the theme, and shows `means` and `rules`.

## The validator

`node validate.mjs <file.html>` exits non-zero and prints what to fix when:

- the kernel is missing or its hash does not match;
- the figure creates text in the SVG (`<text>`, `<tspan>`, `createElementNS(…, "text")`): rule 10;
- the figure sets its own `stroke-width`, or a colour, fill, filter or shadow outside the kernel's classes: rule 04, and the single stroke;
- the page loads anything from outside (`<script src>`, `<link>`, `fetch`, `import`, remote `url()`);
- the figure never writes the read-out, or does not return `set` and `destroy`;
- the figure runs its own clock (`setInterval`, `setTimeout` loops, `requestAnimationFrame`) instead of the kernel's loop: rule 07 and reduced motion;
- the figure does not declare `name`, `means`, `rules` and `range`;
- the figure is over 200 lines, a sign the concept is too complicated.

The checks are static, on the text of the file. They catch what is mechanical; the look catches the rest.

## The look

With a browser, the agent opens the file and takes four pictures: at rest and with the pointer over the figure, at 240px wide and at full size. It checks them against `look.md`:

- the silhouette reads at 240px;
- rest is a composition, not a flat or empty state (rule 05);
- the answer falls off with distance, or spreads out from the pointer (rules 02, 03);
- nothing flickers when the pointer sits on a moving edge (rule 01);
- bright outside, dim inside, no vertical corners drawn (rule 09);
- the read-out names what is under the pointer and says `rest` when nothing is.

Without a browser the agent answers the same list from the code and says so at hand-off. Without Node it reads the validator's list and says so too.

## Tests

In this repository's CI:

- **Kernel is current.** Regenerate and compare with the committed `kernel.js`. A change to `src/core` that is not followed by a regenerated kernel fails.
- **Validator.** The two examples, assembled on the bench, pass. A set of deliberately broken files, one per check, each fails with the right message.
- **Browser (Playwright).** Each example on the bench: clean console; the SVG and the read-out change when the pointer enters and return to rest when it leaves; the slider changes the drawing; the theme switch changes the palette; no horizontal scroll at 240px.
- **Fidelity.** The Terrain example on the bench draws the same SVG as the package's Terrain along the scripted pointer path of the existing parity tests, under the same frozen clock. This is the proof that the extracted kernel behaves as the original.
- **Skill shape.** `SKILL.md` has valid frontmatter and every file it points to exists.

## What the tests do not cover

No automatic test proves that an agent turns a new idea into a good figure. Before the skill is announced there is a manual trial: five varied ideas, each in a clean session, judged by Lucas. Every recurring defect becomes a line in `rules.md` or a check in the validator. The trial is part of the work, not a follow-up; its results and the changes they caused are recorded in the pull request.

## Out of scope

- A Claude Code plugin (`.claude-plugin/`). It can be added later without rework.
- Exporting the figure as a component for a project.
- More than one figure per file.
- A section on the site's `/docs`. A separate pull request after the trial, so nothing is announced before its quality is known.
- Any change to the package's public API.

## Dependencies and risks

- **The repository must be public** for `npx skills add lucasmarkes/hairline` to work. That is step 1 of T16 and waits for Lucas. The skill can be built, tested and tried locally before then.
- **Kernel size.** Around 600 lines of TypeScript become the kernel; it is pasted into every output and read by the agent. If it weighs too much on context, the agent can be told to copy it by file operation instead of reading it, and to read only a short API summary. The plan measures this in the trial.
- **Static checks can be fooled.** A figure can break rule 04 in ways a text check misses. The look and the trial are the answer, not a cleverer validator.

## Execution

Lucas asked that the architect (spec, plan, review) run on Fable and the code be written by subagents on Opus.
