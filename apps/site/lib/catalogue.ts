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
      drawn("riffle"),
      drawn("keyboard"),
    ],
  },
  {
    id: "data", title: "Data", color: "#8b5cf6", figures: [
      drawn("terrain"),
      drawn("phosphor"),
      planned("funnel", "Funnel", "Three basins stepping down, water in each. The pointer picks a basin; its gate opens and the water drops to the next, staggered on down.", "The drop runs further down the flight."),
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
      planned("phone", "Phone", "A phone in layers: glass, board, battery, shell. Moving across opens the gap; moving down picks a layer.", "The layers open further."),
      planned("clock", "Clock", "A desk clock with its crown in view. The pointer turns the crown; the hands run and catch on the five-minute detents.", "The hands coast longer."),
      planned("cassette", "Cassette", "A tape with both reels in view, always turning. Hovering slows it enough to read the tape go by.", "Time slows down more."),
    ],
  },
  {
    id: "coding", title: "Coding", color: "#0ea5e9", figures: [
      planned("tape", "Tape", "A terminal as punched tape running through a reader. Hovering slows it; the hole under the pointer is lit.", "Time slows down more."),
      planned("cabinet", "Cabinet", "A rack of twelve blades, a few half out. The pointer's height pulls the nearest ones out, the farther the less.", "More blades come out."),
      planned("cards", "Cards", "A stack of punched cards in a hopper. The card under the pointer slides forward and its neighbours part.", "The part spreads further."),
    ],
  },
  {
    id: "security", title: "Security", color: "#ef4444", figures: [
      planned("vault", "Vault", "A vault door with a dial and three bolts. The pointer turns the dial; detents catch every ten, and on the combination the bolts draw back.", "The dial coasts longer."),
      planned("lockers", "Lockers", "A bank of twelve lockers, one ajar at rest. The locker under the pointer opens; the one at rest closes.", "The door opens wider."),
      planned("shutter", "Shutter", "A shopfront with a roller shutter. The pointer's height rolls the shutter up or down, slat after slat.", "The slats lag further behind each other."),
    ],
  },
  {
    id: "connectivity", title: "Connectivity", color: "#ec4899", figures: [
      planned("patch", "Patch", "A patch panel of twenty-four ports with cables. The cable under the pointer lifts and its neighbours lean away.", "The lean spreads further."),
      planned("dish", "Dish", "A parabolic dish on a two-axis gimbal. The pointer aims the dish; it follows on a spring.", "The dish swings further."),
      planned("train", "Train", "Five wagons coupled on a line. The pointer uncouples the one under it; the ones behind drift apart, staggered.", "The wagons drift further."),
    ],
  },
];

export const ENTRIES: Entry[] = SHELVES.flatMap((s) => s.figures);

/** "Seven shelves, twenty-one figures" */
export function tally(): string {
  return `${cap(spell(SHELVES.length))} shelves, ${spell(ENTRIES.length)} figures`;
}
