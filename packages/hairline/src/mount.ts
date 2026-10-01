import { inject } from "./core/styles";
import type { FigureEls, FigureHandle, Readout } from "./core/stage";
import { number, type Range } from "./ranges";

/**
 * Hairline — the public wrapper around an engine. An engine draws into an svg
 * it is handed and writes its caption to a read-out; this file makes both,
 * dresses the host element, and gives back the two calls a consumer needs.
 *
 * It only ever removes what it added: the svg, the live region, and the
 * attributes the host did not already have.
 */

export type Theme = "auto" | "light" | "dark";

export type BaseOptions = {
  /** `"auto"` follows the page: an ancestor with class `dark` or `data-theme="dark"`, then the page's `color-scheme`. Default `"auto"`. */
  theme?: Theme;
  /** The accessible name. Each figure has a default description in English. */
  label?: string;
  /** The figure's caption, each time it changes. Called once at mount with the rest caption. */
  onRead?: (text: string) => void;
};

export type Figure<O> = {
  /** Changes options on the running figure. A key set to `undefined` goes back to its default. */
  update(options: Partial<O>): void;
  /** Stops the figure and removes what it added to the element. Safe to call twice. */
  destroy(): void;
};

/** What a figure is: its engine, the one number it takes, and what it says about itself. */
export type Spec<O extends BaseOptions, H extends FigureHandle> = {
  id: string;
  /** The default accessible name. */
  label: string;
  /** The caption at rest, for an engine that writes none until it is touched. */
  rest: string;
  /** The numeric option, and its range. */
  key: keyof O & string;
  range: Range;
  engine: (els: FigureEls, value: number) => H;
  /** Operable from the keyboard: a focusable group with a live region, not an image. */
  focusable?: boolean;
  /** Options beyond the number. Runs at mount and after every update; must be safe to repeat. */
  apply?: (engine: H, options: O) => void;
};

const NS = "http://www.w3.org/2000/svg";
const mounted = new WeakMap<Element, () => void>();

/** An error from a consumer's callback, reported as uncaught without unwinding the frame loop every figure shares. */
const report = (err: unknown) => {
  if (typeof reportError === "function") reportError(err);
  else setTimeout(() => { throw err; });
};

export function create<O extends BaseOptions, H extends FigureHandle>(spec: Spec<O, H>, el: HTMLElement, options?: O): Figure<O> {
  if (typeof document === "undefined") {
    throw new Error(`hairline: ${spec.id}() needs a DOM. Call it in the browser, once the element exists: in an effect, in onMount, or in a script after the element.`);
  }
  if (!el || el.nodeType !== 1) {
    throw new TypeError(`hairline: ${spec.id}() takes an element as its first argument, and got ${el === null ? "null" : typeof el}.`);
  }
  mounted.get(el)?.();

  const opts = { ...options } as O;
  const doc = el.ownerDocument;
  const root = el.getRootNode();
  inject(root.nodeType === 9 || "host" in root ? (root as Document | ShadowRoot) : doc);

  /* attributes: the host's own are left alone, ours are remembered */
  const owned = new Set<string>();
  const attr = (name: string, value: string | null) => {
    if (!owned.has(name) && el.hasAttribute(name)) return;
    if (value === null) { el.removeAttribute(name); owned.delete(name); }
    else { el.setAttribute(name, value); owned.add(name); }
  };
  const dress = () => {
    attr("data-hairline-theme", opts.theme === "light" || opts.theme === "dark" ? opts.theme : null);
    attr("aria-label", el.hasAttribute("aria-labelledby") ? null : typeof opts.label === "string" ? opts.label : spec.label);
  };
  attr("data-hairline", spec.id);
  attr("role", spec.focusable ? "group" : "img");
  if (spec.focusable) attr("tabindex", "0");
  dress();

  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 400 320");
  svg.setAttribute("aria-hidden", "true");
  el.appendChild(svg);
  let live: HTMLElement | null = null;
  if (spec.focusable) {
    live = doc.createElement("span");
    live.setAttribute("data-hairline-live", "");
    live.setAttribute("aria-live", "polite");
    el.appendChild(live);
  }

  /* the read-out: engines write it every frame, so only a change goes any further */
  let text: string | null = null;
  const read: Readout = {
    get textContent() { return text; },
    set textContent(value) {
      const next = value ?? "";
      if (next === text) return;
      text = next;
      if (live) live.textContent = next;
      const fn = opts.onRead;
      if (typeof fn === "function") try { fn(next); } catch (err) { report(err); }
    },
  };

  let value = number(opts[spec.key], spec.range);
  const engine = spec.engine({ stage: el, svg, read }, value);
  spec.apply?.(engine, opts);
  if (text === null) read.textContent = spec.rest;

  let dead = false;
  const destroy = () => {
    if (dead) return;
    dead = true;
    if (mounted.get(el) === destroy) mounted.delete(el);
    engine.destroy();
    svg.remove();
    live?.remove();
    for (const name of owned) el.removeAttribute(name);
    owned.clear();
  };
  mounted.set(el, destroy);

  return {
    update(next) {
      if (dead || !next) return;
      for (const k in next) {
        if (next[k] === undefined) delete opts[k];
        else opts[k] = next[k] as O[typeof k];
      }
      const v = number(opts[spec.key], spec.range);
      if (v !== value) { value = v; engine.set(v); }
      dress();
      spec.apply?.(engine, opts);
    },
    destroy,
  };
}
