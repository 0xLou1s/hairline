# Changelog

Every release of `@lucasmarkes/hairline`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[semver](https://semver.org/).

## 0.2.0 - Unreleased

### Added

- `keyboard` and `Keyboard`: a sixty-key board. The key under the pointer
  sinks, and its neighbours follow it down, less the further away. A stronger
  `intensity` sinks a wider patch of keys.
- `elevator` and `Elevator`: four floors beside an open shaft. The pointer's
  height picks a floor, and the car travels there through the ones between.
  A stronger `intensity` makes the car travel faster.
- `phone` and `Phone`: a phone in four layers. Moving across opens the gap
  between them, and moving down picks a layer. A stronger `intensity` opens
  the layers further.
- `laptop` and `Laptop`: a thin laptop. The pointer's height sets how far the
  lid stands open, and the lid follows it on a spring. A stronger `intensity`
  lets the lid open wider.
- `terminal` and `Terminal`: a terminal window. The pointer's height scrolls
  back through its history, and the line under it lifts off the screen. A
  stronger `intensity` lifts more lines with it.
- `cabinet` and `Cabinet`: a rack of twelve blades. The pointer's height pulls
  the nearest ones out on their rails, the farther the less. A stronger
  `intensity` pulls out more blades.
- `branches` and `Branches`: a commit graph on a board. The commit under the
  pointer rises, and its history rises after it, the farther back the less. A
  stronger `intensity` raises more of the history.
- `vault` and `Vault`: a vault door. Circling the pointer turns its dial,
  which coasts and catches every ten; on forty its three bolts draw back. A
  stronger `intensity` lets the dial coast longer.
- `lockers` and `Lockers`: a bank of twelve lockers, one ajar at rest. The
  locker under the pointer opens, and the one open before it swings shut. A
  stronger `intensity` opens the door wider.
- `padlock` and `Padlock`: a padlock. As the pointer nears, the shackle
  springs up out of the body and swings open about its long leg. A stronger
  `intensity` swings the shackle further.

## 0.1.0 - 2026-10-01

First release.

### Added

- Six isometric line figures, each a function that draws into an element:
  `riffle`, `terrain`, `exploded`, `phosphor`, `slow`, `turntable`.
- A React entry, `@lucasmarkes/hairline/react`, with one component per figure.
  It is a client module, so it can be rendered from a Server Component.
- An `intensity` option on every figure, from 0 (subtle) to 1 (strong).
- Theming with six CSS custom properties (`--hairline-plate`, `--hairline-hi`,
  `--hairline-edge`, `--hairline-mid`, `--hairline-lo`, `--hairline-stroke`),
  a `theme` option, and automatic light and dark.
- A shadcn registry item at `https://hairline.lucasmarkes.com/r/hairline.json`.
