/* Decorative scroll depth only. Reading content never moves. */

import { fontsReady } from "./dom";

export const MOTION_STORAGE_KEY = "pinsel-motion";
export type MotionPreference = "auto" | "off";

export interface MotionChangeDetail {
  enabled: boolean;
  reduced: boolean;
}

declare global {
  interface WindowEventMap {
    "pinsel-motion-change": CustomEvent<MotionChangeDetail>;
  }
}

export const MOTION_BUTTON_TITLE = "装飾・色の変化・スクロールの動きを切り替える";
export const MOTION_BUTTON_TITLE_REDUCED = "端末の「動きを減らす」設定に合わせて静止しています。";
export const MOBILE_MAX_WIDTH_PX = 760;

export function parsePreference(stored: string | null): MotionPreference {
  return stored === "off" ? "off" : "auto";
}

export interface ParallaxInput {
  viewportWidth: number;
  viewportHeight: number;
  /** The art window's bounding box. */
  top: number;
  height: number;
  /** `data-motion-range`; 52 when absent or not a number. */
  range: number;
  /** `data-depth` of the layer. */
  depth: number;
  /** `data-drift`; 1 when absent or not a number. */
  drift: number;
}

export function parallaxProgress(viewportHeight: number, top: number, height: number): number {
  return Math.max(-1, Math.min(1, (viewportHeight / 2 - (top + height / 2)) / ((viewportHeight + height) / 2)));
}

export function parallaxTransform(input: ParallaxInput): string {
  const mobile = input.viewportWidth <= MOBILE_MAX_WIDTH_PX;
  const range = input.range || 52;
  const maximum = Math.min(mobile ? 26 : 52, range * (mobile && range < 52 ? 0.625 : 1));
  const progress = parallaxProgress(input.viewportHeight, input.top, input.height);
  const y = progress * maximum * input.depth;
  const x = progress * (mobile ? 5 : 11) * input.depth * (input.drift || 1);
  return `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
}

interface ArtWindow {
  el: HTMLElement;
  layers: { node: SVGElement | HTMLElement; depth: number }[];
}

export function initMotion(): void {
  const root = document.documentElement;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-motion-toggle]")];
  const windows: ArtWindow[] = [...document.querySelectorAll<HTMLElement>("[data-parallax]")].map((el) => ({
    el,
    layers: [...el.querySelectorAll<SVGElement | HTMLElement>("[data-depth]")].map((node) => ({ node, depth: Number(node.dataset.depth) || 0 })),
  }));
  let preference: MotionPreference = "auto";
  try {
    preference = parsePreference(localStorage.getItem(MOTION_STORAGE_KEY));
  } catch {
    // Storage may be unavailable (privacy mode); the default applies.
  }
  let enabled = false;
  let scheduled = 0;
  let destroyed = false;
  const visible = new Set<Element>();
  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) visible.add(entry.target);
              else visible.delete(entry.target);
            }
            requestTick();
          },
          { rootMargin: "160px 0px" },
        )
      : null;
  for (const w of windows) {
    visible.add(w.el);
    observer?.observe(w.el);
  }

  function paint(): void {
    scheduled = 0;
    if (!enabled || document.hidden || destroyed) return;
    for (const w of windows) {
      if (!visible.has(w.el)) continue;
      const box = w.el.getBoundingClientRect();
      // Movement stays within the art window's clip. CSS supplies fixed window height.
      for (const layer of w.layers) {
        layer.node.style.transform = parallaxTransform({
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          top: box.top,
          height: box.height,
          range: Number(w.el.dataset.motionRange),
          depth: layer.depth,
          drift: Number(w.el.dataset.drift),
        });
      }
    }
  }
  function requestTick(): void {
    if (enabled && !scheduled && !document.hidden && !destroyed) scheduled = requestAnimationFrame(paint);
  }
  function reset(): void {
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled = 0;
    for (const w of windows) for (const layer of w.layers) layer.node.style.transform = "none";
  }
  function applyPreference(): void {
    enabled = preference !== "off" && !media.matches;
    root.dataset.motion = enabled ? "on" : "off";
    root.dataset.reducedMotion = String(media.matches);
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(enabled));
      button.disabled = media.matches;
      button.title = media.matches ? MOTION_BUTTON_TITLE_REDUCED : MOTION_BUTTON_TITLE;
      const label = button.querySelector("[data-motion-label]");
      if (label) label.textContent = enabled ? "動き ON" : "動き OFF";
    }
    if (enabled) requestTick();
    else reset();
    dispatchEvent(new CustomEvent<MotionChangeDetail>("pinsel-motion-change", { detail: { enabled, reduced: media.matches } }));
  }
  function setPreference(next: MotionPreference): void {
    preference = next;
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next);
    } catch {
      // The choice still applies to this page view.
    }
    applyPreference();
  }

  for (const button of buttons) button.addEventListener("click", () => setPreference(enabled ? "off" : "auto"));
  addEventListener("scroll", requestTick, { passive: true });
  addEventListener("resize", requestTick, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (scheduled) cancelAnimationFrame(scheduled);
      scheduled = 0;
    } else requestTick();
  });
  media.addEventListener("change", applyPreference);
  addEventListener("pageshow", requestTick);
  addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      destroyed = true;
      observer?.disconnect();
      reset();
    }
  });
  applyPreference();
  void fontsReady().then(requestTick);
}
