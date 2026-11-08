import { expect, it, vi } from "vitest";
import { revealPreviewStatus } from "../reveal";
const view = (narrow: boolean, reduce: boolean) => ({ innerHeight: 800, matchMedia: (query: string) => ({ matches: query.includes("max-width") ? narrow : reduce }) }) as unknown as Window;
const target = (top: number) => { const element = document.createElement("p"); element.tabIndex = -1; document.body.append(element); element.getBoundingClientRect = () => ({ top, bottom: top + 20 }) as DOMRect; element.scrollIntoView = vi.fn(); return element; };
it("scrolls the off-screen preview status into view at narrow widths", () => {
 const element = target(1100);
 expect(revealPreviewStatus(element, view(true, false))).toBe(true);
 expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });expect(document.activeElement).toBe(element);
});
it("respects reduced motion and leaves wide or visible layouts alone", () => {
 const element = target(1100);revealPreviewStatus(element, view(true, true));expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
 expect(revealPreviewStatus(target(1100), view(false, false))).toBe(false);expect(revealPreviewStatus(target(100), view(true, false))).toBe(false);
});
