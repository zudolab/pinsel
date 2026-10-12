import { h, type Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow, type ArtSize, type ArtSlot } from "../art-window/art-window";
import { ContactForm } from "../contact-form/contact-form";
import { ctaHeadingLines, ctaRemainder } from "../cta/cta";
import { FaqItem as FaqItemView } from "../faq/faq";
import { GRADUATES_ILLUSTRATION } from "../graduates-section/graduates-section";
import { Icon } from "../icon/icon";
import { INSTRUCTOR_PORTRAIT } from "../instructor/instructor";
import { parseMarkdown } from "../markdown/safe-markdown";
import { directoryPath } from "../nav-link/nav-link";
import { PAGE_TITLE_LINES } from "../page-heading/page-heading";
import type { RouteContext, SlotPosition } from "../render/types";
import { SiteFooter as SiteFooterView } from "../site-footer/site-footer";
import { SiteHeader as SiteHeaderView } from "../site-header/site-header";
import { SkipLink } from "../skip-link/skip-link";
import { ButtonLink, TextLink } from "../text-link/text-link";
import { TocItem as TocItemView, twoDigits } from "../toc/toc";
import { TITLE_PHRASES } from "../article-heading/article-heading";
import { INSTAGRAM_URL } from "../site-footer/site-footer";

// The component pack's renderers, one per entry of the component contract
// (packages/pinsel-content/src/site/component-contract.ts). Pinned Composer
// gives every node the props of ONE content entry and materialises no global
// template, so the pack is finer-grained than the page-level components:
// copy from a second model arrives through a slot, list values arrive as one
// item per line, and every page root is a site-frame. Markup is the approved
// prototype's; the richer components in the sibling directories reuse it.

type Slot = readonly unknown[] | undefined;
const children = (slot: Slot): Child => (slot ?? []) as Child;
const lines = (text: string): string[] => text.split(/\r?\n/).filter((line) => line.trim() !== "");
const index = (position: SlotPosition | undefined): number => position?.index ?? 1;

interface Injected {
  route?: RouteContext;
  position?: SlotPosition;
}

// ---- Chrome ---------------------------------------------------------------

export function SiteFrameRoot(props: { header?: Slot; main?: Slot; footer?: Slot }): Child {
  return (
    <>
      <SkipLink />
      {children(props.header)}
      <main id="main" tabindex={-1}>
        {children(props.main)}
      </main>
      {children(props.footer)}
    </>
  );
}

export function SiteHeaderBlock(props: { brandWord: string; brandSub: string; contactLabel: string; nav?: Slot } & Injected): Child {
  return <SiteHeaderView brandWord={props.brandWord} brandSub={props.brandSub} contactLabel={props.contactLabel} nav={children(props.nav)} pathname={props.route?.pathname} />;
}

export function SiteFooterBlock(props: { brandWord: string; brandSub: string; instagramLabel: string; copyright: string; backToTopLabel: string; nav?: Slot }): Child {
  return <SiteFooterView {...props} nav={children(props.nav)} />;
}

export function Group(props: { items?: Slot }): Child {
  return <>{children(props.items)}</>;
}

export function ArtWindowBlock(props: { slot: ArtSlot; size: ArtSize; drift: "1" | "-1"; range: number }): Child {
  return <ArtWindow slot={props.slot} size={props.size} drift={props.drift === "-1" ? -1 : 1} range={props.range} />;
}

// ---- Generic --------------------------------------------------------------

export function SectionBlock(props: { id: string; eyebrow: string; title: string; variant: "default" | "instructor"; content?: Slot }): Child {
  return (
    <section class={`section container${props.variant === "instructor" ? " instructor-layout" : ""} reading-zone`} id={props.id || null}>
      <div class="section-heading">
        <div>
          {props.eyebrow ? <p class="eyebrow">{props.eyebrow}</p> : null}
          <h2>{props.title}</h2>
        </div>
      </div>
      {children(props.content)}
    </section>
  );
}

export function PlainSection(props: { ariaLabel: string; content?: Slot }): Child {
  return (
    <section class="section container reading-zone" aria-label={props.ariaLabel || null}>
      {children(props.content)}
    </section>
  );
}

export function Eyebrow({ text }: { text: string }): Child {
  return <p class="eyebrow">{text}</p>;
}

export function ProseBlock(props: { items?: Slot }): Child {
  return <div class="prose">{children(props.items)}</div>;
}

