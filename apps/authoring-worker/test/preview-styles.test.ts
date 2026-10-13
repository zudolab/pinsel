import { describe, expect, it } from "vitest";
import { PREVIEW_STYLES } from "../src/preview/styles.generated";

// Top-level statements of a stylesheet, comments stripped: each block's prelude with the blocks nested in it.
interface Block {
  prelude: string;
  children: Block[];
}

function blocks(css: string): Block[] {
  const root: Block = { prelude: "", children: [] };
  const stack = [root];
  let buffer = "";
  for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (character === "{") {
      const block = { prelude: buffer.trim(), children: [] };
      stack.at(-1)!.children.push(block);
      stack.push(block);
      buffer = "";
    } else if (character === "}") {
      stack.pop();
      buffer = "";
    } else if (character === ";") buffer = "";
    else buffer += character;
  }
  return root.children;
}

describe("preview styles", () => {
  it("keep the token files inside @layer tokens, so the responsive layer can override them", () => {
    const top = blocks(PREVIEW_STYLES);
    // Nothing at the top level is unlayered: unlayered CSS beats every layer.
    expect(top.filter((block) => !block.prelude.startsWith("@layer")).map((block) => block.prelude)).toEqual([]);
    const tokens = top.filter((block) => block.prelude === "@layer tokens");
    expect(tokens.length).toBeGreaterThanOrEqual(2);
    expect(tokens.every((block) => block.children.some((child) => child.prelude === ":root"))).toBe(true);
    // The tokens layer is the first layer declared, before the order statement in components.css.
    expect(top[0]!.prelude).toBe("@layer tokens");
    expect(PREVIEW_STYLES).toContain("@layer tokens, reset, layout, components, responsive;");
  });
});
