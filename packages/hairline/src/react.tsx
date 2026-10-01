import {
  forwardRef, useCallback, useEffect, useLayoutEffect, useRef,
  type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type RefAttributes,
} from "react";
import {
  exploded, phosphor, riffle, slow, terrain, turntable,
  type BaseOptions, type ExplodedOptions, type Figure, type PhosphorOptions, type RiffleOptions,
  type SlowOptions, type TerrainOptions, type TurntableOptions,
} from "./index";

/**
 * @lucasmarkes/hairline/react — the six figures as components.
 *
 * A component renders one empty `<div>` and mounts the figure on it in a
 * layout effect, so on the server the box is there and the drawing is not.
 * It mounts once: a changed option reaches the running figure as `update`,
 * and `onRead` is called through a ref, so an inline function never remounts.
 */

/** A figure's options, plus every `<div>` attribute except `children`. */
export type FigureProps<O> = O & Omit<ComponentPropsWithoutRef<"div">, "children" | keyof O>;
export type FigureComponent<O> = ForwardRefExoticComponent<FigureProps<O> & RefAttributes<HTMLDivElement>>;

type Loose = Record<string, unknown>;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function make<O extends BaseOptions>(
  name: string,
  mount: (el: HTMLElement, options?: O) => Figure<O>,
  keys: readonly (keyof O & string)[],
): FigureComponent<O> {
  /* the body is typed loosely and the signature strictly: O is generic here, and a props type built from it does not resolve inside */
  const Component = forwardRef<HTMLDivElement, Loose>(function Hairline(props, ref) {
    /* the figure's options out of the props; every key is present, so one that was removed resets */
    const options: Loose = {};
    const rest: Loose = {};
    for (const k in props) if (!(keys as readonly string[]).includes(k) && k !== "onRead") rest[k] = props[k];
    for (const k of keys) options[k] = props[k];
    /* aria-label stays on the div and is the figure's label too, so the two never disagree about the name */
    if (options.label === undefined) options.label = props["aria-label"];

    const el = useRef<HTMLDivElement | null>(null);
    const figure = useRef<Figure<O> | null>(null);
    const onRead = useRef(props.onRead as BaseOptions["onRead"]);
    const set = useCallback((node: HTMLDivElement | null) => {
      el.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    useIsoLayoutEffect(() => { onRead.current = props.onRead as BaseOptions["onRead"]; });

    useIsoLayoutEffect(() => {
      const f = mount(el.current!, { ...options, onRead: (text: string) => onRead.current?.(text) } as O);
      figure.current = f;
      return () => { f.destroy(); figure.current = null; };
      // mounts once; options reach the figure through the effect below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* an array made inline is new on every render: compare what is in it */
    const deps = keys.map((k) => { const v = options[k]; return Array.isArray(v) ? v.join("\u0000") : v; });
    useIsoLayoutEffect(() => { figure.current?.update(options as Partial<O>); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    const { style, ...attrs } = rest as ComponentPropsWithoutRef<"div">;
    return <div {...attrs} ref={set} style={{ aspectRatio: "5 / 4", ...style }} />;
  });
  Component.displayName = name;
  return Component as unknown as FigureComponent<O>;
}

const BASE = ["theme", "label"] as const;

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. */
export const Riffle = make<RiffleOptions>("Riffle", riffle, [...BASE, "stagger", "bands", "labels"]);
/** Eighty-one pillars on a plinth that rise around the pointer. */
export const Terrain = make<TerrainOptions>("Terrain", terrain, [...BASE, "radius"]);
/** An app window in four layers. Moving across opens the gap; moving down picks a layer. */
export const Exploded = make<ExplodedOptions>("Exploded", exploded, [...BASE, "gap"]);
/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. */
export const Phosphor = make<PhosphorOptions>("Phosphor", phosphor, [...BASE, "afterglow"]);
/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. */
export const Slow = make<SlowOptions>("Slow", slow, [...BASE, "rate"]);
/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. */
export const Turntable = make<TurntableOptions>("Turntable", turntable, [...BASE, "coast"]);

export type RiffleProps = FigureProps<RiffleOptions>;
export type TerrainProps = FigureProps<TerrainOptions>;
export type ExplodedProps = FigureProps<ExplodedOptions>;
export type PhosphorProps = FigureProps<PhosphorOptions>;
export type SlowProps = FigureProps<SlowOptions>;
export type TurntableProps = FigureProps<TurntableOptions>;
