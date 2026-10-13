import { render } from "preact";
import { App } from "./app";
import { isForbiddenLocation } from "./forbidden";
import { describeSite } from "./site";
import "./host.css";

// The Pinsel host page for Composer's restricted content editor. Everything
// that decides anything lives in the Worker: this page fetches the site
// description (baseline, presentation policy, pack identity, routes, preview
// URL), then the host shell mounts the editor over the HTTP transport.

const root = document.querySelector("#editor");
if (!root) throw new Error("Missing #editor");

function showMessage(text: string, unavailable = false): void {
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.className = "pinsel-note";
  if (unavailable) message.dataset.unavailable = "";
  message.textContent = text;
  root!.replaceChildren(message);
}

if (isForbiddenLocation(location)) {
  showMessage("利用できません。この画面ではコンテンツの編集だけができます。", true);
} else {
  try {
    const site = await describeSite();
    render(<App site={site} />, root);
  } catch (error) {
    showMessage(error instanceof Error ? error.message : String(error));
  }
}
