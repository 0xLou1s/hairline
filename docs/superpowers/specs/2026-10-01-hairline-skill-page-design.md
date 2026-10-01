# `/skill`: a page for `hairline-create`

Date: 2026-10-01. Status: design approved in conversation, awaiting review of this document.

## Purpose

The `hairline-create` skill lets anyone with a coding agent draw a new Hairline figure. This page is where someone from outside decides whether to install it. It shows what the skill produces, then says how to install it, how it works and how to use it.

Success is a visitor who moves a figure the skill drew, reads the one-line prompt that produced it, and copies the install command.

This page replaces the `/docs` section on the skill that the skill's spec left for a later pull request.

## Decisions made

| Question | Decision |
| --- | --- |
| How an example appears | Live: the generated page in an `iframe`, beside its prompt. |
| Which examples | Four prompts: a sales funnel, a rate limiter, git branches, weather over a city. The bookshelf is dropped. |
| Which version of them | Generated again, each in a clean session, after the trial's fixes to the skill are in. Never retouched by hand. |
| Where the work lands | Its own pull request, branched from `main` after the skill's pull request (#4) is merged. |
| When it goes live | With the repository going public, so the install command works for whoever reads it. Lucas plans both for today. |

## The examples

- **Source.** Each example is the file the skill wrote, `hairline-<name>.html`, copied byte for byte into `apps/site/public/skill/`.
- **Prompt.** The prompt shown is the one typed in the session, for example `/hairline-create a sales funnel`.
- **Embedding.** One `iframe` per example, with `loading="lazy"` and a `title` that is the figure's `means`. Its height is reserved before it loads and then fitted to the generated page, so the frame never scrolls inside and the page does not jump.
- **Theme.** The site is light only (`color-scheme: light`), and a generated page follows the system. Each frame is loaded with `?theme=light`, a parameter the bench gains in pull request #4, so a visitor on a dark system does not get four dark plates on a white page. The generated page keeps its own switch inside the frame.
- **Honesty.** A figure drawn by hand, or rebuilt on the package, would not be what the prompt produced. Mounting the figure in React with the kernel was rejected for the same reason, and because it would tie the site to the kernel.

## The page

Route `/skill`, in the site's existing layout, with the top bar and footer every page has. From top to bottom:

1. **Opening.** One sentence saying what the skill does, and the install command, `npx skills add lucasmarkes/hairline`, with a copy button.
2. **Examples.** Four rows. Each has the prompt on the left, in a code block with a copy button, and the live figure on the right. Under the prompt, a link that opens the generated page on its own. The figure's `means` line is already inside the frame, so it is not repeated. On a narrow screen the prompt sits above the figure.
3. **How it works.** The skill's five steps, one line each: concepts, build, check, hand over, adjust. Then one sentence on what reaches the person's machine: the skill folder and nothing else, with no `npm install`. Node is needed only for the checks.
4. **How to use it.** The command `/hairline-create <idea>`; what comes out (one self-contained HTML file); how to ask for changes; the agents it runs on (any agent that reads skills: Claude Code, Cursor, Codex and others).
5. **Links.** To `/docs` and to the skill's folder on GitHub.

The examples come before the explanation because they are what convinces.

All copy is in English and follows the site's voice: short, plain, no exclamation.

## Files

| File | Role |
| --- | --- |
| `apps/site/app/skill/page.tsx` | The page. Uses the existing `code-block`, `copy` and `install` components. |
| `apps/site/lib/skill.ts` | The four examples, `prompt` and `file`, and the page's copy as plain text. `name` and `means` are read from each generated page at build, so they cannot drift from it. |
| `apps/site/components/example-frame.tsx` | The frame that fits its height to the generated page. |
| `apps/site/public/skill/hairline-<name>.html` | The four generated pages, unaltered. |
| `apps/site/components/chrome.tsx` | A `Skill` link in the top bar, after `Docs`. |
| `apps/site/lib/llms.ts` | An entry for `/skill` in `llms.txt`. |

Nothing in `packages/hairline/src` changes, and nothing in `skills/hairline-create/` changes in this pull request. The bench's `theme` parameter arrives with pull request #4.

## Tests

- **The showcase is honest (vitest).** Every file in `public/skill/` passes `skills/hairline-create/validate.mjs`. Every entry in `lib/skill.ts` points to a file that exists, and every file there has an entry. So a hand-edited example, or a kernel that moved on without the examples being generated again, fails CI.
- **Light on a dark system.** With the system set to dark, each frame's page is still light.
- **No scroll inside a frame.** At 1200px and at 320px, each frame is as tall as the page inside it.
- **Browser (Playwright).** The page opens with a clean console. The copy buttons put the install command and a prompt on the clipboard. The four frames load, and a figure answers the pointer: its read-out leaves `rest`. There is no horizontal scroll at 320px. The top bar's `Skill` link reaches the page.
- **`llms.txt`.** It lists `/skill`.

## Out of scope

- Changes to the skill itself. The trial's fixes belong to pull request #4.
- A gallery of figures made by other people.
- Running the skill in the browser.
- A theme switch for the site.

## Dependencies and order

1. Pull request #4 closes: the bookshelf folder is deleted from the trial, the trial's fixes go in, the four prompts are run again in clean sessions, and Lucas sees the results. Its merge needs Lucas's yes.
2. This pull request branches from `main` after that merge, because its tests run the skill's validator.
3. Making the repository public and publishing to npm are Lucas's steps, each confirmed by them. This page goes to production with the first.

## Risks

- **A regenerated example comes out weak.** The page shows what the skill makes, so a weak figure is a finding about the skill, fixed in the skill and run again. If a prompt stays weak after that, it is dropped from the list rather than retouched.
- **Four frames weigh on the page.** Each generated page is about 34 KB and self-contained, and frames below the fold load lazily. The plan measures the page before and after.
- **The kernel changes later.** The examples then fail the showcase test until they are generated again. That is the intended signal.
