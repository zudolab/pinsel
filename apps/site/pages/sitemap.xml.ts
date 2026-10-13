import { siteConfig } from "~/lib/site-config";
import { OUTPUTS } from "~/data/routes.generated";

// zfb cannot skip a static page, so while indexing is `noindex` the sitemap is an empty urlset (robots.txt does not reference it).
export default function Sitemap(): string {
  const routes = siteConfig.indexing === "index" ? OUTPUTS.filter((output) => output.route !== "/404.html").map((output) => output.route) : [];
  const urls = routes.map((route) => `  <url><loc>${siteConfig.origin}${route}</loc></url>\n`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}
