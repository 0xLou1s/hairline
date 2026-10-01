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
