/* Native navigation, fragment orientation and the local-only contact form. */
import { initContactForm } from "./contact-form";
import { initContents } from "./contents";
import { fontsReady, fragmentTarget } from "./dom";

// Matches the header collapse breakpoint (`@container site-header (max-width: 70rem)` in components.css).
export const DESKTOP_NAV_QUERY = "(min-width: 70.01rem)";
export const INITIAL_HASH_CANCEL_KEYS: readonly string[] = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];

export function initHeaderOffset(header: HTMLElement | null): void {
  if (!header || !("ResizeObserver" in window)) return;
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--header-offset", `${Math.ceil(header.getBoundingClientRect().height)}px`);
  }).observe(header);
}

export function initMenu(): void {
  const menu = document.querySelector<HTMLButtonElement>(".menu-toggle");
  const nav = document.getElementById("site-navigation");
  if (!menu || !nav) return;
  function closeMenu(focus = false): void {
    nav!.removeAttribute("data-open");
    menu!.setAttribute("aria-expanded", "false");
    if (focus) menu!.focus();
  }
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    nav.toggleAttribute("data-open", open);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") closeMenu(true);
  });
  for (const link of nav.querySelectorAll("a")) link.addEventListener("click", () => closeMenu());
  matchMedia(DESKTOP_NAV_QUERY).addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });
}

export function initFragments(): void {
  // Native anchor scrolling remains in charge. Move the keyboard reading point
  // without issuing a second scroll or a custom animation.
  addEventListener("hashchange", () => {
    const target = fragmentTarget(location.hash);
    if (!target || target.id === "top") return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  const initialHash = location.hash;
  if (!initialHash) return;
  let cancelled = false;
  const cancel = (): void => {
    cancelled = true;
  };
  const cancelOnKey = (event: KeyboardEvent): void => {
    if (INITIAL_HASH_CANCEL_KEYS.includes(event.key)) cancel();
  };
  addEventListener("wheel", cancel, { passive: true, once: true });
  addEventListener("touchstart", cancel, { passive: true, once: true });
  addEventListener("keydown", cancelOnKey);
  void fontsReady().then(() => {
    removeEventListener("wheel", cancel);
    removeEventListener("touchstart", cancel);
    removeEventListener("keydown", cancelOnKey);
    if (cancelled || location.hash !== initialHash) return;
    const target = fragmentTarget(initialHash);
    // A deep link arrives at its final reading position once fonts settle;
    // later in-page clicks keep the native (smooth) scroll behavior.
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start", behavior: "instant" }));
  });
}

export function initSite(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  initHeaderOffset(header);
  initMenu();
  initFragments();
  initContents(header);
  initContactForm();
}
