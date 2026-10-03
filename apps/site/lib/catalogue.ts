import { FIGURES, type FigureId } from "./figures";
import { cap, spell } from "./words";

export { spell };

/**
 * /figures: every figure on its shelf, by what it draws. A drawn figure takes
 * its copy from FIGURES, the list the docs and /llms.txt read, so the three
 * never disagree. A planned one carries its own: it is a promise of a figure,
 * with no component behind it yet.
 */

export type ShelfId = "interfaces" | "data" | "machines" | "devices" | "coding" | "security" | "connectivity";

export type Entry = { id: string; name: string; summary: string; stronger: string } & ({ drawn: true; id: FigureId } | { drawn: false });

export type Shelf = { id: ShelfId; title: string; color: string; figures: Entry[] };

const drawn = (id: FigureId): Entry => {
  const { name, summary, stronger } = FIGURES.find((f) => f.id === id)!;
  return { id, name, summary, stronger, drawn: true };
};
const planned = (id: string, name: string, summary: string, stronger: string): Entry => ({ id, name, summary, stronger, drawn: false });

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
];

export const ENTRIES: Entry[] = SHELVES.flatMap((s) => s.figures);

/** "Seven shelves, nineteen figures" */
export function tally(): string {
  return `${cap(spell(SHELVES.length))} shelves, ${spell(ENTRIES.length)} figures`;
}
