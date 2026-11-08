/** Brings the preview status into view when the one-column layout puts it off screen. */
export function revealPreviewStatus(target: HTMLElement, view: Window = window): boolean {
 if (!view.matchMedia("(max-width: 900px)").matches) return false;
 const box = target.getBoundingClientRect();
 if (box.top >= 0 && box.bottom <= view.innerHeight) return false;
 const reduce = view.matchMedia("(prefers-reduced-motion: reduce)").matches;
 target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
 target.focus({ preventScroll: true });
 return true;
}
