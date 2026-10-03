"use client";

import type { ComponentProps, CSSProperties } from "react";
import * as Hairline from "@lucasmarkes/hairline/react";

/**
 * hairline, wearing your theme. The six figures from @lucasmarkes/hairline,
 * with their palette mapped to shadcn's tokens, so they follow light, dark and
 * whatever you have made of them. A `style` you pass wins over the mapping.
 *
 * Docs: https://hairline.lucasmarkes.com
 */
const tokens = {
  "--hairline-plate": "var(--background)",
  "--hairline-hi": "var(--foreground)",
  "--hairline-edge": "var(--muted-foreground)",
  "--hairline-mid": "color-mix(in oklab, var(--muted-foreground) 55%, var(--background))",
  "--hairline-lo": "var(--border)",
} as CSSProperties;

export function Riffle({ style, ...props }: ComponentProps<typeof Hairline.Riffle>) {
  return <Hairline.Riffle style={{ ...tokens, ...style }} {...props} />;
}

export function Terrain({ style, ...props }: ComponentProps<typeof Hairline.Terrain>) {
  return <Hairline.Terrain style={{ ...tokens, ...style }} {...props} />;
}

export function Exploded({ style, ...props }: ComponentProps<typeof Hairline.Exploded>) {
  return <Hairline.Exploded style={{ ...tokens, ...style }} {...props} />;
}

export function Phosphor({ style, ...props }: ComponentProps<typeof Hairline.Phosphor>) {
  return <Hairline.Phosphor style={{ ...tokens, ...style }} {...props} />;
}

export function Slow({ style, ...props }: ComponentProps<typeof Hairline.Slow>) {
  return <Hairline.Slow style={{ ...tokens, ...style }} {...props} />;
}

export function Turntable({ style, ...props }: ComponentProps<typeof Hairline.Turntable>) {
  return <Hairline.Turntable style={{ ...tokens, ...style }} {...props} />;
}

export function Keyboard({ style, ...props }: ComponentProps<typeof Hairline.Keyboard>) {
  return <Hairline.Keyboard style={{ ...tokens, ...style }} {...props} />;
}

export function Elevator({ style, ...props }: ComponentProps<typeof Hairline.Elevator>) {
  return <Hairline.Elevator style={{ ...tokens, ...style }} {...props} />;
}

export function Phone({ style, ...props }: ComponentProps<typeof Hairline.Phone>) {
  return <Hairline.Phone style={{ ...tokens, ...style }} {...props} />;
}

export function Laptop({ style, ...props }: ComponentProps<typeof Hairline.Laptop>) {
  return <Hairline.Laptop style={{ ...tokens, ...style }} {...props} />;
}
