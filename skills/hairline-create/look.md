# The look

The validator reads text. This is what only eyes can check. Do it every time the figure changes.

## Pictures

Open `hairline-<name>.html` in a browser and take the four base pictures, then the four for items 9 and 10. Four parameters in the address help; join two with `&`:

- `?w=240` narrows the page to 240px, the size of a thumbnail.
- `?at=x,y` holds the pointer at a point of the 400 × 320 viewBox, for tools that cannot hover. x runs to the right and y down, from the viewBox's top-left corner. Take the point from your own figure: the screen point `P(x, y, z)` of the part you want answered, rounded.
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

## What to see

Answer each with yes or no. A no is fixed in the figure before anything is handed over.

1. **The silhouette reads at 240px.** You can say what the object is from the small picture alone.
2. **Rest is a composition** (rule 05). Not flat, not empty, not a regular grid; something is bright where the eye should start.
3. **The answer falls off with distance, or spreads out from the pointer** (rules 02 and 03). It is not everything at once, and not one part alone.
4. **Nothing flickers** (rule 01). Hold `at` on an edge that moves when touched and take two pictures a second apart: they are the same. `at` moves the pointer once, so also read the hit test: it picks from the rest pose or the target, never from the pose on screen.
5. **Bright outside, dim inside** (rule 09). Every solid is a silhouette and one crease; no vertical corner is drawn; no corner is sharp.
6. **Nothing shows through** (rule 06). No far edge crosses a near solid; no guide crosses its own plate.
7. **One highlight** (rule 04). What is bright is what the pointer chose, and it is a stroke.
8. **The read-out names what is under the pointer**, in a few characters, and says `rest` at rest.
9. **Nothing leaves the frame.** With the slider at each end (`?intensity=0`, `?intensity=1`) and the pointer at the figure's edges, every part stays inside the plate.
10. **Both themes.** In `?theme=dark` and `?theme=light`, nothing vanishes and nothing is left the wrong colour.
11. **No words** (rule 10). Nothing in the drawing is a letter, a digit, an arrow or an icon.
12. **The page is clean.** No line under the stage reporting an error, and nothing on the console.

If you are unsure whether the figure's weight is right, build an example the same way and put the two side by side: `node <skill folder>/build.mjs <skill folder>/examples/terrain.js`.

## Without a browser

Answer the same twelve from the code, each with the line that makes it true: the rest values for 2, the falloff or stagger for 3, the hit test for 4, the paint order for 6. Then say at hand-over, in these words, that the figure was **not looked at in a browser**. Do not skip the list and do not guess a yes.
