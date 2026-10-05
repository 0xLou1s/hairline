import { FIGURES, type FigureId } from "./figures";
import { cap, spell } from "./words";

export { spell };

/**
 * /figures: every figure on its shelf, by what it draws. A drawn figure takes
 * its copy from FIGURES, the list the docs and /llms.txt read, so the three
 * never disagree. A planned one carries its own: it is a promise of a figure,
 * with no component behind it yet. A made one (`made(...)`) carries its own
 * too: a page the skill drew from a company's mark, kept in public/skill and
 * shown in a frame, with the line that asked for it and no component behind it.
 */

export type ShelfId = "interfaces" | "data" | "machines" | "devices" | "coding" | "security" | "connectivity" | "empty" | "marks";

export type Made = { file: string; prompt: string };

export type Entry = { id: string; name: string; summary: string; stronger: string } & ({ drawn: true; id: FigureId } | { drawn: false; made?: Made });

export const NOTICE = "Brands I like, drawn as a tribute. The marks belong to their owners; Hairline is not affiliated with them.";

export type Shelf = { id: ShelfId; title: string; color: string; figures: Entry[] };

const drawn = (id: FigureId): Entry => {
  const { name, summary, stronger } = FIGURES.find((f) => f.id === id)!;
  return { id, name, summary, stronger, drawn: true };
};
const planned = (id: string, name: string, summary: string, stronger: string): Entry => ({ id, name, summary, stronger, drawn: false });

const COMMAND = "/hairline-create";
/** A figure the skill drew: its page in public/skill and the line that asked for it. test/catalogue.test.ts holds both to lib/skill.ts, which a client module cannot import. */
const made = (id: string, name: string, summary: string, stronger: string, idea: string): Entry => ({ id, name, summary, stronger, drawn: false, made: { file: `hairline-${id}.html`, prompt: `${COMMAND} ${idea}` } });

export const SHELVES: Shelf[] = [
  {
    id: "interfaces", title: "Interfaces", color: "#3b82f6", figures: [
      drawn("exploded"),
    ],
  },
  {
    id: "data", title: "Data", color: "#8b5cf6", figures: [
      drawn("terrain"),
      drawn("phosphor"),
      drawn("riffle"),
    ],
  },
  {
    id: "machines", title: "Machines", color: "#f59e0b", figures: [
      drawn("slow"),
      drawn("turntable"),
      drawn("elevator"),
    ],
  },
  {
    id: "devices", title: "Devices", color: "#10b981", figures: [
      drawn("keyboard"),
      drawn("phone"),
      drawn("laptop"),
    ],
  },
  {
    id: "coding", title: "Coding", color: "#0ea5e9", figures: [
      drawn("terminal"),
      drawn("cabinet"),
      drawn("branches"),
    ],
  },
  {
    id: "security", title: "Security", color: "#ef4444", figures: [
      drawn("vault"),
      drawn("lockers"),
      drawn("padlock"),
    ],
  },
  {
    id: "connectivity", title: "Connectivity", color: "#ec4899", figures: [
      drawn("patch"),
      drawn("dish"),
      drawn("router"),
    ],
  },
  {
    id: "empty", title: "Empty", color: "#64748b", figures: [
      drawn("loupe"),
      drawn("sieve"),
      drawn("rail"),
      drawn("plug"),
      drawn("query"),
      drawn("drawer"),
      drawn("basket"),
      drawn("plot"),
    ],
  },
  {
    id: "marks", title: "Marks", color: "#f97316", figures: [
      made("vercel", "Vercel", "\"No deployments yet.\" The triangle hovers over its pad. The nearer the pointer, the lower it settles, until it seats.", "It answers from further away.", "an empty state for \"No deployments yet\", from Vercel's mark: the triangle as an upright slab hovering over a pad with its slot marked dim; the nearer the pointer, the lower it settles, until it seats. Name it vercel."),
      made("mastra", "Mastra", "\"No agents connected.\" The spheres of the mark, joined, and one apart. The pointer draws it in; a neck forms, stretches and lets go.", "The neck holds further before it lets go.", "an empty state for \"No agents connected\", from Mastra's mark: the spheres of the M joined by necks on a board, the lone sphere standing apart; the pointer draws it toward the others, a neck forms, stretches and lets go. Name it mastra."),
      made("notion", "Notion", "\"No pages inside.\" The cube as a box. The pointer's height opens its lid, and the box is empty.", "The lid opens wider.", "an empty state for \"No pages inside\", from Notion's mark: the cube as a box with a lid, the N a relief on its front face; the pointer's height opens the lid on a spring, and the box is empty. Name it notion."),
    ],
  },
];

export const ENTRIES: Entry[] = SHELVES.flatMap((s) => s.figures);

/** "Eight shelves, twenty-seven figures": the package's. The marks are the skill's, and are counted apart. */
export function tally(): string {
  const own = SHELVES.filter((s) => s.id !== "marks");
  return `${cap(spell(own.length))} shelves, ${spell(own.flatMap((s) => s.figures).length)} figures`;
}
