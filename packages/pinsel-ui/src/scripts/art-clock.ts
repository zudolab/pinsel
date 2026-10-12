/* A shared, quiet pigment cycle. Absolute epoch time, never a page-load timer.
   Only three decorative SVG pigments change; paper, masks and UI stay fixed. */

import type { MotionChangeDetail } from "./motion";

export const ART_CYCLE_MS = 12 * 60 * 1000;
export const ART_PERIOD_MS = 1000;
export const ART_ROLES = ["back", "wash", "current"] as const;
export type ArtRole = (typeof ART_ROLES)[number];

// Approved palettes from the seed prototype (art-clock.js), in role order back/wash/current.
export const ART_PALETTES: readonly (readonly [string, string, string])[] = [
  ["#b8c4b6", "#9ebfbb", "#60767d"], // Water
  ["#b6c0c7", "#a1b8c7", "#65778a"], // Blue-grey
  ["#c7bdb8", "#bcb3c3", "#7c7080"], // Mineral
  ["#c2c7ad", "#abc2b5", "#6b7d73"], // Celadon
];

type Rgb = readonly [number, number, number];

function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
}

const STOPS: readonly (readonly Rgb[])[] = ART_PALETTES.map((palette) => palette.map(hexToRgb));

export function artPhaseAt(now: number): number {
  return (((now % ART_CYCLE_MS) + ART_CYCLE_MS) % ART_CYCLE_MS) / ART_CYCLE_MS;
}

export function smoothstep(fraction: number): number {
  return fraction * fraction * (3 - 2 * fraction);
}

/** `rgb(r g b)` per role for a phase in [0, 1]; phase 1 wraps to the first palette. */
export function artColorsAt(phase: number): Record<ArtRole, string> {
  const position = phase * STOPS.length;
  const index = Math.floor(position) % STOPS.length;
  const fraction = position - Math.floor(position);
  // The easing slope is zero at every stop, including the wrap boundary.
  const blend = smoothstep(fraction);
  const from = STOPS[index]!;
  const to = STOPS[(index + 1) % STOPS.length]!;
  const colors = {} as Record<ArtRole, string>;
  ART_ROLES.forEach((role, i) => {
    const a = from[i]!;
    const b = to[i]!;
    const channels = a.map((value, channel) => (value + (b[channel]! - value) * blend).toFixed(3));
    colors[role] = `rgb(${channels.join(" ")})`;
  });
  return colors;
}

export function initArtClock(): void {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let enabled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  function paint(): void {
    const phase = artPhaseAt(Date.now());
    const colors = artColorsAt(phase);
    for (const role of ART_ROLES) root.style.setProperty(`--art-${role}`, colors[role]);
    root.dataset.artPhase = phase.toFixed(6);
    root.dataset.artMode = enabled && !reduced.matches ? "live" : "paused";
  }
  function cancel(): void {
    clearTimeout(timer);
    timer = undefined;
  }
  function schedule(): void {
    cancel();
    if (destroyed || document.hidden || !enabled || reduced.matches) return;
    // Align updates to the absolute second; no continuous animation-frame loop.
    timer = setTimeout(() => {
      paint();
      schedule();
    }, ART_PERIOD_MS - (Date.now() % ART_PERIOD_MS));
  }
  function setEnabled(next: boolean): void {
    enabled = next && !reduced.matches;
    cancel();
    if (enabled) paint();
    else root.dataset.artMode = "paused";
    schedule();
  }

  addEventListener("pinsel-motion-change", (event: CustomEvent<MotionChangeDetail>) => setEnabled(event.detail.enabled));
  reduced.addEventListener("change", () => {
    if (reduced.matches) setEnabled(false);
  });
  document.addEventListener("visibilitychange", () => {
    cancel();
    if (!document.hidden && enabled && !reduced.matches) {
      paint();
      schedule();
    }
  });
  addEventListener("pageshow", () => {
    if (enabled && !reduced.matches) {
      paint();
      schedule();
    }
  });
  addEventListener("pagehide", (event) => {
    cancel();
    if (!event.persisted) destroyed = true;
  });
  // A reduced-motion or paused page still receives a single current-time sample.
  paint();
  // Script order is not load-bearing: pick up a motion state applied before this ran.
  if (root.dataset.motion === "on") setEnabled(true);
}
