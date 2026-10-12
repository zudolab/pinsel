import { describe, expect, it } from "vitest";
import { isForbiddenLocation } from "../forbidden";

describe("forbidden surfaces", () => {
  it("allows only the editor page", () => {
    expect(isForbiddenLocation({ pathname: "/editor/", hash: "" })).toBe(false);
    expect(isForbiddenLocation({ pathname: "/editor/index.html", hash: "" })).toBe(false);
  });

  it("refuses structural paths and hash routes", () => {
    for (const pathname of ["/editor/composer", "/editor/mapping/", "/editor/sitemapper", "/editor/content/schema", "/composer"]) expect(isForbiddenLocation({ pathname, hash: "" })).toBe(true);
    for (const hash of ["#/composer", "#mapping", "#!/content/schema", "#/assets/upload", "#/models"]) expect(isForbiddenLocation({ pathname: "/editor/", hash })).toBe(true);
    expect(isForbiddenLocation({ pathname: "/editor/", hash: "#main" })).toBe(false);
  });
});
