# The look

The validator reads text. This is what only eyes can check. Do it every time the figure changes.

## Four pictures

Open `hairline-<name>.html` in a browser and take four pictures. Two parameters in the address help:

- `?w=240` narrows the page to 240px, the size of a thumbnail.
- `&at=x,y` holds the pointer at a point of the figure's 400 × 320 viewBox, for tools that cannot hover. Choose a point that is on your figure.

| Picture | Address |
| --- | --- |
| full size, at rest | `hairline-<name>.html` |
| full size, answering | `hairline-<name>.html?at=200,160` |
| 240px, at rest | `hairline-<name>.html?w=240` |
| 240px, answering | `hairline-<name>.html?w=240&at=200,160` |

Wait a second after loading before the answering pictures, so springs and tweens have landed.

## What to see

Answer each with yes or no. A no is fixed in the figure before anything is handed over.

1. **The silhouette reads at 240px.** You can say what the object is from the small picture alone.
2. **Rest is a composition** (rule 05). Not flat, not empty, not a regular grid; something is bright where the eye should start.
3. **The answer falls off with distance, or spreads out from the pointer** (rules 02 and 03). It is not everything at once, and not one part alone.
4. **Nothing flickers** (rule 01). Hold `at` on an edge that moves when touched and take two pictures a second apart: they are the same.
5. **Bright outside, dim inside** (rule 09). Every solid is a silhouette and one crease; no vertical corner is drawn; no corner is sharp.
6. **Nothing shows through** (rule 06). No far edge crosses a near solid; no guide crosses its own plate.
7. **One highlight** (rule 04). What is bright is what the pointer chose, and it is a stroke.
8. **The read-out names what is under the pointer**, in a few characters, and says `rest` at rest.
9. **Nothing leaves the frame.** With the slider at each end and the pointer at the figure's edges, every part stays inside the plate.
10. **Both themes.** Press the theme button: nothing vanishes and nothing is left the wrong colour.
11. **No words** (rule 10). Nothing in the drawing is a letter, a digit, an arrow or an icon.
12. **The page is clean.** No line under the stage reporting an error, and nothing on the console.

If you are unsure whether the figure's weight is right, build an example the same way and put the two side by side: `node build.mjs examples/terrain.js`.

## Without a browser

Answer the same twelve from the code, each with the line that makes it true: the rest values for 2, the falloff or stagger for 3, the hit test for 4, the paint order for 6. Then say at hand-over, in these words, that the figure was **not looked at in a browser**. Do not skip the list and do not guess a yes.
