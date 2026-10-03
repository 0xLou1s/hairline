# Changelog

Every release of `@lucasmarkes/hairline`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[semver](https://semver.org/).

## 0.2.0 - Unreleased

### Added

- `keyboard` and `Keyboard`: a sixty-key board. The key under the pointer
  sinks, and its neighbours follow it down, less the further away. A stronger
  `intensity` sinks a wider patch of keys.

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
