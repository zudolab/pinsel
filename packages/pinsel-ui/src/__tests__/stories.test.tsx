import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import type { Story, StoryMeta } from "../stories/types";

// Every co-located story renders, without scripts, and story basenames stay
// unique (the styleguide mirrors them as ui/<name>/<name>.stories.tsx).
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(src, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".stories.tsx"))
  .sort();
const modules = await Promise.all(files.map(async (file) => [file, (await import(path.join(src, file))) as Record<string, unknown> & { default: StoryMeta }] as const));

const isStory = (value: unknown): value is Story => typeof value === "object" && value !== null && typeof (value as Story).render === "function";

describe("stories", () => {
  it("have unique basenames", () => {
    const names = files.map((file) => path.basename(file));
    expect(new Set(names).size).toBe(names.length);
    expect(files.length).toBeGreaterThan(30);
  });

  for (const [file, module] of modules) {
    it(`${file} renders every story`, () => {
      expect(module.default.title).toBeTruthy();
      const stories = Object.entries(module).filter((entry): entry is [string, Story] => isStory(entry[1]));
      expect(stories.length).toBeGreaterThan(0);
      for (const [key, story] of stories) {
        const html = renderToString(story.render());
        expect(html, `${file}#${key}`).not.toBe("");
        expect(html, `${file}#${key}`).not.toContain("<script");
      }
    });
  }
});
