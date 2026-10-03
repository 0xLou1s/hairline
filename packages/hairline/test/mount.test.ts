// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { frames, host, observers, pending } from "./dom";
import { exploded, keyboard, phosphor, riffle, slow, terrain, turntable } from "../src/index";
import { css } from "../src/core/styles";

const ALL = { riffle, terrain, exploded, phosphor, slow, turntable, keyboard };
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("mount", () => {
  it.each(Object.entries(ALL))("%s draws into the element and takes it all back", (id, mount) => {
    const el = host();
    el.className = "mine";
    const f = mount(el);
    expect(el.getAttribute("data-hairline")).toBe(id);
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 400 320");
    expect(el.querySelector("svg")!.childElementCount).toBeGreaterThan(0);
    expect(el.getAttribute("aria-label")).toBeTruthy();
    f.destroy();
    expect(el.outerHTML).toBe('<div class="mine"></div>');
  });

  it("makes Riffle a focusable group with a live region, and the others images", () => {
    const a = host(), b = host();
    riffle(a); terrain(b);
    expect(a.getAttribute("role")).toBe("group");
    expect(a.getAttribute("tabindex")).toBe("0");
    expect(a.querySelector("[data-hairline-live]")!.getAttribute("aria-live")).toBe("polite");
    expect(b.getAttribute("role")).toBe("img");
    expect(b.hasAttribute("tabindex")).toBe(false);
    expect(b.querySelector("[data-hairline-live]")).toBeNull();
  });

  it("leaves the host's own attributes alone, at mount and at destroy", () => {
    const el = host();
    el.setAttribute("role", "figure");
    el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-label", "My cards");
    const f = riffle(el, { label: "ignored" });
    expect(el.getAttribute("role")).toBe("figure");
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(el.getAttribute("aria-label")).toBe("My cards");
    f.destroy();
    expect(el.getAttribute("role")).toBe("figure");
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(el.getAttribute("aria-label")).toBe("My cards");
  });

  it("does not name an element that aria-labelledby already names", () => {
    const el = host();
    el.setAttribute("aria-labelledby", "caption");
    const f = terrain(el);
    expect(el.hasAttribute("aria-label")).toBe(false);
    f.destroy();
    expect(el.getAttribute("aria-labelledby")).toBe("caption");
  });

  it("drops its own name when the element gains aria-labelledby", () => {
    const el = host();
    const f = terrain(el);
    el.setAttribute("aria-labelledby", "caption");
    f.update({});
    expect(el.hasAttribute("aria-label")).toBe(false);
  });

  it("throws a TypeError for something that is not an element", () => {
    expect(() => riffle(null as unknown as HTMLElement)).toThrow(TypeError);
    expect(() => riffle("#cards" as unknown as HTMLElement)).toThrow(/takes an element/);
  });

  it("replaces a figure already on the element", () => {
    const el = host();
    riffle(el);
    terrain(el);
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.getAttribute("data-hairline")).toBe("terrain");
    expect(el.getAttribute("role")).toBe("img");
    expect(el.hasAttribute("tabindex")).toBe(false);
    expect(el.querySelector("[data-hairline-live]")).toBeNull();
  });

  it("draws no hit bands on Riffle, and the stylesheet has no rules for them", () => {
    const el = host();
    riffle(el);
    expect(el.querySelector(".bands")).toBeNull();
    expect(css(true) + css(false)).not.toMatch(/bands/);
  });

  it("puts the stylesheet in the document once, however many figures mount", () => {
    riffle(host()); terrain(host()); slow(host());
    const sheets = document.adoptedStyleSheets?.length ?? 0;
    expect(sheets + document.querySelectorAll("style[data-hairline-style]").length).toBe(1);
  });
});

describe("options", () => {
  it("sets and clears the theme attribute", () => {
    const el = host();
    const f = terrain(el, { theme: "dark" });
    expect(el.getAttribute("data-hairline-theme")).toBe("dark");
    f.update({ theme: "light" });
    expect(el.getAttribute("data-hairline-theme")).toBe("light");
    f.update({ theme: "auto" });
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    f.update({ theme: "dark" });
    f.update({ theme: undefined });
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
  });

  it("updates the label, and goes back to the default when it is removed", () => {
    const el = host();
    const f = terrain(el);
    const standard = el.getAttribute("aria-label");
    f.update({ label: "Dunes" });
    expect(el.getAttribute("aria-label")).toBe("Dunes");
    f.update({ label: undefined });
    expect(el.getAttribute("aria-label")).toBe(standard);
  });

  // Review Focus 1: a caller without types passes what it has
  it.each(["0.8", -3, 7, NaN, null, "fast", {}, Infinity])("mounts, updates and draws with %o as the intensity", (v) => {
    const el = host();
    const bad = v as unknown as number;
    for (const mount of Object.values(ALL)) {
      const f = mount(el, { intensity: bad });
      el.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160, bubbles: true }));
      f.update({ intensity: bad });
      frames(3);
      expect(el.querySelector("svg")!.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
      f.destroy();
    }
  });
});