export function Paragraph({ text }: { text: string }): Child {
  return <p>{text}</p>;
}

/** One `<p>` per line, no wrapper. */
export function ParagraphLines({ text }: { text: string }): Child {
  return lines(text).map((line) => <p>{line}</p>);
}

// ---- Page heads -----------------------------------------------------------

export function PageHeadingBlock(props: { eyebrow: string; title: string; description: string; after?: Slot }): Child {
  const titleLines = PAGE_TITLE_LINES[props.title];
  return (
    <header class="page-heading container reading-zone">
      <div>
        <p class="eyebrow">{props.eyebrow}</p>
        <h1>{titleLines ? titleLines.map((line) => <span>{line}</span>) : props.title}</h1>
      </div>
      <div class="page-heading__description">
        <p>{props.description}</p>
        {children(props.after)}
      </div>
    </header>
  );
}

export function Stats(props: { items?: Slot }): Child {
  return <div class="stats">{children(props.items)}</div>;
}

// ---- Home -----------------------------------------------------------------

export function HeroBlock(props: { label: string; titleLines: string; lead: string; primaryLabel: string; primaryHref: string; pricingLabel: string; pricingHref: string; art?: Slot }): Child {
  return (
    <section class="hero" aria-labelledby="hero-title">
      <div class="container hero__reading reading-zone">
        <p class="hero__label">{props.label}</p>
        <h1 id="hero-title">
          {lines(props.titleLines).map((line) => (
            <span>{line}</span>
          ))}
        </h1>
        <div class="hero__copy">
          <p>{props.lead.split(/\r?\n/).join("")}</p>
          <div class="hero__actions">
            <ButtonLink href={props.primaryHref} label={props.primaryLabel} primary />
            <TextLink href={props.pricingHref} label={props.pricingLabel} />
          </div>
        </div>
      </div>
      {children(props.art)}
    </section>
  );
}

export function InstructorBlock(props: { name: string; latinName: string; portraitAlt: string; about: boolean; identity?: Slot }): Child {
  return (
    <div class={props.about ? "instructor instructor--about" : "instructor"}>
      <figure class="instructor__portrait">
        <img src={INSTRUCTOR_PORTRAIT.src} alt={props.portraitAlt} width={INSTRUCTOR_PORTRAIT.width} height={INSTRUCTOR_PORTRAIT.height} loading="lazy" />
      </figure>
      <div class="instructor__identity">
        <p class="instructor__name">{props.name}</p>
        <p class="instructor__latin">{props.latinName}</p>
        {children(props.identity)}
      </div>
    </div>
  );
}

export function InstructorSubtitle({ text }: { text: string }): Child {
  return <p class="instructor__subtitle">{text}</p>;
}

export function InstructorBio({ text }: { text: string }): Child {
  return (
    <div class="instructor__bio">
      <p>{text}</p>
    </div>
  );
}

export function InstructorBioLink({ href, label }: { href: string; label: string }): Child {
  return (
    <div class="instructor__bio">
      <TextLink href={href || INSTAGRAM_URL} label={label} />
    </div>
  );
}

export function FaqList(props: { items?: Slot }): Child {
  return <div class="faq-list">{children(props.items)}</div>;
}

export function FaqItemBlock(props: { question: string; answer: string; idPrefix: string; openFirst: boolean } & Injected): Child {
  return <FaqItemView question={props.question} answer={props.answer} prefix={props.idPrefix} openFirst={props.openFirst} index={index(props.position)} />;
}

export function CtaBlock(props: { title: string; buttonLabel: string; subcopy?: Slot; art?: Slot }): Child {
  const heading = ctaHeadingLines(props.title).flatMap((line, at) => (at === 0 ? [line] : [h("br", {}), line]));
  return (
    <section class="closing">
      <div class="container closing__reading reading-zone">
        <div>
          <p class="eyebrow">CONTACT</p>
          <h2>{heading}</h2>
        </div>
        <div class="closing__action">
          {children(props.subcopy)}
          <ButtonLink href="/contact/" label={props.buttonLabel} primary />
        </div>
      </div>
      {children(props.art)}
    </section>
  );
}

// The approved closing heading; a page's CTA copy repeats it and the closing drops the repeat.
const CTA_OPENING = "まずはお気軽にご相談ください。";

export function CtaSubcopy({ text }: { text: string }): Child {
  return <p>{ctaRemainder(CTA_OPENING, text)}</p>;
}

