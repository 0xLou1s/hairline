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
  { idea: "a sales funnel", file: "hairline-funnel.html" },
  { idea: "a rate limiter", file: "hairline-clearance.html" },
  { idea: "git branches", file: "hairline-sidings.html" },
  { idea: "weather over a city", file: "hairline-storm.html" },
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
