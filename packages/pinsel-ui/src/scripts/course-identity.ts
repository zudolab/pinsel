/** Historical public query aliases. Display order and labels never define identity. */
export const COURSE_QUERY_IDS = ["consultation", "two-month", "four-month"] as const;
export type CourseId = (typeof COURSE_QUERY_IDS)[number];

// Mirror the public Content record-ID contract; no private Composer imports.
const CONTENT_ID = /^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/;

function legacyAlias(value: string): CourseId | null {
  const alias = Number(value);
  return Number.isInteger(alias) && alias > 0 && alias <= COURSE_QUERY_IDS.length ? COURSE_QUERY_IDS[alias - 1]! : null;
}

export function courseIdFromSearch(search: string): string | null {
  const values = new URLSearchParams(search).getAll("course");
  if (values.length !== 1) return null;
  const value = values[0]!;
  // Old numeric spellings always retain their original meaning. Actual
  // membership is resolved by exactly one rendered option in the form.
  return legacyAlias(value) ?? (CONTENT_ID.test(value) ? value : null);
}

export function courseHref(courseId: string): string {
  if (!CONTENT_ID.test(courseId) || legacyAlias(courseId)) throw new Error(`Unsupported or reserved course identity: ${courseId}`);
  return `/contact/?course=${encodeURIComponent(courseId)}`;
}
