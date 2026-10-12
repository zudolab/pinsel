import { parseInline, parseMarkdown, type InlineNode } from "@pinsel/ui/src/markdown/safe-markdown.ts";
import type { SiteProjectPlanRoute } from "zudo-composer/content";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { ASSET_PATHS, INSTAGRAM_URL, routeForPlanPathname } from "../invariants";
import { contractComponent } from "../site/component-contract";
import { resolvePageMeta } from "../site/page-meta";

// Test double for @pinsel/ui: renders a compiled route to the DOM the
// component contract describes (the approved prototype's markup, decoration
// omitted), so the publication checker can be exercised without the real pack.

type PlanNode = SiteProjectPlanRoute["composition"]["document"]["root"][number];

const e = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (value: number) => String(value).padStart(2, "0");
const lines = (value: unknown) => String(value ?? "").split("\n");
const inline = (nodes: readonly InlineNode[]) => nodes.map((node) => (node.kind === "link" ? `<a href="${e(node.href)}">${e(node.text)}</a>` : node.kind === "strong" ? `<strong>${e(node.text)}</strong>` : e(node.text))).join("");

function markdown(source: string): string {
  return parseMarkdown(source)
    .map((block) => (block.kind === "heading" ? `<h2 id="${block.id}">${inline(parseInline(block.text))}</h2>` : block.kind === "paragraph" ? `<p>${inline(block.children)}</p>` : `<ul>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`))
    .join("");
}