describe("intensity", () => {
  /* the same input for every host: a point, or a number of frames */
  const PLAY: Record<keyof typeof ALL, Array<[number, number] | number>> = {
    riffle: [[150, 120], 12],
    terrain: [[200, 160], 20],
    exploded: [[100, 80], 30],
    phosphor: [[240, 140], 2, [260, 145], 2, [280, 150], 15],
    slow: [[200, 160], 60],
    turntable: [[50, 176], 1, [120, 176], 1, [200, 176], 1, [280, 176], 1, [350, 176], 40],
    keyboard: [[200, 160], 20],
  };
  const svg = (el: Element) => el.querySelector("svg")!.innerHTML.replace(/hl-fd\d+/g, "hl-fd");

  /* the hosts run side by side on one clock, so the default and an explicit 0.5 must draw alike: that is the control */
  it.each(Object.keys(ALL) as Array<keyof typeof ALL>)("reaches %s's engine, at mount and through update", (id) => {
    const mount = ALL[id];
    const els = Array.from({ length: 6 }, host);
    const [base, half, none, full, text, reset] = els;
    mount(base);
    mount(half, { intensity: 0.5 });
    mount(none, { intensity: 0 });
    mount(full, { intensity: 1 });
    mount(text, { intensity: "1" as unknown as number });
    mount(reset, { intensity: 1 }).update({ intensity: undefined });
    for (const step of PLAY[id]) {
      if (typeof step === "number") frames(step);
      else for (const el of els) el.dispatchEvent(new MouseEvent("pointermove", { clientX: step[0], clientY: step[1], bubbles: true }));
    }
    expect(svg(half)).toBe(svg(base));
    expect(svg(reset)).toBe(svg(base));
    expect(svg(none)).not.toBe(svg(base));
    expect(svg(full)).not.toBe(svg(base));
    expect(svg(text)).toBe(svg(full));
  });

  it("keeps the intensity when update leaves it out", () => {
    const els = [host(), host()];
    terrain(els[0], { intensity: 1 }).update({ theme: "dark" });
    terrain(els[1], { intensity: 1 });
    for (const el of els) el.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160, bubbles: true }));
    frames(20);
    expect(svg(els[0])).toBe(svg(els[1]));
  });
});

describe("the caption", () => {
  it("calls onRead once at mount with the rest caption", () => {
    for (const [id, rest] of [["riffle", "rest"], ["terrain", "rest"], ["slow", "rate 1.00×"]] as const) {
      const onRead = vi.fn();
      ALL[id](host(), { onRead });
      expect(onRead.mock.calls).toEqual([[rest]]);
    }
  });

  it("does not repeat a caption that has not changed", () => {
    const onRead = vi.fn();
    slow(host(), { onRead });
    frames(30);
    expect(onRead.mock.calls).toEqual([["rate 1.00×"]]);
  });

  it("reads a pulled card out by its number alone, in the caption and the live region", () => {
    const el = host(), onRead = vi.fn();
    /* the old option, from a caller without types: ignored */
    const f = riffle(el, { onRead, labels: ["Radial menu", "Drum"] } as never);
    key(el, "ArrowLeft");
    expect(onRead).toHaveBeenLastCalledWith("01");
    expect(el.querySelector("[data-hairline-live]")!.textContent).toBe("01");
    f.update({ labels: ["Radial menu"] } as never);
    key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("02");
    for (let i = 0; i < 7; i++) key(el, "ArrowRight");
    expect(onRead).toHaveBeenLastCalledWith("08");
    expect(el.querySelector("[data-hairline-live]")!.textContent).toBe("08");
    key(el, "Escape");
    expect(onRead).toHaveBeenLastCalledWith("rest");
  });

  // Review Focus 2: every figure on the page shares one frame loop
  it("reports an onRead that throws and keeps every figure running", () => {
    const reported = vi.fn();
    vi.stubGlobal("reportError", reported);
    const boom = new Error("consumer bug");
    const other = vi.fn();
    const a = host(), b = host();
    expect(() => slow(a, { onRead: () => { throw boom; } })).not.toThrow();
    slow(b, { onRead: other });
    a.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160 }));
    b.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 160 }));
    expect(() => frames(120)).not.toThrow();
    expect(reported.mock.calls.length).toBeGreaterThan(1);
    expect(reported).toHaveBeenCalledWith(boom);
    expect(other.mock.calls.length).toBeGreaterThan(1);
    expect(other.mock.calls[other.mock.calls.length - 1][0]).toMatch(/^rate 0\.20×/);
  });
});

describe("teardown", () => {
  it("destroys twice without complaint", () => {
    const f = riffle(host());
    f.destroy();
    expect(() => f.destroy()).not.toThrow();
  });

  // Review Focus 3: a handle kept after its figure is gone
  it("ignores update on a destroyed figure", () => {
    const el = host();
    const f = terrain(el);
    f.destroy();
    f.update({ theme: "dark", label: "late", intensity: 1 });
    expect(el.outerHTML).toBe("<div></div>");
  });

  it("ignores a stale handle once another figure has taken the element", () => {
    const el = host();
    const old = riffle(el);
    terrain(el);
    old.update({ theme: "dark", label: "late" });
    old.destroy();
    expect(el.getAttribute("data-hairline")).toBe("terrain");
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    expect(el.getAttribute("aria-label")).not.toBe("late");
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.querySelector("svg")!.childElementCount).toBeGreaterThan(0);
  });

  it("leaves no frame and no observer behind the last figure", () => {
    const a = slow(host()), b = phosphor(host());
    frames(2);
    expect(pending()).toBe(1);
    expect(observers.size).toBe(1);
    a.destroy();
    frames(2);
    expect(pending()).toBe(1);
    b.destroy();
    expect(pending()).toBe(0);
    expect(observers.size).toBe(0);
  });

  it("stops listening to the element", () => {
    const el = host(), onRead = vi.fn();
    riffle(el, { onRead }).destroy();
    onRead.mockClear();
    key(el, "ArrowLeft");
    expect(onRead).not.toHaveBeenCalled();
  });
});
