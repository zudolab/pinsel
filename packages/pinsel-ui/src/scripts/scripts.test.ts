// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ART_CYCLE_MS, ART_PALETTES, artColorsAt, artPhaseAt, smoothstep } from "./art-clock";
import { COURSE_OPTIONS, EMAIL_MISMATCH_MESSAGE, VALUE_MISSING_TEMPLATE, courseIndexFromSearch, fieldLabel, initContactForm, validationMessage, validationTextsFrom } from "./contact-form";
import { activeSectionIndex, railScrollDelta, readingLine } from "./contents";
import { MOTION_STORAGE_KEY, initMotion, parallaxProgress, parallaxTransform, parsePreference } from "./motion";
import { initMenu } from "./site";

function rgb(hex: string): string {
  return `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16).toFixed(3)).join(" ")})`;
}

describe("art clock", () => {
  it("derives the phase from absolute time over a 12 minute cycle", () => {
    expect(artPhaseAt(0)).toBe(0);
    expect(artPhaseAt(ART_CYCLE_MS / 4)).toBe(0.25);
    expect(artPhaseAt(ART_CYCLE_MS * 3 + ART_CYCLE_MS / 2)).toBe(0.5);
    expect(artPhaseAt(-ART_CYCLE_MS / 4)).toBe(0.75);
  });

  it("lands exactly on each palette at phase 0 / 0.25 / 0.5 / 0.75 and wraps at 1", () => {
    [0, 0.25, 0.5, 0.75, 1].forEach((phase, i) => {
      const palette = ART_PALETTES[i % ART_PALETTES.length]!;
      expect(artColorsAt(phase)).toEqual({ back: rgb(palette[0]), wash: rgb(palette[1]), current: rgb(palette[2]) });
    });
  });

  it("blends with smoothstep between adjacent palettes", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    // Halfway between Water #b8c4b6 and Blue-grey #b6c0c7: blend 0.5.
    expect(artColorsAt(0.125).back).toBe("rgb(183.000 194.000 190.500)");
    // A quarter into the segment: smoothstep(0.25) = 0.15625.
    expect(artColorsAt(0.0625).back).toBe(`rgb(${(184 - 2 * 0.15625).toFixed(3)} ${(196 - 4 * 0.15625).toFixed(3)} ${(182 + 17 * 0.15625).toFixed(3)})`);
  });
});

describe("parallax", () => {
  it("clamps progress to [-1, 1] around the viewport centre", () => {
    expect(parallaxProgress(800, 300, 200)).toBe(0);
    expect(parallaxProgress(800, 5000, 200)).toBe(-1);
    expect(parallaxProgress(800, -5000, 200)).toBe(1);
  });

  it("uses the desktop and mobile factors", () => {
    const centred = { viewportHeight: 800, height: 200, range: 52, depth: 0.85, drift: 1 };
    // progress 0.5: top = 400 - 100 - 0.5 * 500
    expect(parallaxTransform({ ...centred, viewportWidth: 1280, top: 50 })).toBe(`translate(${(0.5 * 11 * 0.85).toFixed(2)}px,${(0.5 * 52 * 0.85).toFixed(2)}px)`);
    expect(parallaxTransform({ ...centred, viewportWidth: 760, top: 50 })).toBe(`translate(${(0.5 * 5 * 0.85).toFixed(2)}px,${(0.5 * 26 * 0.85).toFixed(2)}px)`);
    // shallow window on mobile: min(26, 8 * .625) = 5; drift -1 mirrors x.
    expect(parallaxTransform({ ...centred, viewportWidth: 390, top: 50, range: 8, drift: -1 })).toBe(`translate(${(0.5 * 5 * 0.85 * -1).toFixed(2)}px,${(0.5 * 5 * 0.85).toFixed(2)}px)`);
    // missing data attributes fall back to range 52, drift 1
    expect(parallaxTransform({ ...centred, viewportWidth: 1280, top: 50, range: Number.NaN, drift: Number.NaN })).toBe(parallaxTransform({ ...centred, viewportWidth: 1280, top: 50 }));
  });

  it("only accepts `off` as a stored preference", () => {
    expect(parsePreference("off")).toBe("off");
    expect(parsePreference("auto")).toBe("auto");
    expect(parsePreference("on")).toBe("auto");
    expect(parsePreference(null)).toBe("auto");
  });
});

