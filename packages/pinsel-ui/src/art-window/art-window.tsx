import type { Child } from "@takazudo/zfb/zudo-react";
import { ART_SOURCES } from "./art-sources.generated";

export const ART_SLOTS = ["hero", "middle", "closing"] as const;
export const ART_SIZES = ["hero", "large", "closing", "medium", "small", "ribbon"] as const;

export type ArtSlot = (typeof ART_SLOTS)[number];
export type ArtSize = (typeof ART_SIZES)[number];

export interface ArtWindowProps {
  slot: ArtSlot;
  size: ArtSize;
  /** Horizontal parallax direction, `1` or `-1`. */
  drift?: 1 | -1;
  /** Suffix that keeps the SVG's mask ids unique on the page; defaults to `art-<slot>-<size>`. */
  instance?: string;
}

// The three literal pigments of the approved SVGs; the art clock cycles
// `--art-*` while the literal stays the fallback (prototype `ui.py art()`).
const PIGMENTS = [
  ["back", "#B8C4B6"],
  ["wash", "#9EBFBB"],
  ["current", "#60767D"],
] as const;

const prepared = new Map<string, string>();

/** The slot's SVG with the prototype's root attributes and pigment hooks, ids not yet suffixed. */
function preparedSvg(source: keyof typeof ART_SOURCES, heroAspect: boolean): string {
  const key = `${source}:${heroAspect}`;
  const cached = prepared.get(key);
  if (cached !== undefined) return cached;
  let removed = 0;
  let svg = ART_SOURCES[source]
    .replace(/<\?xml.*?\?>/, "")
    .replace(/\s(?:aria-hidden|focusable|preserveAspectRatio)="[^"]*"/g, (match) => (removed++ < 3 ? "" : match));
  svg = svg.replace("<svg ", `<svg aria-hidden="true" focusable="false" preserveAspectRatio="${heroAspect ? "xMidYMid slice" : "none"}" `);
  for (const [pigment, color] of PIGMENTS) {
    svg = svg.replaceAll(`fill="${color}"`, `data-pigment="${pigment}" fill="var(--art-${pigment}, ${color})"`);
  }
  prepared.set(key, svg);
  return svg;
}

/** Suffixes every `id="…"` and its `url(#…)` references so two windows never share a mask. */
export function suffixSvgIds(svg: string, suffix: string): string {
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!));
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${id}-${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, (match, id: string) => (ids.has(id) ? `url(#${id}-${suffix})` : match));
}

/**
 * Prototype `ui.py art()`: a decorative watercolor window. The hero slot at a
 * non-hero size uses the shallow strip (motion range 8); only the true hero
 * crops with `xMidYMid slice`, every other window stretches.
 */
export function ArtWindow({ slot, size, drift = 1, instance }: ArtWindowProps): Child {
  const shallow = slot === "hero" && size !== "hero";
  const svg = suffixSvgIds(preparedSvg(shallow ? "shallow" : slot, slot === "hero" && !shallow), instance || `art-${slot}-${size}`);
  return (
    <div
      class={`art-window art-window--${size}`}
      aria-hidden="true"
      data-parallax=""
      data-drift={String(drift)}
      data-motion-range={shallow ? "8" : "52"}
      rawHtml={svg}
    />
  );
}
