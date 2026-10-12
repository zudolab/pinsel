/* Local-only contact form behavior. No request is ever sent and entered
   content is never persisted. */

// `<select id="course">` option order on the contact page; `/contact/?course=N` from the pricing cards selects index N.
export const COURSE_OPTIONS = ["未定", "有料進路相談", "2ヶ月コース", "4ヶ月コース"] as const;
export const SUBMIT_PENDING_MS = 450;
export const SUBMIT_PENDING_LABEL = "送信中...";
export const EMAIL_MISMATCH_MESSAGE = "メールアドレスの形式をご確認ください。";

/** Option index for `?course=N`, or null when absent / out of range (0 = 未定 is the default already). */
export function courseIndexFromSearch(search: string, optionCount: number): number | null {
  const index = Number(new URLSearchParams(search).get("course"));
  return Number.isInteger(index) && index > 0 && index < optionCount ? index : null;
}

export function validationMessage(validity: Pick<ValidityState, "valueMissing" | "typeMismatch">, label: string): string {
  if (validity.valueMissing) return `${label}を入力してください。`;
  if (validity.typeMismatch) return EMAIL_MISMATCH_MESSAGE;
  return "";
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** The label's leading text node: `お名前` from `<label>お名前<span>必須</span></label>`. */
export function fieldLabel(field: Field): string {
  return field.labels?.[0]?.childNodes[0]?.textContent?.trim() ?? "";
}

export function validateField(field: Field): boolean {
  const message = validationMessage(field.validity, fieldLabel(field));
  const note = document.getElementById(`${field.id}-error`);
  if (!note) return true;
  note.textContent = message;
  note.hidden = !message;
  if (message) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", note.id);
  } else {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
  return !message;
}

export function initContactForm(): void {
  const form = document.getElementById("contact-form");
  if (!(form instanceof HTMLFormElement)) return;
  const success = document.querySelector<HTMLElement>(".form-success");
  const submit = form.querySelector<HTMLButtonElement>("[type=submit]");
  const submitLabel = submit?.querySelector<HTMLElement>("[data-submit-label]") ?? null;
  const idleLabel = submitLabel?.textContent ?? "";
  const errorBanner = form.querySelector<HTMLElement>("[data-form-error]");

  const course = form.elements.namedItem("course");
  if (course instanceof HTMLSelectElement) {
    const index = courseIndexFromSearch(location.search, course.options.length);
    if (index !== null) course.selectedIndex = index;
  }

  const required = [...form.querySelectorAll<Field>("[required]")];
  for (const field of required) {
    field.addEventListener("blur", () => {
      if (field.value || field.hasAttribute("aria-invalid")) validateField(field);
    });
    field.addEventListener("input", () => {
      if (field.hasAttribute("aria-invalid")) validateField(field);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (errorBanner) errorBanner.hidden = true;
    const validity = required.map((field) => validateField(field));
    const firstInvalid = validity.indexOf(false);
    if (firstInvalid !== -1) {
      required[firstInvalid]!.focus();
      return;
    }
    if (submit) {
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
    }
    if (submitLabel) submitLabel.textContent = SUBMIT_PENDING_LABEL;
    setTimeout(() => {
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
      }
      if (submitLabel) submitLabel.textContent = idleLabel;
      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
    }, SUBMIT_PENDING_MS);
  });

  document.querySelector("[data-form-back]")?.addEventListener("click", () => {
    if (success) success.hidden = true;
    form.hidden = false;
    const name = form.elements.namedItem("name");
    if (name instanceof HTMLElement) name.focus();
  });
}
