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
      planned("elevator", "Elevator", "Four floors with the shaft open and the car inside. The pointer's height picks the floor; the car travels there.", "The car travels faster between floors."),
    ],
  },
  {
    id: "devices", title: "Devices", color: "#10b981", figures: [
      drawn("keyboard"),
      planned("phone", "Phone", "A phone in layers: glass, board, battery, shell. Moving across opens the gap; moving down picks a layer.", "The layers open further."),
      planned("laptop", "Laptop", "A thin laptop, open on its hinge. The pointer's height sets the lid; it follows on a spring.", "The lid opens wider."),
    ],
  },
  {
    id: "coding", title: "Coding", color: "#0ea5e9", figures: [
      planned("terminal", "Terminal", "A terminal window with its history in rows. The pointer's height scrolls back; the line under it lifts and its neighbours follow.", "The lift spreads further."),
      planned("cabinet", "Cabinet", "A rack of twelve blades, a few half out. The pointer's height pulls the nearest ones out, the farther the less.", "More blades come out."),
      planned("branches", "Branches", "A commit graph with a branch forking off main and merging back. The commit under the pointer rises, and its history rises after it.", "More of the history rises."),
    ],
  },
  {
    id: "security", title: "Security", color: "#ef4444", figures: [
      planned("vault", "Vault", "A vault door with a dial and three bolts. The pointer turns the dial; detents catch every ten, and on the combination the bolts draw back.", "The dial coasts longer."),
      planned("lockers", "Lockers", "A bank of twelve lockers, one ajar at rest. The locker under the pointer opens; the one at rest closes.", "The door opens wider."),
      planned("padlock", "Padlock", "A padlock with its shackle in. As the pointer comes near the shackle lifts out and swings open.", "The shackle swings further."),
    ],
  },
  {
    id: "connectivity", title: "Connectivity", color: "#ec4899", figures: [
      planned("patch", "Patch", "A patch panel of twenty-four ports with cables. The cable under the pointer lifts and its neighbours lean away.", "The lean spreads further."),
      planned("dish", "Dish", "A parabolic dish on a two-axis gimbal. The pointer aims the dish; it follows on a spring.", "The dish swings further."),
      planned("router", "Router", "A router with its antennas up. Each antenna leans toward the pointer, the nearest most.", "The lean spreads further."),
    ],
  },
];

export const ENTRIES: Entry[] = SHELVES.flatMap((s) => s.figures);

/** "Seven shelves, nineteen figures" */
export function tally(): string {
  return `${cap(spell(SHELVES.length))} shelves, ${spell(ENTRIES.length)} figures`;
}
