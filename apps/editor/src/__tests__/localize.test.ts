import { describe, expect, it } from "vitest";
import { localizeChrome, translateChrome } from "../localize";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("chrome localisation", () => {
  it("translates exact chrome strings and patterns only", () => {
    expect(translateChrome("Use latest")).toBe("最新の内容を使う（自分の変更を破棄）");
    expect(translateChrome(" Reapply my draft ")).toBe(" 自分の変更を再適用 ");
    expect(translateChrome("3 entries")).toBe("3 件");
    expect(translateChrome("Use latest price")).toBeNull();
    expect(translateChrome("¥50,000")).toBeNull();
  });

  it("rewrites rendered and later-rendered chrome but never author text", async () => {
    const root = document.createElement("div");
    root.innerHTML = `<button>Save</button><textarea>Save</textarea><input aria-label="Search models" value="Save">`;
    const stop = localizeChrome(root);
    expect(root.querySelector("button")?.textContent).toBe("保存");
    expect(root.querySelector("textarea")?.value).toBe("Save");
    expect(root.querySelector("input")?.getAttribute("aria-label")).toBe("項目を検索");
    expect(root.querySelector("input")?.value).toBe("Save");
    const later = document.createElement("span");
    later.textContent = "Unsaved changes";
    root.append(later);
    await tick();
    expect(later.textContent).toBe("未保存の変更");
    later.firstChild!.nodeValue = "Saved";
    await tick();
    expect(later.textContent).toBe("保存済み");
    stop();
  });
});
