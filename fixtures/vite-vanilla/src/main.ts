import { elevator, exploded, keyboard, laptop, phone, phosphor, riffle, slow, terrain, turntable, type Figure } from "@lucasmarkes/hairline";

/** No framework: ten elements, ten calls. */
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
elevator(el("elevator"));
phone(el("phone"));
laptop(el("laptop"));

cards.update({ intensity: 0.8 });
