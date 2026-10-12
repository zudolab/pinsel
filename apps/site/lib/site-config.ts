/** Public-site launch inputs, read by `zfb.config.ts`, the layout and `pages/robots.txt.ts`. */
export interface SiteConfig {
  /** Absolute origin for canonical / og:url / sitemap; equals `SITE_ORIGIN` in `@pinsel/content` invariants. */
  origin: string;
  /** `noindex` (preview, the approved prototype's `noindex,nofollow` + `Disallow: /`) until the launch decision flips it to `index`. */
  indexing: "noindex" | "index";
}

export const siteConfig: SiteConfig = {
  origin: "https://pinsel-germany.com",
  indexing: "noindex",
};