// ---- Lessons --------------------------------------------------------------

export function TocItemBlock(props: { label: string; href: string; fragmentPrefix: string; number: number } & Injected): Child {
  const at = props.number > 0 ? props.number : index(props.position);
  const target = props.href ? props.href.replace(/^#/, "") : `${props.fragmentPrefix}${index(props.position)}`;
  return <TocItemView label={props.label} target={target} prefix="" index={at} />;
}

/** One TOC entry per `## ` heading of a note body. */
export function NoteTocItems({ markdown }: { markdown: string }): Child {
  return parseMarkdown(markdown)
    .flatMap((block) => (block.kind === "heading" ? [block] : []))
    .map((heading, at) => TocItemView({ label: heading.text, target: heading.id, prefix: "", index: at + 1 }));
}

export function ConsultationIntroBlock(props: { topicsTitle: string; topics: string; faqTitle: string; faqTopics: string; course?: Slot }): Child {
  const column = (title: string, items: string) => (
    <div>
      <h3>{title}</h3>
      <ul class="simple-list">
        {lines(items).map((item) => (
          <li>{item}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div class="consultation-intro">
      {children(props.course)}
      <div class="two-column">
        {column(props.topicsTitle, props.topics)}
        {column(props.faqTitle, props.faqTopics)}
      </div>
    </div>
  );
}

export function ConsultationPrice(props: { name: string; price: string; note: string }): Child {
  return (
    <div>
      <p>{props.name}</p>
      <p class="price">{props.price}</p>
      <p class="quiet">{props.note}</p>
    </div>
  );
}

export function LessonCareer(props: { title: string; items?: Slot }): Child {
  return (
    <div class="section-after">
      <h3 class="lesson-career-title">{props.title}</h3>
      <ol class="timeline">{children(props.items)}</ol>
    </div>
  );
}

export function GraduateContent({ paragraphs }: { paragraphs: string }): Child {
  return (
    <div class="graduate-content" data-illustrated="10">
      <div class="prose">
        {lines(paragraphs).map((paragraph) => (
          <p>{paragraph}</p>
        ))}
      </div>
      <figure class="graduate-illustration" aria-hidden="true">
        <img src={GRADUATES_ILLUSTRATION.src} alt="" width={GRADUATES_ILLUSTRATION.width} height={GRADUATES_ILLUSTRATION.height} loading="lazy" decoding="async" />
      </figure>
    </div>
  );
}

export function NoteCardBlock(props: { href: string; slug: string; title: string; description: string } & Injected): Child {
  return (
    <a class="note-card" href={props.slug ? `/notes/${props.slug}/` : props.href}>
      <span class="note-card__index" aria-hidden="true">
        {twoDigits(index(props.position))}
      </span>
      <div>
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
      <Icon name="arrow-right" class="note-card__arrow" />
    </a>
  );
}

// ---- About ----------------------------------------------------------------

export function Cv(props: { careerTitle: string; educationTitle: string; career?: Slot; education?: Slot }): Child {
  return (
    <section class="section container reading-zone">
      <div class="two-column">
        <div>
          <h2 class="cv-heading">{props.careerTitle}</h2>
          <ol class="timeline">{children(props.career)}</ol>
        </div>
        <div>
          <h2 class="cv-heading">{props.educationTitle}</h2>
          <ol class="timeline">{children(props.education)}</ol>
        </div>
      </div>
    </section>
  );
}

export function MessageBlock(props: { eyebrow: string; title: string; content?: Slot }): Child {
  return (
    <section class="container message-layout reading-zone" id="message">
      <div>
        <p class="eyebrow">{props.eyebrow}</p>
        <h2 class="message-layout__heading">{props.title}</h2>
      </div>
      {children(props.content)}
    </section>
  );
}

// ---- Results / FAQ --------------------------------------------------------

export function ArchiveLayoutBlock(props: { aside?: Slot; body?: Slot }): Child {
  return (
    <div class="container archive-layout">
      <aside>{children(props.aside)}</aside>
      <div class="archive-body">{children(props.body)}</div>
    </div>
  );
}

export function FaqCategoryBlock(props: { fragmentId: string; title: string; items?: Slot }): Child {
  return (
    <section class="faq-category reading-zone" id={props.fragmentId || null}>
      <h2>{props.title}</h2>
      <div class="faq-list">{children(props.items)}</div>
    </section>
  );
}

// ---- Voices ---------------------------------------------------------------

/** The testimonials with the page's art window after number `artAfter`. */
export function VoiceList(props: { artAfter: number; items?: Slot; art?: Slot }): Child {
  const items = [...(props.items ?? [])];
  const at = Math.min(Math.max(props.artAfter, 0), items.length);
  return [...items.slice(0, at), ...(props.art ?? []), ...items.slice(at)] as Child;
}

export function VoiceDetailBlock(props: { author: string; yearLabel: string; school: string; department: string; quote: string } & Injected): Child {
  return (
    <article class="container voice-detail reading-zone" id={`student-${index(props.position)}`}>
      <header class="voice-detail__meta">
        <h2>{props.author}</h2>
        <p>{props.yearLabel}</p>
        <p>{props.school}</p>
        <p>{props.department}</p>
      </header>
      <blockquote>
        {props.quote.split("\n").map((line) => (
          <p>{line}</p>
        ))}
      </blockquote>
    </article>
  );
}

// ---- Notes ----------------------------------------------------------------

export function ArticleHeadingBlock(props: { title: string; description: string; slug: string; eyebrow?: Slot }): Child {
  const phrases = TITLE_PHRASES[props.slug];
  return (
    <div class="container article-heading">
      <header class="page-heading reading-zone">
        <div>
          {children(props.eyebrow)}
          <h1>{phrases ? phrases.map((phrase) => <span class="title-phrase">{phrase}</span>) : props.title}</h1>
        </div>
        <div class="page-heading__description">
          <p>{props.description}</p>
        </div>
      </header>
    </div>
  );
}

export function ArticleLayoutBlock(props: { aside?: Slot; body?: Slot }): Child {
  return (
    <div class="container article-layout">
      <aside>{children(props.aside)}</aside>
      <article>{children(props.body)}</article>
    </div>
  );
}

export function ArticleRelated(props: { title: string; items?: Slot }): Child {
  return (
    <section class="article-related" aria-label="すべてのノート">
      <h2>{props.title}</h2>
      <ul class="simple-list">{children(props.items)}</ul>
    </section>
  );
}

export function NoteLink(props: { slug: string; title: string } & Injected): Child {
  const href = `/notes/${props.slug}/`;
  const current = props.route !== undefined && directoryPath(props.route.pathname) === href;
  return <li>{current ? <span aria-current="page">{props.title}</span> : <TextLink href={href} label={props.title} />}</li>;
}

// ---- Contact --------------------------------------------------------------

export function ContactLayoutBlock(props: { aside?: Slot; panel?: Slot }): Child {
  return (
    <div class="container contact-layout">
      {children(props.aside)}
      {children(props.panel)}
    </div>
  );
}

export function ContactAside(props: { title: string; items?: Slot }): Child {
  return (
    <aside class="contact-aside">
      <h2>{props.title}</h2>
      <ol class="step-flow">{children(props.items)}</ol>
    </aside>
  );
}

export interface ContactFormBlockProps {
  formAriaLabel: string;
  nameLabel: string;
  emailLabel: string;
  courseLabel: string;
  undecidedOption: string;
  messageLabel: string;
  requiredLabel: string;
  optionalLabel: string;
  submitLabel: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  errorMessage: string;
  backLabel: string;
  valueMissingMessage: string;
  emailFormatMessage: string;
  previewNotice: string;
  successPreviewEyebrow: string;
  successPreviewNotice: string;
  options?: Slot;
}

export function ContactFormBlock({ undecidedOption, options, ...copy }: ContactFormBlockProps): Child {
  return <ContactForm {...copy} courseUndecidedOption={undecidedOption} courseOptions={options} />;
}

export function Legal(props: { summary: string; items?: Slot }): Child {
  return (
    <section class="container">
      <details class="legal" id="legal">
        <summary>{props.summary}</summary>
        <table>
          <tbody>{children(props.items)}</tbody>
        </table>
      </details>
    </section>
  );
}

// ---- 404 ------------------------------------------------------------------

export function NotFoundBlock(props: { title: string; body: string; linkLabel: string }): Child {
  return (
    <section class="container not-found reading-zone">
      <p class="not-found__number" aria-hidden="true">
        404
      </p>
      <h1>{props.title}</h1>
      <p>{props.body}</p>
      <ButtonLink href="/" label={props.linkLabel} />
    </section>
  );
}
