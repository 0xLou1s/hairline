import {
  forwardRef, useCallback, useEffect, useLayoutEffect, useRef,
  type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type RefAttributes,
} from "react";
import { elevator, exploded, keyboard, phosphor, riffle, slow, terrain, turntable, type Figure, type HairlineOptions } from "./index";

/**
 * @lucasmarkes/hairline/react — the eight figures as components.
 *
 * A component renders one empty `<div>` and mounts the figure on it in a
 * layout effect, so on the server the box is there and the drawing is not.
 * It mounts once: a changed option reaches the running figure as `update`,
 * and `onRead` is called through a ref, so an inline function never remounts.
 */

/** The figure's options, plus every `<div>` attribute except `children`. */
export type HairlineProps = HairlineOptions & Omit<ComponentPropsWithoutRef<"div">, "children" | keyof HairlineOptions>;
type HairlineComponent = ForwardRefExoticComponent<HairlineProps & RefAttributes<HTMLDivElement>>;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function make(name: string, mount: (el: HTMLElement, options?: HairlineOptions) => Figure): HairlineComponent {
  const Component = forwardRef<HTMLDivElement, HairlineProps>(function Hairline(props, ref) {
    const { intensity, theme, label, onRead, style, ...attrs } = props;
    /* aria-label stays on the div and is the figure's label too, so the two never disagree about the name */
    const named = label ?? props["aria-label"];

    const el = useRef<HTMLDivElement | null>(null);
    const figure = useRef<Figure | null>(null);
    const read = useRef(onRead);
    const set = useCallback((node: HTMLDivElement | null) => {
      el.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    useIsoLayoutEffect(() => { read.current = onRead; });

    useIsoLayoutEffect(() => {
      const f = mount(el.current!, { intensity, theme, label: named, onRead: (text) => read.current?.(text) });
      figure.current = f;
      return () => { f.destroy(); figure.current = null; };
      // mounts once; options reach the figure through the effect below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* every key is sent, so a prop that was removed goes back to its default */
    useIsoLayoutEffect(() => { figure.current?.update({ intensity, theme, label: named }); }, [intensity, theme, named]);

    return <div {...attrs} ref={set} style={{ aspectRatio: "5 / 4", ...style }} />;
  });
  Component.displayName = name;
  return Component;
}

/** A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. `intensity` spreads the ripple further from the pulled card. */
export const Riffle = make("Riffle", riffle);
/** Eighty-one pillars on a plinth that rise around the pointer. `intensity` widens the area that rises. */
export const Terrain = make("Terrain", terrain);
/** An app window in four layers. Moving across opens the gap; moving down picks a layer. `intensity` opens the layers further. */
export const Exploded = make("Exploded", exploded);
/** A seven by seven dot matrix that plays a loop, and fades like phosphor where the pointer paints it. `intensity` makes the trail linger longer. */
export const Phosphor = make("Phosphor", phosphor);
/** Crates riding a belt through a gate. Hovering slows the clock without stopping it. `intensity` slows it more. */
export const Slow = make("Slow", slow);
/** Blocks on a turntable. A flick across it spins it; it settles on the nearest quarter turn. `intensity` makes the spin coast longer. */
export const Turntable = make("Turntable", turntable);
/** A sixty-key board. The key under the pointer sinks, and its neighbours follow it down, less the further away. `intensity` widens how far the press reaches. */
export const Keyboard = make("Keyboard", keyboard);
/** Four floors beside an open shaft. The pointer's height picks a floor, and the car travels there through the ones between. `intensity` makes the car travel faster. */
export const Elevator = make("Elevator", elevator);
