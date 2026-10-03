import { branches, cabinet, elevator, exploded, keyboard, laptop, phone, phosphor, riffle, slow, terminal, terrain, turntable, type Figure } from "@lucasmarkes/hairline";

/** No framework: thirteen elements, thirteen calls. */
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
terminal(el("terminal"));
cabinet(el("cabinet"));
branches(el("branches"));

cards.update({ intensity: 0.8 });
