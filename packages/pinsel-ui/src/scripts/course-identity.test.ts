// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { courseHref, courseIdFromSearch } from "./course-identity";
import { initContactForm } from "./contact-form";

afterEach(() => { document.body.innerHTML = ""; history.replaceState(null, "", "/"); });

it("preserves historical numeric aliases independently of labels and order", () => {
  for (const [alias, id] of [[1, "consultation"], [2, "two-month"], [3, "four-month"]] as const) {
    expect(courseIdFromSearch(`?course=${alias}`)).toBe(id);
    expect(courseHref(id)).toBe(`/contact/?course=${id}`);
    expect(courseIdFromSearch(`?course=${id}`)).toBe(id);
  }
  // Retain the old Number-based parsing behavior, without using its result as
  // an option position. Unknown values never select another course.
  expect(courseIdFromSearch("?course=01")).toBe("consultation");
  for (const query of ["", "?course=-1", "?course=1.5", "?course=consultation&course=two-month"]) expect(courseIdFromSearch(query)).toBeNull();
  for (const id of ["", "01", "1e0", "0x1", "UPPER", "bad/id"]) expect(() => courseHref(id)).toThrow("Unsupported or reserved course identity");
});

it.each(["1", "01", "consultation"])("selects canonical option for %s after DOM reorder and preserves label-based payload", query => {
  history.replaceState(null, "", `/contact/?course=${query}`);
  document.body.innerHTML = '<form id="contact-form"><select name="course"><option value="未定">未定</option><option data-course-id="four-month" value="4ヶ月 改訂">4ヶ月 改訂</option><option data-course-id="consultation" value="面談 改訂">面談 改訂</option><option data-course-id="two-month" value="2ヶ月 改訂">2ヶ月 改訂</option></select></form>';
  initContactForm();
  const form = document.querySelector("form")!;
  const select = form.elements.namedItem("course") as HTMLSelectElement;
  expect(select.selectedIndex).toBe(2);
  expect(new FormData(form).get("course")).toBe("面談 改訂");
});

it("does not guess when the matching identity is absent or ambiguous", () => {
  history.replaceState(null, "", "/contact/?course=1");
  for (const ids of [["two-month", "four-month"], ["consultation", "consultation"]]) {
    document.body.innerHTML = `<form id="contact-form"><select name="course"><option>未定</option>${ids.map(id => `<option data-course-id="${id}">${id}</option>`).join("")}</select></form>`;
    initContactForm();
    expect((document.querySelector("select") as HTMLSelectElement).selectedIndex).toBe(0);
  }
});

it("supports newly authored UUID courses and selects only a unique rendered identity", () => {
  const id = "64b504c4-d13e-4de0-a357-f662543eb07e";
  expect(courseHref(id)).toBe(`/contact/?course=${id}`);
  expect(courseIdFromSearch(`?course=${id}`)).toBe(id);
  history.replaceState(null, "", courseHref(id));
  document.body.innerHTML = `<form id="contact-form"><select name="course"><option>未定</option><option data-course-id="${id}" value="新しい講座">新しい講座</option></select></form>`;
  initContactForm();
  expect(new FormData(document.querySelector("form")!).get("course")).toBe("新しい講座");
  history.replaceState(null, "", "/contact/?course=unknown");
  (document.querySelector("select") as HTMLSelectElement).selectedIndex = 0;
  initContactForm();
  expect((document.querySelector("select") as HTMLSelectElement).selectedIndex).toBe(0);
});
