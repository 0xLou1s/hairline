// @vitest-environment jsdom
import { StrictMode, createRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { observers, pending } from "./dom";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "../src/react";

afterEach(cleanup);

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("components", () => {
  it("renders each figure into one div", () => {
    const { container } = render(<><Riffle /><Terrain /><Exploded /><Phosphor /><Slow /><Turntable /></>);
    const ids = [...container.children].map((el) => el.getAttribute("data-hairline"));
    expect(ids).toEqual(["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"]);
    for (const el of container.children) expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
  });

  it("passes div attributes through, forwards the ref, and keeps the options off the DOM", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Riffle ref={ref} id="cards" className="w-80" data-x="1" style={{ width: 320 }} stagger={60} bands labels={["a"]} theme="dark" />);
    const el = container.firstElementChild as HTMLDivElement;
    expect(ref.current).toBe(el);
    expect(el.id).toBe("cards");
    expect(el.className).toBe("w-80");
    expect(el.getAttribute("data-x")).toBe("1");
    expect(el.style.width).toBe("320px");
    expect(el.style.aspectRatio).toBe("5 / 4");
    for (const name of ["stagger", "bands", "labels", "theme", "onread"]) expect(el.hasAttribute(name)).toBe(false);
    expect(el.getAttribute("data-hairline-theme")).toBe("dark");
    expect(el.querySelector(".bands")!.classList.contains("show")).toBe(true);
  });

  it("lets the style prop override the aspect ratio", () => {
    const { container } = render(<Terrain style={{ aspectRatio: "1 / 1" }} />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("1 / 1");
  });

  it("uses the label prop, and aria-label when the caller sets that instead", () => {
    const { container, rerender } = render(<Terrain label="Dunes" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute("aria-label")).toBe("Dunes");
    rerender(<Terrain aria-label="Hills" />);
    expect(el.getAttribute("aria-label")).toBe("Hills");
  });

  it("updates the running figure when a prop changes, without remounting", () => {
    const { container, rerender } = render(<Riffle theme="dark" />);
    const el = container.firstElementChild!, svg = el.querySelector("svg");
    rerender(<Riffle theme="light" bands />);
    expect(el.getAttribute("data-hairline-theme")).toBe("light");
    expect(el.querySelector(".bands")!.classList.contains("show")).toBe(true);
    rerender(<Riffle />);
    expect(el.hasAttribute("data-hairline-theme")).toBe(false);
    expect(el.querySelector(".bands")!.classList.contains("show")).toBe(false);
    expect(el.querySelector("svg")).toBe(svg);
  });

  // Review Focus 4: a function or an array written inline is new on every render
  it("does not remount, and does not loop, on an inline onRead and inline labels", () => {
    const seen: string[] = [];
    let renders = 0;
    function App({ n }: { n: number }) {
      renders++;
      return <Riffle data-n={n} labels={["Radial menu", "Drum"]} onRead={(t) => seen.push(`${n}:${t}`)} />;
    }
    const { container, rerender } = render(<App n={1} />);
    const el = container.firstElementChild!, svg = el.querySelector("svg");
    rerender(<App n={2} />);
    rerender(<App n={3} />);
    expect(renders).toBe(3);
    expect(el.querySelector("svg")).toBe(svg);
    key(el, "ArrowLeft");
    // one call at mount, and the latest function is the one called afterwards
    expect(seen).toEqual(["1:rest", "3:01 · Radial menu"]);
  });

  it("calls a state setter from onRead without looping", () => {
    const onRead = vi.fn();
    const { container } = render(<Slow onRead={onRead} />);
    expect(onRead.mock.calls).toEqual([["rate 1.00×"]]);
    expect(container.firstElementChild!.querySelectorAll("svg")).toHaveLength(1);
  });

  it("survives StrictMode's double mount with one drawing", () => {
    const onRead = vi.fn();
    const { container } = render(<StrictMode><Riffle onRead={onRead} /></StrictMode>);
    const el = container.firstElementChild!;
    expect(el.querySelectorAll(":scope > svg")).toHaveLength(1);
    expect(el.querySelectorAll("[data-hairline-live]")).toHaveLength(1);
    expect(observers.size).toBe(1);
    key(el, "ArrowLeft");
    expect(onRead).toHaveBeenLastCalledWith("01");
  });

  it("cleans up on unmount", () => {
    const { container, unmount } = render(<><Slow /><Phosphor /></>);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    unmount();
    expect(pending()).toBe(0);
    expect(observers.size).toBe(0);
  });

  it("names the components for the dev tools", () => {
    expect([Riffle, Terrain, Exploded, Phosphor, Slow, Turntable].map((c) => c.displayName))
      .toEqual(["Riffle", "Terrain", "Exploded", "Phosphor", "Slow", "Turntable"]);
  });
});
