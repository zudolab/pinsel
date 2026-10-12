import { PINSEL_EDITOR_POLICY } from "@pinsel/content";
import { describe, expect, it } from "vitest";
import { CONTENT_GROUPS, groupsForPolicy, policyForGroup, routeLabel } from "../groups";

describe("content groups", () => {
  it("places every editable Pinsel model in a named group", () => {
    const groups = groupsForPolicy(PINSEL_EDITOR_POLICY);
    expect(groups.map((group) => group.label)).toEqual(["サイト共通テキスト", "コースと料金", "合格実績", "生徒の声", "よくある質問", "Notes", "お問い合わせ", "特定商取引法"]);
    expect(groups.flatMap((group) => group.modelIds).sort()).toEqual(Object.keys(PINSEL_EDITOR_POLICY.models).sort());
  });

  it("names each model once", () => {
    const ids = CONTENT_GROUPS.flatMap((group) => group.modelIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("collects unknown models under その他 and narrows the presentation policy per group", () => {
    const policy = { ...PINSEL_EDITOR_POLICY, models: { ...PINSEL_EDITOR_POLICY.models, extra: { fields: [], operations: [] } } };
    const groups = groupsForPolicy(policy);
    expect(groups.at(-1)).toEqual({ id: "other", label: "その他", modelIds: ["extra"] });
    const courses = groups.find((group) => group.id === "courses")!;
    expect(Object.keys(policyForGroup(policy, courses).models).sort()).toEqual(["course", "course-step"]);
  });

  it("labels routes in Japanese", () => {
    expect(routeLabel("/")).toBe("トップ（/）");
    expect(routeLabel("/notes/first/")).toBe("Notes 記事（/notes/first/）");
  });
});