describe("page TOC", () => {
  it("computes the reading line below the header", () => {
    expect(readingLine(80, 16)).toBe(80 + 24 + 2);
  });

  it("selects the last section at or above the line, defaulting to the first", () => {
    const line = 106;
    expect(activeSectionIndex([300, 900, 1500], line)).toBe(0);
    expect(activeSectionIndex([-400, 106, 700], line)).toBe(1);
    expect(activeSectionIndex([-1400, -800, -200], line)).toBe(2);
    // scrolling back up
    expect(activeSectionIndex([-100, 107, 700], line)).toBe(0);
  });

  it("reveals the item inside the rail with an 8px margin", () => {
    const frame = { top: 100, bottom: 400 };
    expect(railScrollDelta({ top: 200, bottom: 230 }, frame)).toBe(0);
    expect(railScrollDelta({ top: 90, bottom: 120 }, frame)).toBe(-18);
    expect(railScrollDelta({ top: 380, bottom: 410 }, frame)).toBe(18);
  });
});

describe("contact form", () => {
  it("maps ?course=N to the select option (0 未定, 1 有料進路相談, 2 2ヶ月コース, 3 4ヶ月コース)", () => {
    expect(COURSE_OPTIONS).toEqual(["未定", "有料進路相談", "2ヶ月コース", "4ヶ月コース"]);
    expect(courseIndexFromSearch("?course=1", 4)).toBe(1);
    expect(courseIndexFromSearch("?course=2", 4)).toBe(2);
    expect(courseIndexFromSearch("?course=3", 4)).toBe(3);
    for (const search of ["", "?course=0", "?course=4", "?course=-1", "?course=x", "?course=1.5"]) expect(courseIndexFromSearch(search, 4)).toBeNull();
  });

  it("builds the validation messages", () => {
    expect(validationMessage({ valueMissing: true, typeMismatch: false }, "お名前")).toBe("お名前を入力してください。");
    expect(validationMessage({ valueMissing: false, typeMismatch: true }, "メールアドレス")).toBe(EMAIL_MISMATCH_MESSAGE);
    expect(EMAIL_MISMATCH_MESSAGE).toBe("メールアドレスの形式をご確認ください。");
    expect(validationMessage({ valueMissing: false, typeMismatch: false }, "お名前")).toBe("");
  });

  it("takes its texts from the form's data attributes, falling back when absent or empty", () => {
    const texts = validationTextsFrom({ valueMissingMessage: "{label}は必須です", emailFormatMessage: "形式エラー" });
    expect(validationMessage({ valueMissing: true, typeMismatch: false }, "お名前", texts)).toBe("お名前は必須です");
    expect(validationMessage({ valueMissing: false, typeMismatch: true }, "メールアドレス", texts)).toBe("形式エラー");
    expect(validationTextsFrom({})).toEqual({ valueMissing: VALUE_MISSING_TEMPLATE, emailFormat: EMAIL_MISMATCH_MESSAGE });
    expect(validationTextsFrom({ valueMissingMessage: "", emailFormatMessage: "" })).toEqual({ valueMissing: VALUE_MISSING_TEMPLATE, emailFormat: EMAIL_MISMATCH_MESSAGE });
  });

  describe("in a document", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      document.body.innerHTML = `
        <form id="contact-form" novalidate>
          <p class="form-error" role="alert" data-form-error hidden>error</p>
          <div class="form-field"><label for="name">お名前<span>必須</span></label><input id="name" name="name" type="text" required><p class="form-error" id="name-error" hidden></p></div>
          <div class="form-field"><label for="email">メールアドレス<span>必須</span></label><input id="email" name="email" type="email" required><p class="form-error" id="email-error" hidden></p></div>
          <div class="form-field"><label for="course">ご希望のコース<span>任意</span></label><select id="course" name="course">${COURSE_OPTIONS.map((o) => `<option>${o}</option>`).join("")}</select></div>
          <button type="submit"><span data-submit-label>送信する</span></button>
        </form>
        <div class="form-success" tabindex="-1" hidden><button type="button" data-form-back>戻る</button></div>`;
    });
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = "";
    });

    it("reads the label's leading text", () => {
      expect(fieldLabel(document.getElementById("name") as HTMLInputElement)).toBe("お名前");
    });

    it("focuses the first invalid field, then simulates the pending submit locally", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      initContactForm();
      const form = document.getElementById("contact-form") as HTMLFormElement;
      const name = document.getElementById("name") as HTMLInputElement;
      const email = document.getElementById("email") as HTMLInputElement;
      form.requestSubmit();
      expect(document.activeElement).toBe(name);
      expect(name.getAttribute("aria-invalid")).toBe("true");
      expect(name.getAttribute("aria-describedby")).toBe("name-error");
      expect(document.getElementById("name-error")!.textContent).toBe("お名前を入力してください。");

      name.value = "高津戸";
      name.dispatchEvent(new Event("input"));
      expect(name.hasAttribute("aria-invalid")).toBe(false);
      expect(document.getElementById("name-error")!.hidden).toBe(true);

      email.value = "not-an-address";
      form.requestSubmit();
      expect(document.activeElement).toBe(email);
      expect(document.getElementById("email-error")!.textContent).toBe("メールアドレスの形式をご確認ください。");

      email.value = "a@example.test";
      form.requestSubmit();
      const submit = form.querySelector("button[type=submit]") as HTMLButtonElement;
      expect(submit.disabled).toBe(true);
      expect(submit.getAttribute("aria-busy")).toBe("true");
      expect(submit.textContent).toBe("送信中...");
      vi.advanceTimersByTime(450);
      const success = document.querySelector(".form-success") as HTMLElement;
      expect(form.hidden).toBe(true);
      expect(success.hidden).toBe(false);
      expect(document.activeElement).toBe(success);
      expect(submit.textContent).toBe("送信する");

      (document.querySelector("[data-form-back]") as HTMLButtonElement).click();
      expect(form.hidden).toBe(false);
      expect(document.activeElement).toBe(name);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("uses data-submitting-label / data-value-missing-message / data-email-format-message", () => {
      const form = document.getElementById("contact-form") as HTMLFormElement;
      form.dataset.submittingLabel = "SENDING";
      form.dataset.valueMissingMessage = "{label}: required";
      form.dataset.emailFormatMessage = "bad email";
      initContactForm();
      const name = document.getElementById("name") as HTMLInputElement;
      const email = document.getElementById("email") as HTMLInputElement;
      form.requestSubmit();
      expect(document.getElementById("name-error")!.textContent).toBe("お名前: required");
      name.value = "x";
      email.value = "nope";
      form.requestSubmit();
      expect(document.getElementById("email-error")!.textContent).toBe("bad email");
      email.value = "a@example.test";
      form.requestSubmit();
      expect(form.querySelector("[data-submit-label]")!.textContent).toBe("SENDING");
      vi.advanceTimersByTime(450);
      expect(form.querySelector("[data-submit-label]")!.textContent).toBe("送信する");
    });
  });
});

