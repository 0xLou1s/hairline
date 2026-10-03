import { exploded, keyboard, phosphor, riffle, slow, terrain, turntable, type Figure } from "@lucasmarkes/hairline";

/** No framework: seven elements, seven calls. */
const el = (id: string) => document.getElementById(id)!;
const read = el("read");

const cards: Figure = riffle(el("riffle"), {
  intensity: 1,
  onRead: (text) => { read.textContent = text; },
});
terrain(el("terrain"), { intensity: 0.75 });
exploded(el("exploded"));
phosphor(el("phosphor"), { theme: "dark" });
slow(el("slow"));
turntable(el("turntable"));
keyboard(el("keyboard"));

cards.update({ intensity: 0.8 });
