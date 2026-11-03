// The preview client is now a real browser module, never serialized function text.
// Full renderer/protocol acceptance runs against the real Worker in hosted.spec.ts.
import { readFile } from "node:fs/promises";
const client = await readFile(new URL("../apps/editor/dist/editor/static/preview.js", import.meta.url), "utf8");
if (!client.includes("/preview/document") || !client.includes("pinsel-rendered-identity")) throw new Error("Built preview client lacks immutable snapshot renderer/identity checks");
if (/__vite-browser-external|from[ ]*[\"']node:/.test(client)) throw new Error("Preview has a Node dependency");
console.log("Built preview module uses immutable snapshot document and identity validation; browser suite covers protocol acknowledgement.");