describe("menu", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("toggles, closes on Escape with focus back on the toggle, and closes on link click", () => {
    document.body.innerHTML = `<button class="menu-toggle" aria-expanded="false" aria-controls="site-navigation">メニュー</button>
      <nav id="site-navigation"><a href="#x">x</a></nav>`;
    initMenu();
    const toggle = document.querySelector(".menu-toggle") as HTMLButtonElement;
    const nav = document.getElementById("site-navigation")!;
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(nav.hasAttribute("data-open")).toBe(true);
    (document.body as HTMLElement).focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(nav.hasAttribute("data-open")).toBe(false);
    expect(document.activeElement).toBe(toggle);
    toggle.click();
    nav.querySelector("a")!.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("motion toggle", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("stores auto|off under pinsel-motion and announces the change", () => {
    document.body.innerHTML = `<button data-motion-toggle aria-pressed="false"><span data-motion-label>動き OFF</span></button>`;
    const changes: boolean[] = [];
    addEventListener("pinsel-motion-change", (event) => changes.push(event.detail.enabled));
    initMotion();
    const button = document.querySelector("[data-motion-toggle]") as HTMLButtonElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    expect(document.documentElement.dataset.reducedMotion).toBe(String(reduced));
    if (reduced) return;
    expect(document.documentElement.dataset.motion).toBe("on");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.textContent).toBe("動き ON");
    button.click();
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("off");
    expect(document.documentElement.dataset.motion).toBe("off");
    expect(button.textContent).toBe("動き OFF");
    button.click();
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("auto");
    expect(changes).toEqual([true, false, true]);
  });
});
