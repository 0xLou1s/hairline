import { branches, cabinet, elevator, exploded, keyboard, laptop, lockers, padlock, phone, phosphor, riffle, slow, terminal, terrain, turntable, vault, type Figure } from "@lucasmarkes/hairline";

/** No framework: sixteen elements, sixteen calls. */
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
vault(el("vault"));
lockers(el("lockers"));
padlock(el("padlock"));

cards.update({ intensity: 0.8 });
