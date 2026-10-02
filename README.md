# hairline

Six isometric line figures that answer the pointer. For React and for anything with a DOM.

[![npm](https://img.shields.io/npm/v/@lucasmarkes/hairline)](https://www.npmjs.com/package/@lucasmarkes/hairline)
[![CI](https://github.com/lucasmarkes/hairline/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasmarkes/hairline/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/lucasmarkes/hairline)](./LICENSE)

![The six figures: a tray of cards, a field of pillars, a window in layers, a dot matrix, a conveyor belt and a turntable](https://raw.githubusercontent.com/lucasmarkes/hairline/main/assets/hero.gif)

Live, with a slider for `intensity`: **[hairline.lucasmarkes.com](https://hairline.lucasmarkes.com)**

## Install

```sh
npm i @lucasmarkes/hairline
```

No dependencies. ESM only. React 18 or later is an optional peer, needed only by `@lucasmarkes/hairline/react`.

With shadcn, which adds the package and a wrapper that reads your theme's tokens:

```sh
npx shadcn@latest add https://hairline.lucasmarkes.com/r/hairline.json
```

## Use

### React

```tsx
import { Terrain } from "@lucasmarkes/hairline/react";

export function Hero() {
  return <Terrain />;
}
```

The figure fills its parent's width at a 5:4 aspect ratio. The entry is a client module, so a Server Component can render it with no `"use client"` of its own. Every component takes the options below and every `<div>` attribute, and forwards its ref to the `<div>`.

### Anything else

```ts
import { terrain } from "@lucasmarkes/hairline";

const figure = terrain(document.getElementById("figure")!);

figure.update({ intensity: 0.8 });
figure.destroy();
```

A figure draws into the element you give it, at the element's width and a 5:4 aspect ratio. `update` changes options on the running figure; `destroy` removes what the figure added. That is the shape of a Svelte action, so `use:terrain={{ intensity }}` works as it is.

## The figures

| Function | Component | What it is | A stronger `intensity` |
| --- | --- | --- | --- |
| `riffle` | `Riffle` | A tray of eight cards. The card under the pointer stands up; the arrow keys walk the cards. | The ripple spreads further from the pulled card. |
| `terrain` | `Terrain` | Eighty-one pillars on a plinth that rise around the pointer. | A wider area rises. |
| `exploded` | `Exploded` | An app window in four layers. Moving across opens the gap; moving down picks a layer. | The layers open further. |
| `phosphor` | `Phosphor` | A dot matrix that plays a loop, and fades like phosphor where the pointer paints it. | The trail lingers longer. |
| `slow` | `Slow` | Crates riding a belt through a gate. Hovering slows the clock without stopping it. | Time slows down more. |
| `turntable` | `Turntable` | Blocks on a turntable. A flick spins it; it settles on the nearest quarter turn. | The spin coasts longer. |

## Options

Every figure takes the same four, all optional:

| Option | Type | Default | |
| --- | --- | --- | --- |
| `intensity` | `number` | `0.5` | How strongly the figure answers the pointer, from 0 (subtle) to 1 (strong). A number outside 0…1 is clamped; anything that is not a number is 0.5. |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | `"auto"` follows the page: an ancestor with class `dark` or `data-theme="dark"`, then the page's `color-scheme`. |
| `label` | `string` | a description in English | The accessible name. In React, `aria-label` does the same. |
| `onRead` | `(text: string) => void` | | The figure's caption, each time it changes: `"03"`, `"gap 28.0"`, `"rate 0.20×"`. |

In `update`, a key set to `undefined` goes back to its default, and a key left out stays as it is.

## Theme

Six custom properties, set on the figure or on anything above it:

```css
.figures {
  --hairline-plate: #101014; /* the fill of every plate: the colour the figure sits on */
  --hairline-hi: #fafafa;    /* what is lit */
  --hairline-edge: #a1a1aa;  /* silhouettes */
  --hairline-mid: #52525b;   /* every other stroke */
  --hairline-lo: #27272a;    /* what recedes */
  --hairline-stroke: 0.9;    /* stroke width, in CSS pixels at any size */
}
```

`--hairline-plate` is the one to get right. Plates are filled, not transparent, because a plate hides what is drawn behind it; on a background that is neither white nor `#08090a`, set it to that background.

The figure's styles have no specificity, so any rule of yours wins without `!important`.

## Notes

- **Accessibility.** A figure is an image with a description you can replace with `label`. Riffle is the exception: it is a focusable group, the arrow keys walk its cards, and a live region reads the card out.
- **Reduced motion.** With `prefers-reduced-motion`, the figures that play on their own (Phosphor and Slow) hold still, and every figure still answers the pointer.
- **Performance.** Every figure on a page shares one `requestAnimationFrame` loop. A figure off screen, or at rest, does no work, and the loop stops when nothing is moving.
- **Server rendering.** On the server a component is an empty box with a 5:4 aspect ratio, so nothing shifts when it draws. The functions need a DOM: call them in an effect, in `onMount`, or in a script after the element.
- **Shadow DOM.** A figure mounted inside a shadow root styles itself there.

## Make your own

`hairline-create` is a skill for coding agents. Give it an idea and it draws a new figure to Hairline's ten rules, on the same engine as the six above, as one HTML file.

```sh
npx skills add lucasmarkes/hairline
```

Then type the command with an idea in the agent:

```
/hairline-create a sales funnel
```

It offers two or three concepts, draws the one you pick, checks it against the rules and in a browser, and hands over `hairline-<name>.html`: one file with no dependencies that opens from disk. It runs on any agent that reads skills: Claude Code, Cursor, Codex and others.

Four figures it drew, each beside its prompt: [hairline.lucasmarkes.com/skill](https://hairline.lucasmarkes.com/skill).

## More

- [hairline.lucasmarkes.com](https://hairline.lucasmarkes.com): every figure live, an inspector that writes the snippet for you, and a CDN example.
- [How Hairline was made](https://hairline.lucasmarkes.com/inspo): the brief, the arguing, and every correction written down as a rule.
- [The essay](https://lucasmarkes.com/lab/hairline): how the figures are drawn, and why with lines.
- [CHANGELOG.md](https://github.com/lucasmarkes/hairline/blob/main/CHANGELOG.md) and [CONTRIBUTING.md](https://github.com/lucasmarkes/hairline/blob/main/CONTRIBUTING.md).

## License

MIT © Lucas Marques
