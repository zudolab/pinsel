import { CONTENT_EDITOR_LABELS_JA, mountContentEditor, type MountContentEditorOptions } from "zudo-composer/content-editor";
import type { ContentEditorStorage } from "zudo-composer/host-storage";
import { createTransport } from "./transport";

// The Pinsel host page for Composer's restricted content editor. Everything
// that decides anything lives in the Worker: this page fetches the site
// description (baseline, presentation policy, pack identity, preview URL),
// mounts the editor over the HTTP transport and leaves the rest to it.

interface SiteDescription {
  status: "ok";
  projectId: string;
  baselineRevision: string;
  pack: { packId: string; packVersion: string };
  policy: MountContentEditorOptions["policy"];
  preview: { url: string; origin: string; route: string };
}

async function describeSite(): Promise<SiteDescription> {
  const response = await fetch("/api/v1/site", { headers: { accept: "application/json" }, credentials: "same-origin" });
  const body = (await response.json()) as SiteDescription | { status: string; message?: string };
  if (!response.ok || body.status !== "ok") throw new Error(`サイト情報を取得できませんでした (${response.status} ${"message" in body ? body.message : body.status})`);
  return body as SiteDescription;
}

const root = document.querySelector("#editor");
if (!root) throw new Error("Missing #editor");

try {
  const site = await describeSite();
  const storage: ContentEditorStorage = createTransport();
  const handle = mountContentEditor(root, {
    project: { id: site.projectId, label: "Pinsel" },
    revision: site.baselineRevision,
    policy: site.policy,
    storage,
    preview: { url: site.preview.url, origin: site.preview.origin, pack: site.pack, route: site.preview.route, title: "プレビュー" },
    labels: CONTENT_EDITOR_LABELS_JA,
  });
  addEventListener("pagehide", () => {
    void handle.flush().catch(() => undefined);
  });
  // Exposed for scripted checks only; nothing on the page reads it.
  Object.assign(window, { __pinselEditor: handle });
} catch (error) {
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.textContent = error instanceof Error ? error.message : String(error);
  root.replaceChildren(message);
}
