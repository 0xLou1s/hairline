/** One numeric option: its bounds, the step a slider should move in, its default and its unit. */
export type Range = {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
  readonly unit: string;
};

/**
 * Every numeric option of every figure. A figure clamps what it is given to
 * `min`…`max` and falls back to `default`; `step` and `unit` are for whoever
 * builds a slider or a table from this.
 */
export const ranges = {
  riffle: { stagger: { min: 0, max: 90, step: 5, default: 40, unit: "ms" } },
  terrain: { radius: { min: 1.5, max: 5, step: 0.25, default: 3, unit: "cells" } },
  exploded: { gap: { min: 12, max: 40, step: 1, default: 28, unit: "u" } },
  phosphor: { afterglow: { min: 150, max: 1500, step: 10, default: 520, unit: "ms" } },
  slow: { rate: { min: 0.05, max: 0.6, step: 0.05, default: 0.2, unit: "×" } },
  turntable: { coast: { min: 200, max: 1500, step: 50, default: 650, unit: "ms" } },
} as const satisfies Record<string, Record<string, Range>>;

/** A number from anything: numeric strings are read, what is not a finite number becomes the default, the rest is clamped. */
export function number(value: unknown, range: Range): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return range.default;
  return Math.min(range.max, Math.max(range.min, n));
}