function render(node: PlanNode, slotIndex: number, pathname: string): string {
  const contract = contractComponent(node.componentId);
  const p: Record<string, unknown> = { ...Object.fromEntries(Object.entries(contract.props).map(([key, spec]) => [key, spec.default])), ...(node.props as Record<string, unknown>) };
  const slot = (id: string) => (node.slots[id] ?? []).map((child, index) => render(child, index + 1, pathname)).join("");
  const slotItems = (id: string) => (node.slots[id] ?? []).map((child, index) => render(child, index + 1, pathname));
  switch (node.componentId) {
    case "pinsel.site-frame":
      return `<a class="skip-link" href="#main">本文へスキップ</a>${slot("header")}<main id="main" tabindex="-1">${slot("main")}</main>${slot("footer")}`;
    case "pinsel.site-header":
      return `<div class="site-header"><header><a href="/" class="brand"><span class="brand__word">${e(p.brandWord)}</span><span class="brand__sub">${e(p.brandSub)}</span></a><nav id="site-navigation" class="site-nav">${slot("nav")}<a class="site-nav__contact" href="/contact/"><span>${e(p.contactLabel)}</span></a></nav></header></div>`;
    case "pinsel.nav-item":
      return `<a class="site-nav__item" href="${e(p.href)}">${e(p.label)}</a>`;
    case "pinsel.site-footer":
      return `<footer class="site-footer"><a href="/" class="brand"><span class="brand__word">${e(p.brandWord)}</span><span class="brand__sub">${e(p.brandSub)}</span></a><a class="footer-instagram" href="${INSTAGRAM_URL}"><span><span class="footer-instagram__label">Instagram</span><span>${e(p.instagramLabel)}</span></span></a><nav><ul class="footer-nav">${slot("nav")}</ul></nav><div class="footer-bottom"><p>${e(p.copyright)}</p><a href="#top"><span>${e(p.backToTopLabel)}</span></a></div></footer>`;
    case "pinsel.footer-nav-item":
      return `<li><a href="${e(p.href)}"><span class="eyebrow">${e(p.label)}</span><span class="footer-nav__title">${e(p.title)}</span><span class="footer-nav__description">${e(p.description)}</span></a></li>`;
    case "pinsel.group":
      return slot("items");
    case "pinsel.art-window":
      return `<div class="art-window art-window--${e(p.size)}" aria-hidden="true" data-parallax data-drift="${e(p.drift)}" data-motion-range="${e(p.range)}"></div>`;
    case "pinsel.section":
      return `<section class="section container reading-zone${p.variant === "instructor" ? " instructor-layout" : ""}"${p.id ? ` id="${e(p.id)}"` : ""}><div class="section-heading"><div><p class="eyebrow">${e(p.eyebrow)}</p><h2>${e(p.title)}</h2></div></div>${slot("content")}</section>`;
    case "pinsel.plain-section":
      return `<section class="section container reading-zone" aria-label="${e(p.ariaLabel)}">${slot("content")}</section>`;
    case "pinsel.section-after":
      return `<div class="section-after">${slot("content")}</div>`;
    case "pinsel.text-link":
      return `<a class="text-link" href="${e(p.href)}"><span>${e(p.label)}</span></a>`;
    case "pinsel.eyebrow":
      return `<p class="eyebrow">${e(p.text)}</p>`;
    case "pinsel.prose-block":
      return `<div class="prose">${slot("items")}</div>`;
    case "pinsel.paragraph":
      return `<p>${e(p.text)}</p>`;
    case "pinsel.paragraphs":
      return lines(p.text).map((line) => `<p>${e(line)}</p>`).join("");
    case "pinsel.prose":
      return `<div class="prose">${markdown(String(p.markdown))}</div>`;
    case "pinsel.breadcrumb":
      return `<nav class="breadcrumb container"><ol><li><a href="/"><span>トップ</span></a></li>${p.parentHref ? `<li><a href="${e(p.parentHref)}">${e(p.parentLabel)}</a></li>` : ""}<li aria-current="page"><span>${e(p.label)}</span></li></ol></nav>`;
    case "pinsel.page-heading":
      return `<header class="page-heading container reading-zone"><div><p class="eyebrow">${e(p.eyebrow)}</p><h1>${e(p.title)}</h1></div><div class="page-heading__description"><p>${e(p.description)}</p>${slot("after")}</div></header>`;
    case "pinsel.stats":
      return `<div class="stats">${slot("items")}</div>`;
    case "pinsel.stat":
      return `<p><strong>${e(p.number)}</strong><span>${e(p.label)}</span></p>`;
    case "pinsel.hero":
      return `<section class="hero"><div class="hero__reading"><p class="hero__label">${e(p.label)}</p><h1 id="hero-title">${lines(p.titleLines).map((line) => `<span>${e(line)}</span>`).join("")}</h1><div class="hero__copy"><p>${e(lines(p.lead).join(""))}</p><div class="hero__actions"><a class="button button--primary" href="${e(p.primaryHref)}"><span class="button__label"><span>${e(p.primaryLabel)}</span></span></a><a class="text-link" href="${e(p.pricingHref)}"><span>${e(p.pricingLabel)}</span></a></div></div></div>${slot("art")}</section>`;
    case "pinsel.hero-meta":
      return `<div class="container hero-meta reading-zone"><p>${e(p.line)}</p><p>${e(p.intro)}</p></div>`;
    case "pinsel.checklist":
      return `<ul class="checklist">${slot("items")}</ul>`;
    case "pinsel.checklist-item":
      return `<li><svg aria-hidden="true"></svg><span>${e(p.text)}</span></li>`;
    case "pinsel.pricing-cards":
      return `<div class="pricing-grid">${slot("items")}</div><p class="price-note">${e(p.note)}</p><div class="section-after"><a class="text-link" href="${e(p.moreHref)}"><span>${e(p.moreLabel)}</span></a></div>`;
    case "pinsel.pricing-card":
      return `<article class="pricing-card"><div class="pricing-card__top"><h3>${e(p.name)}</h3>${p.featured ? `<span class="pricing-card__popular">${e(p.popularBadge)}</span>` : ""}</div><p class="price">${e(p.price)}<span>${e(p.taxLabel)}</span></p><p class="pricing-card__unit">${e(p.unit)}</p><p class="pricing-card__description">${e(p.description)}</p><a class="text-link" href="/contact/?course=${e(p.courseIndex)}"><span>${e(p.linkLabel)}</span></a></article>`;
    case "pinsel.instructor":
      return `<div class="instructor${p.about ? " instructor--about" : ""}"><figure class="instructor__portrait"><img src="${ASSET_PATHS.instructorPortrait}" alt="${e(p.portraitAlt)}"></figure><div class="instructor__identity"><p class="instructor__name">${e(p.name)}</p><p class="instructor__latin">${e(p.latinName)}</p>${slot("identity")}</div></div>`;
    case "pinsel.instructor-subtitle":
      return `<p class="instructor__subtitle">${e(p.text)}</p>`;
    case "pinsel.instructor-bio":
      return `<div class="instructor__bio"><p>${e(p.text)}</p></div>`;
    case "pinsel.instructor-bio-link":
      return `<div class="instructor__bio"><a class="text-link" href="${e(p.href)}"><span>${e(p.label)}</span></a></div>`;
    case "pinsel.results-preview":
      return `<div class="results-preview">${slot("items")}</div>`;
    case "pinsel.result-preview":
      return `<article class="result-preview"><p class="result-preview__year">${e(p.yearLabel)}</p><h3>${e(p.school)}</h3><p>${e(p.detail)}</p></article>`;
    case "pinsel.voices-preview":
      return `<div class="voices-preview">${slot("items")}</div>`;
    case "pinsel.voice-preview":
      return `<article class="voice-preview"><blockquote>${e(p.quote)}</blockquote><cite>${e(p.author)}<span>${e(p.school)}</span></cite></article>`;
    case "pinsel.faq-list":
      return `<div class="faq-list">${slot("items")}</div>`;
    case "pinsel.faq-item":
      return `<details id="${e(p.idPrefix)}-${slotIndex}"${p.openFirst && slotIndex === 1 ? " open" : ""}><summary><span aria-hidden="true">Q.</span><span>${e(p.question)}</span></summary><div class="faq-list__answer"><span aria-hidden="true">A.</span><p>${e(p.answer)}</p></div></details>`;
    case "pinsel.cta":
      return `<section class="closing"><div class="closing__reading"><div><p class="eyebrow">CONTACT</p><h2>${e(p.title)}</h2></div><div class="closing__action">${slot("subcopy")}<a class="button button--primary" href="/contact/"><span class="button__label"><span>${e(p.buttonLabel)}</span></span></a></div></div>${slot("art")}</section>`;
    case "pinsel.cta-subcopy":
      return `<p>${e(String(p.text).replace(/^まずはお気軽にご相談ください。/, ""))}</p>`;
    case "pinsel.toc":
      return `<nav class="page-toc${p.wide ? " page-toc--wide container" : ""}" aria-label="${e(p.label)}"><p class="eyebrow"><span>${e(p.label)}</span></p><ol>${slot("items")}</ol></nav>`;
    case "pinsel.toc-item":
      return `<li><a href="${e(p.href || `#${p.fragmentPrefix}${slotIndex}`)}"><span aria-hidden="true">${pad(Number(p.number) > 0 ? Number(p.number) : slotIndex)}</span>${e(p.label)}</a></li>`;
    case "pinsel.note-toc-items":
      return parseMarkdown(String(p.markdown))
        .flatMap((block) => (block.kind === "heading" ? [block] : []))
        .map((block, index) => `<li><a href="#${block.id}"><span aria-hidden="true">${pad(index + 1)}</span>${e(block.text)}</a></li>`)
        .join("");
    case "pinsel.course-steps":
      return `<div class="course-steps">${slot("items")}</div>`;
    case "pinsel.course-step":
      return `<article class="course-step"><p class="course-step__number" aria-hidden="true">${pad(slotIndex)}</p><h3>${e(p.title)}</h3><p>${e(p.description)}</p></article>`;
    case "pinsel.price-detail":
      return `<div class="price-detail">${slot("items")}</div>`;
    case "pinsel.price-detail-card":
      return `<div class="price-detail__card"><h3>${e(p.name)}</h3><p class="price">${e(p.price)}</p><p class="quiet">${e(p.note)}</p></div>`;
    case "pinsel.consultation-intro":
      return `<div class="consultation-intro">${slot("course")}<div class="two-column"><div><h3>${e(p.topicsTitle)}</h3><ul class="simple-list">${lines(p.topics).map((line) => `<li>${e(line)}</li>`).join("")}</ul></div><div><h3>${e(p.faqTitle)}</h3><ul class="simple-list">${lines(p.faqTopics).map((line) => `<li>${e(line)}</li>`).join("")}</ul></div></div></div>`;
    case "pinsel.consultation-price":
      return `<div><p>${e(p.name)}</p><p class="price">${e(p.price)}</p><p class="quiet">${e(p.note)}</p></div>`;
    case "pinsel.lesson-career":
      return `<div class="section-after"><h3 class="lesson-career-title">${e(p.title)}</h3><ol class="timeline">${slot("items")}</ol></div>`;
    case "pinsel.timeline-item":
      return `<li><span class="timeline__year">${e(p.year)}</span><p>${e(p.text)}</p></li>`;
    case "pinsel.specialization-grid":
      return `<ul class="specialization-grid">${slot("items")}</ul>`;
    case "pinsel.specialization-item":
      return `<li><p lang="de">${e(p.de)}</p><p>${e(p.ja)}</p></li>`;
    case "pinsel.graduate-content":
      return `<div class="graduate-content" data-illustrated="10"><div class="prose">${lines(p.paragraphs).map((line) => `<p>${e(line)}</p>`).join("")}</div><figure class="graduate-illustration" aria-hidden="true"><img src="${ASSET_PATHS.graduatesIllustration}" alt=""></figure></div>`;
    case "pinsel.note-cards":
      return `<div class="note-grid${p.editorial ? " note-grid--editorial" : ""}">${slot("items")}</div>`;
    case "pinsel.note-card":
      return `<a class="note-card" href="${e(p.slug ? `/notes/${p.slug}/` : p.href)}"><span class="note-card__index" aria-hidden="true">${pad(slotIndex)}</span><div><h3>${e(p.title)}</h3><p>${e(p.description)}</p></div></a>`;
    case "pinsel.cv":
      return `<section class="section container reading-zone"><div class="two-column"><div><h2 class="cv-heading">${e(p.careerTitle)}</h2><ol class="timeline">${slot("career")}</ol></div><div><h2 class="cv-heading">${e(p.educationTitle)}</h2><ol class="timeline">${slot("education")}</ol></div></div></section>`;
    case "pinsel.message":
      return `<section class="container message-layout reading-zone" id="message"><div><p class="eyebrow">${e(p.eyebrow)}</p><h2 class="message-layout__heading">${e(p.title)}</h2></div>${slot("content")}</section>`;
    case "pinsel.feature-grid":
      return `<div class="feature-grid">${slot("items")}</div>`;
    case "pinsel.feature-card":
      return `<article class="feature-card"><h3>${e(p.title)}</h3><p>${e(p.description)}</p></article>`;
    case "pinsel.archive-layout":
      return `<div class="container archive-layout"><aside>${slot("aside")}</aside><div class="archive-body">${slot("body")}</div></div>`;
    case "pinsel.year-section":
      return `<section class="year-section reading-zone" id="year-${e(p.label)}"><h2>${e(p.label)}<span>（${e(p.count)}件）</span></h2><ul>${slot("items")}</ul></section>`;
    case "pinsel.result-row": {
      const inner = `<div><p>${e(p.school)}</p><p>${e(p.department)}</p></div>`;
      return `<li class="result-row">${p.url ? `<a href="${e(p.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner}</li>`;
    }
    case "pinsel.faq-category":
      return `<section class="faq-category reading-zone" id="${e(p.fragmentId)}"><h2>${e(p.title)}</h2><div class="faq-list">${slot("items")}</div></section>`;
    case "pinsel.student-index":
      return `<nav class="container student-index" aria-label="生徒の声から選ぶ">${slot("items")}</nav>`;
    case "pinsel.student-link":
      return `<a href="#student-${slotIndex}"><strong>${e(p.author)}</strong><span>${e(p.school)}</span></a>`;
    case "pinsel.voice-list": {
      const items = slotItems("items");
      const after = Number(p.artAfter);
      return [...items.slice(0, after), slot("art"), ...items.slice(after)].join("");
    }
    case "pinsel.voice-detail":
      return `<article class="container voice-detail reading-zone" id="student-${slotIndex}"><header class="voice-detail__meta"><h2>${e(p.author)}</h2><p>${e(p.yearLabel)}</p><p>${e(p.school)}</p><p>${e(p.department)}</p></header><blockquote>${lines(p.quote).map((line) => `<p>${e(line)}</p>`).join("")}</blockquote></article>`;
    case "pinsel.article-heading":
      return `<div class="container article-heading"><header class="page-heading reading-zone"><div>${slot("eyebrow")}<h1>${e(p.title)}</h1></div><div class="page-heading__description"><p>${e(p.description)}</p></div></header></div>`;
    case "pinsel.article-layout":
      return `<div class="container article-layout"><aside>${slot("aside")}</aside><article>${slot("body")}</article></div>`;
    case "pinsel.article-related":
      return `<section class="article-related" aria-label="すべてのノート"><h2>${e(p.title)}</h2><ul class="simple-list">${slot("items")}</ul></section>`;
    case "pinsel.note-link":
      return `<li>${pathname === `/notes/${p.slug}` ? `<span aria-current="page">${e(p.title)}</span>` : `<a class="text-link" href="/notes/${e(p.slug)}/"><span>${e(p.title)}</span></a>`}</li>`;
    case "pinsel.contact-layout":
      return `<div class="container contact-layout">${slot("aside")}${slot("panel")}</div>`;
    case "pinsel.contact-aside":
      return `<aside class="contact-aside"><h2>${e(p.title)}</h2><ol class="step-flow">${slot("items")}</ol></aside>`;
    case "pinsel.step-flow-item":
      return `<li><span class="step-flow__number" aria-hidden="true">${pad(slotIndex)}</span><div><h3>${e(p.title)}</h3><p>${e(p.description)}</p></div></li>`;
    case "pinsel.contact-form": {
      const field = (name: string, label: unknown, required: boolean, control: string) => `<div class="form-field"><label for="${name}">${e(label)}<span>${e(required ? p.requiredLabel : p.optionalLabel)}</span></label>${control}</div>`;
      return `<div class="contact-panel"><form id="contact-form" class="contact-form" novalidate aria-label="${e(p.formAriaLabel)}" data-submitting-label="${e(p.submittingLabel)}" data-value-missing-message="${e(p.valueMissingMessage)}" data-email-format-message="${e(p.emailFormatMessage)}"><p class="form-error" role="alert" data-form-error hidden>${e(p.errorMessage)}</p>${field("name", p.nameLabel, true, `<input id="name" name="name" type="text" required>`)}${field("email", p.emailLabel, true, `<input id="email" name="email" type="email" required>`)}${field("course", p.courseLabel, false, `<select id="course" name="course"><option value="${e(p.undecidedOption)}">${e(p.undecidedOption)}</option>${slot("options")}</select>`)}${field("message", p.messageLabel, true, `<textarea id="message" name="message" rows="6" required></textarea>`)}<p class="prototype-message">${e(p.previewNotice)}</p><button type="submit" class="button button--primary"><span class="button__label"><span data-submit-label>${e(p.submitLabel)}</span></span></button></form><div class="form-success" tabindex="-1" hidden><p class="eyebrow">${e(p.successPreviewEyebrow)}</p><h2>${e(p.successTitle)}</h2><p>${e(p.successBody)}</p><p class="prototype-message">${e(p.successPreviewNotice)}</p><button type="button" class="button" data-form-back>${e(p.backLabel)}</button></div></div>`;
    }
    case "pinsel.course-option":
      return `<option value="${e(p.label)}">${e(p.label)}</option>`;
    case "pinsel.legal":
      return `<section class="container"><details class="legal" id="legal"><summary>${e(p.summary)}</summary><table><tbody>${slot("items")}</tbody></table></details></section>`;
    case "pinsel.legal-row":
      return `<tr><th scope="row">${e(p.term)}</th><td>${e(p.value)}</td></tr>`;
    case "pinsel.not-found":
      return `<section class="container not-found reading-zone"><p class="not-found__number" aria-hidden="true">404</p><h1>${e(p.title)}</h1><p>${e(p.body)}</p><a class="button" href="/"><span class="button__label"><span>${e(p.linkLabel)}</span></span></a></section>`;
    default:
      throw new Error(`reference-dom has no markup for ${node.componentId}`);
  }
}

/** A whole HTML document for a compiled route, with <title>/description from the entries. */
export function referenceDocument(route: SiteProjectPlanRoute, entries: readonly ContentEntryRecord[]): string {
  const output = routeForPlanPathname(route.pathname);
  if (!output) throw new Error(`${route.pathname} is not an output route`);
  const meta = resolvePageMeta(output, entries);
  const body = route.composition.document.root.map((node, index) => render(node, index + 1, route.pathname)).join("");
  return `<!doctype html><html lang="ja" id="top"><head><meta charset="utf-8"><meta name="description" content="${e(meta.description)}"><title>${e(meta.title)}</title><link rel="icon" href="${ASSET_PATHS.favicon}"></head><body>${body}</body></html>`;
}
