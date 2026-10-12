import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";

export interface CourseOptionProps {
  label: string;
}

/**
 * One `<option>` after 未定. A `select` accepts only intrinsic children, so
 * call it as a function (`CourseOption({ label })`) outside the renderer,
 * which already calls components eagerly.
 */
export function CourseOption({ label }: CourseOptionProps): Child {
  return <option value={label}>{label}</option>;
}

export interface ContactFormProps {
  formAriaLabel: string;
  errorMessage: string;
  nameLabel: string;
  emailLabel: string;
  courseLabel: string;
  courseUndecidedOption: string;
  messageLabel: string;
  requiredLabel: string;
  optionalLabel: string;
  submitLabel: string;
  submittingLabel: string;
  valueMissingMessage: string;
  emailFormatMessage: string;
  previewNotice: string;
  successPreviewEyebrow: string;
  successTitle: string;
  successBody: string;
  successPreviewNotice: string;
  backLabel: string;
  /** `pinsel.course-option` children, in `?course=N` order (1 = 有料進路相談, 2 = 2ヶ月, 3 = 4ヶ月). */
  courseOptions?: readonly unknown[];
  /**
   * Static rendering of the states the visitor script produces (stories and
   * review only; never authored): `invalid` = every required field empty
   * after submit, `error` = the failure banner, `success` = the thank-you panel.
   */
  previewState?: "idle" | "invalid" | "error" | "success";
}

interface FieldProps {
  name: "name" | "email" | "course" | "message";
  label: string;
  marker: string;
  control: Child;
  error?: string;
}

function Field({ name, label, marker, control, error }: FieldProps): Child {
  return (
    <div class="form-field">
      <label for={name}>
        {label}
        <span>{marker}</span>
      </label>
      {control}
      <p class="form-error" id={`${name}-error`} hidden={!error}>
        {error ?? ""}
      </p>
    </div>
  );
}

/**
 * The /contact/ panel (`build.py contact()`): the form and its hidden success
 * state. Nothing is submitted: the visitor script validates and swaps the
 * panels, so the preview notices stay truthful. The script reads its
 * messages from the `data-*` attributes on the form.
 */
export function ContactForm(props: ContactFormProps): Child {
  const state = props.previewState ?? "idle";
  const missing = (name: string, label: string) =>
    state === "invalid" ? { error: props.valueMissingMessage.replaceAll("{label}", label), invalid: { "aria-invalid": "true", "aria-describedby": `${name}-error` } } : { error: undefined, invalid: {} };
  const name = missing("name", props.nameLabel);
  const email = missing("email", props.emailLabel);
  const message = missing("message", props.messageLabel);
  return (
    <div class="contact-panel">
      <form
        id="contact-form"
        class="contact-form"
        novalidate
        aria-label={props.formAriaLabel}
        hidden={state === "success"}
        data-submitting-label={props.submittingLabel}
        data-value-missing-message={props.valueMissingMessage}
        data-email-format-message={props.emailFormatMessage}
      >
        <p class="form-error" role="alert" data-form-error="" hidden={state !== "error"}>
          {props.errorMessage}
        </p>
        <Field name="name" label={props.nameLabel} marker={props.requiredLabel} error={name.error} control={<input id="name" name="name" type="text" autocomplete="name" required {...name.invalid} />} />
        <Field name="email" label={props.emailLabel} marker={props.requiredLabel} error={email.error} control={<input id="email" name="email" type="email" autocomplete="email" required {...email.invalid} />} />
        <Field
          name="course"
          label={props.courseLabel}
          marker={props.optionalLabel}
          control={
            <select id="course" name="course">
              {CourseOption({ label: props.courseUndecidedOption })}
              {(props.courseOptions ?? []) as Child}
            </select>
          }
        />
        <Field name="message" label={props.messageLabel} marker={props.requiredLabel} error={message.error} control={<textarea id="message" name="message" rows={6} required {...message.invalid}></textarea>} />
        <p class="prototype-message">{props.previewNotice}</p>
        <button type="submit" class="button button--primary">
          <span class="button__label">
            <Icon name="mail" />
            <span data-submit-label="">{props.submitLabel}</span>
          </span>
          <Icon name="arrow-right" class="button__arrow" />
        </button>
      </form>
      <div class="form-success" tabindex={-1} hidden={state !== "success"}>
        <p class="eyebrow">{props.successPreviewEyebrow}</p>
        <h2>{props.successTitle}</h2>
        <p>{props.successBody}</p>
        <p class="prototype-message">{props.successPreviewNotice}</p>
        <button type="button" class="button" data-form-back="">
          {props.backLabel}
        </button>
      </div>
    </div>
  );
}
