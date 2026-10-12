import { siteConfig } from "~/lib/site-config";

// Preview stays `Disallow: /` (the approved prototype's robots.txt) until indexing is switched on.
export default function Robots(): string {
  if (siteConfig.indexing === "noindex") return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteConfig.origin}/sitemap.xml\n`;
}
