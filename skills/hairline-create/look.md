# The look

The validator reads text. This is what only eyes can check. Do it every time the figure changes.

## Pictures

Open `hairline-<name>.html` in a browser and take the four base pictures, then the four for items 9 and 10. Four parameters in the address help; join two with `&`:

- `?w=240` narrows the page to 240px, the size of a thumbnail.
- `?at=x,y` holds the pointer at a point of the 400 × 320 viewBox, for tools that cannot hover. x runs to the right and y down, from the viewBox's top-left corner. Take the point from your own figure: the screen point `P(x, y, z)` of the part you want answered, rounded. `P` exists only inside the page; `look.mjs`, below, prints it for you.
- `?intensity=` sets the slider, from 0 to 1, before the figure mounts.
- `?theme=light` or `?theme=dark` sets the theme, as pressing its button does.

| Picture | Address |
| --- | --- |
| full size, at rest | `hairline-<name>.html` |
| full size, answering | `hairline-<name>.html?at=<x>,<y>` |
| 240px, at rest | `hairline-<name>.html?w=240` |
| 240px, answering | `hairline-<name>.html?w=240&at=<x>,<y>` |
| slider at 0, pointer at the figure's edge (item 9) | `hairline-<name>.html?intensity=0&at=<x>,<y>` |
| slider at 1, pointer at the figure's edge (item 9) | `hairline-<name>.html?intensity=1&at=<x>,<y>` |
| dark theme, answering (item 10) | `hairline-<name>.html?theme=dark&at=<x>,<y>` |
| light theme, answering (item 10) | `hairline-<name>.html?theme=light&at=<x>,<y>` |

Keep the window at least 800 × 900 for every picture. `?w=240` narrows the page, not the window. A headless Chrome window narrower than 500px still lays the page out 500px wide and keeps only its left part, so the small picture comes out cropped.

Wait 1.5 seconds after loading before each picture. Strokes fade over 260ms, tweens take 700ms and springs about a second, so a picture taken sooner catches the figure mid-way. In a browser you drive, wait in your script. Chrome's command line (`--screenshot`) fires at load and does not land the motion, with `--virtual-time-budget` or without. Playwright's command line does, with the window and the wait in one command:

`npx playwright screenshot --channel chrome --viewport-size "800, 900" --wait-for-timeout 1500 "file:///<path>/hairline-<name>.html?at=<x>,<y>" shot.png`

It needs Node and an installed Chrome; without Chrome, run `npx playwright install chromium` once and drop `--channel chrome` from the command.

## The console and the points

That command cannot show the console, which item 12 needs. Make a folder of its own, run `npm i playwright` in it once, and paste this into `look.mjs` there:

```js
import { chromium } from "playwright";
const [url, ...points] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
const bad = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") bad.push(`console ${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => bad.push(`page error: ${e.message}`));
// keeps the P the figure makes from its own camera, so a world point can be turned into an ?at= point
await page.addInitScript(() => {
  let hl;
  Object.defineProperty(window, "HL", { get: () => hl, set: (v) => { hl = { ...v, proj: (C) => (window.P = v.proj(C)) }; } });
});
await page.goto(url);
await page.waitForTimeout(1500);
for (const p of points) console.log(`${p} -> at=${(await page.evaluate((q) => window.P(...q), p.split(",").map(Number))).map(Math.round)}`);
console.log(`read-out: ${await page.textContent("#read")}`);
for (const line of bad) console.log(line);
await browser.close();
process.exit(bad.length ? 1 : 0);
```

`node look.mjs "file:///<path>/hairline-<name>.html"`, run from that folder, opens the page at 800 × 900, waits 1.5 seconds, and prints the read-out and every console error, console warning and page error. It exits 1 if there was any. It uses your Chrome, or Playwright's Chromium if there is no Chrome (`npx playwright install chromium` once).

For an `?at=` point, put world points `x,y,z` after the address. The script runs each through the `P` your figure made with its own camera. Take a point on the part's top in its rest pose. For the riffle example, the top edge of card 05 at rest: `node look.mjs "file:///<path>/hairline-riffle.html" 42,28,52` prints `42,28,52 -> at=220,120`. Then check the point: `node look.mjs "file:///<path>/hairline-riffle.html?at=220,120"` prints `read-out: 05`.

## What to see

Answer each with yes or no. A no is fixed in the figure before anything is handed over.

1. **The silhouette reads at 240px.** You can say what the object is from the small picture alone.
2. **Rest is a composition** (rule 05). Not flat, not empty, not a regular grid; something is bright where the eye should start.
3. **The answer falls off with distance, or spreads out from the pointer** (rules 02 and 03). It is not everything at once, and not one part alone.
4. **Nothing flickers** (rule 01). Hold `at` on an edge that moves when touched and take two pictures a second apart: they are the same. `at` moves the pointer once, so also read the hit test: it picks from the rest pose or the target, never from the pose on screen.
5. **Bright outside, dim inside** (rule 09). Every solid is a silhouette and one crease; no vertical corner is drawn; no corner is sharp.
6. **Nothing shows through** (rule 06). No far edge crosses a near solid; no guide crosses its own plate.
7. **One highlight** (rule 04). At rest, one bright mark says where the eye should start. When the pointer chooses, the bright goes to what it chose and the rest mark gives it up. One highlight may cover the parts of one thing, a tray's rim and its beads, but it marks one place and means one thing. It is a stroke or a dot, never a fill.
8. **The read-out names what is under the pointer**, in a few characters, and says `rest` at rest.
9. **Nothing leaves the frame.** With the slider at each end (`?intensity=0`, `?intensity=1`) and the pointer at the figure's edges, every part stays inside the plate.
10. **Both themes.** In `?theme=dark` and `?theme=light`, nothing vanishes and nothing is left the wrong colour.
11. **No words** (rule 10). Nothing in the drawing is a letter, a digit, an arrow or an icon.
12. **The page is clean.** No line under the stage reporting an error, and nothing on the console: `look.mjs` exits 0.

If you are unsure whether the figure's weight is right, build an example the same way and put the two side by side: `node <skill folder>/build.mjs <skill folder>/examples/terrain.js`.

## Without a browser

Answer the same twelve from the code, each with the line that makes it true: the rest values for 2, the falloff or stagger for 3, the hit test for 4, the paint order for 6. Then say at hand-over, in these words, that the figure was **not looked at in a browser**. Do not skip the list and do not guess a yes.
