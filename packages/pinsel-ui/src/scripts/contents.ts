/* Page-TOC orientation: the last fragment target above the reading line is
   current. Stable through a long results year, when scrolling back up, and
   after FAQ reflow. */

import { fontsReady, fragmentTarget } from "./dom";

export const READING_LINE_REM = 1.5;
export const READING_LINE_PX = 2;
export const RAIL_REVEAL_MARGIN_PX = 8;

export function readingLine(headerBottom: number, rootFontSizePx: number): number {
  return headerBottom + rootFontSizePx * READING_LINE_REM + READING_LINE_PX;
}

/** Index of the last section whose top is at or above the line; the first when none is. */
export function activeSectionIndex(sectionTops: readonly number[], line: number): number {
  let active = 0;
  for (let i = 0; i < sectionTops.length; i++) {
    if (sectionTops[i]! <= line) active = i;
    else break;
  }
  return active;
}

/** How far to scroll a rail so the item sits inside it with a margin; 0 when already visible. */
export function railScrollDelta(item: { top: number; bottom: number }, frame: { top: number; bottom: number }, margin = RAIL_REVEAL_MARGIN_PX): number {
  if (item.top < frame.top + margin) return item.top - frame.top - margin;
  if (item.bottom > frame.bottom - margin) return item.bottom - frame.bottom + margin;
  return 0;
}

interface ContentsNav {
  nav: HTMLElement;
  entries: { link: HTMLAnchorElement; section: HTMLElement }[];
}

export function initContents(header: Element | null): void {
  const contents: ContentsNav[] = [...document.querySelectorAll<HTMLElement>(".page-toc")]
    .map((nav) => ({
      nav,
      entries: [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].flatMap((link) => {
        const section = fragmentTarget(link.hash);
        return section ? [{ link, section }] : [];
      }),
    }))
    .filter((item) => item.entries.length > 0);
  if (contents.length === 0) return;

  let frame = 0;
  let revealCurrent = false;

  function update(): void {
    frame = 0;
    const reveal = revealCurrent;
    revealCurrent = false;
    const line = readingLine(header?.getBoundingClientRect().bottom ?? 0, parseFloat(getComputedStyle(document.documentElement).fontSize));
    for (const { nav, entries } of contents) {
      const active = entries[activeSectionIndex(entries.map((entry) => entry.section.getBoundingClientRect().top), line)]!;
      const changed = active.link.getAttribute("aria-current") !== "location";
      if (changed) {
        for (const { link } of entries) link.removeAttribute("aria-current");
        active.link.setAttribute("aria-current", "location");
      }
      if (!changed && !reveal) continue;
      // Reveal the item within a short desktop rail without moving the page.
      const rail = nav.closest("aside");
      if (rail && rail.scrollHeight > rail.clientHeight + 1 && getComputedStyle(rail).overflowY === "auto") {
        rail.scrollTop += railScrollDelta(active.link.getBoundingClientRect(), rail.getBoundingClientRect());
      }
    }
  }
  function request(event?: Event): void {
    if (event?.type === "resize") revealCurrent = true;
    if (!frame) frame = requestAnimationFrame(update);
  }

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  addEventListener("hashchange", request);
  addEventListener("pageshow", request);
  // FAQ <details> reflow; `toggle` does not bubble, so listen while capturing.
  document.addEventListener("toggle", request, true);
  void fontsReady().then(() => request());
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => request());
    if (header) observer.observe(header);
    const main = document.querySelector("main");
    if (main) observer.observe(main);
  }
  request();
}
