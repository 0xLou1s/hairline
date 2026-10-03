import { branches, cabinet, dish, elevator, exploded, keyboard, laptop, lockers, padlock, patch, phone, phosphor, riffle, router, slow, terminal, terrain, turntable, vault, type Figure } from "@lucasmarkes/hairline";

/** No framework: nineteen elements, nineteen calls. */
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
patch(el("patch"));
dish(el("dish"));
router(el("router"));

cards.update({ intensity: 0.8 });
