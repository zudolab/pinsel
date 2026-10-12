/** `document.fonts.ready`, or an already-settled promise where the Font Loading API is missing. */
export function fontsReady(): Promise<unknown> {
  return "fonts" in document && document.fonts ? document.fonts.ready : Promise.resolve();
}

/** The element a `#fragment` names, or null for a missing or malformed fragment. */
export function fragmentTarget(hash: string): HTMLElement | null {
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}
