import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Child } from "@takazudo/zfb/zudo-react";

import { ArchiveLayout } from "../archive-layout/archive-layout";
import { ArticleHeading } from "../article-heading/article-heading";
import { ArticleLayout, RelatedNote } from "../article-layout/article-layout";
import { ArtWindow } from "../art-window/art-window";
import { Checklist, ChecklistItem } from "../checklist/checklist";
import { ConsultationIntro } from "../consultation-intro/consultation-intro";
import { ContactForm, CourseOption } from "../contact-form/contact-form";
import { ContactLayout, Step } from "../contact-layout/contact-layout";
import { CourseStep, CourseSteps } from "../course-steps/course-steps";
import { Cta } from "../cta/cta";
import { DocumentShell } from "../document/document-shell";
import { Faq, FaqCategory, FaqItem } from "../faq/faq";
import { FeatureCard, FeatureGrid } from "../feature-grid/feature-grid";
import { FooterLink } from "../footer-link/footer-link";
import { GraduatesSection } from "../graduates-section/graduates-section";
import { Hero } from "../hero/hero";
import { HeroMeta } from "../hero-meta/hero-meta";
import { Instructor } from "../instructor/instructor";
import { LegalRow, LegalTable } from "../legal-table/legal-table";
import { Message } from "../message/message";
import { MoreLink } from "../more-link/more-link";
import { NotFound } from "../not-found/not-found";
import { NoteCard, NoteCards } from "../note-cards/note-cards";
import { PageHeading, Stat } from "../page-heading/page-heading";
import { Paragraphs } from "../paragraphs/paragraphs";
import { PriceDetail, PriceDetailCard } from "../price-detail/price-detail";
import { PricingCard, PricingCards } from "../pricing-cards/pricing-cards";
import { ResultPreview, ResultPreviews } from "../result-previews/result-previews";
import { ResultRow, ResultsYearSection } from "../results-year/results-year";
import { Section } from "../section/section";
import { SectionAfter } from "../section-after/section-after";
import { SiteFrame } from "../site-frame/site-frame";
import { Specialization, SpecializationGrid } from "../specialization-grid/specialization-grid";
import { StudentIndex, StudentLink } from "../student-index/student-index";
import { Timeline, TimelineEntry } from "../timeline/timeline";
import { Toc, TocItem } from "../toc/toc";
import { TwoColumn } from "../two-column/two-column";
import { VoiceDetail } from "../voice-detail/voice-detail";
import { VoicePreview, VoicePreviews } from "../voice-previews/voice-previews";

// The fourteen approved pages composed from the pinsel-ui components with
// the approved seed content, mirroring the prototype's `build.py` page by
// page. The fidelity test compares them with the prototype's own output; the
// content migration builds the same pages through the structure manifest.

const here = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(here, "../../../../tests/fixtures/approved-seed/content.json");

type Json = any;
const D: Json = JSON.parse(readFileSync(seedPath, "utf8"));
const FM: Json = D.frontmatter;
const HOME = "src/pages/index.astro";
const LESSONS = "src/pages/lessons/index.astro";
const ABOUT = "src/pages/about/index.astro";
const RESULTS = "src/pages/results/index.astro";
const VOICES = "src/pages/voices/index.astro";
const FAQ = "src/pages/faq/index.astro";
const CONTACT = "src/pages/contact/index.astro";
const FOOTER: { href: string; label: string; title: string; description: string }[] = FM["components/site-footer/site-footer.astro"].navLinks;

const plain = (source: string, tag?: string): string[] =>
  D.staticText[source].filter((x: Json) => !x.hasExpression && (tag === undefined || x.tag === tag)).map((x: Json) => x.text as string);
const txt = (source: string, prefix: string): string => {
  const rows = plain(source).filter((x) => x.startsWith(prefix));
  if (rows.length !== 1) throw new Error(`${source}: ${prefix} → ${rows.length}`);
  return rows[0]!;
};
const componentProps = (source: string, component: string): Json[] => D.componentProps[source].filter((x: Json) => x.component === component).map((x: Json) => x.props);

const FRAME = { brandWord: "Pinsel", brandSub: "ART STUDY IN GERMANY", instagramLabel: "yuko_takatsudo", copyright: "© 2015–2026 Pinsel Germany. All rights reserved.", backToTopLabel: "ページの先頭へ" };
const INSTRUCTOR = { name: "高津戸 優子", latinName: "Yuko Takatsudo", portraitAlt: "高津戸 優子", detailLabel: "詳しく見る", detailHref: "/about/", instagramLabel: "Instagram" };

export interface PrototypePage {
  route: string;
  file: string;
  html: string;
}

function page(route: string, title: string, description: string, body: Child): PrototypePage {
  const pathname = route === "404.html" ? "/404.html" : `/${route}`;
  const html = `<!doctype html>${renderDocument(pathname, title, description, body)}`;
  return { route, file: route === "404.html" ? "404.html" : `${route}index.html`, html };
}

let renderDocument: (pathname: string, title: string, description: string, body: Child) => string = () => "";

function frame(pathname: string, body: Child[]): Child {
  return <SiteFrame {...FRAME} route={{ pathname }} main={body} footerNav={FOOTER.map((x) => <FooterLink href={`/${x.href.replace(/^\//, "")}`} label={x.label} title={x.title} description={x.description} />)} />;
}

function cta(source: string, large = true): Child {
  const x = componentProps(source, "CtaSection")[0];
  return <Cta heading="まずはお気軽にご相談ください。" subCopy={x.subCopy} buttonLabel={x.text} large={large} />;
}

function head(source: string, eyebrow: string, artSize: "small" | "medium" | "ribbon", stats: Child[] = []): Child {
  const p = componentProps(source, "PageHeader")[0];
  return <PageHeading title={p.title} description={p.description ?? FM[source].description ?? ""} eyebrow={eyebrow} artSize={artSize} stats={stats} />;
}

function home(): PrototypePage {
  const h = plain("components/hero-section/hero-section.astro", "p");
  const courses: Json[] = FM["components/pricing-section/pricing-section.astro"].pricingData;
  const teacher = componentProps(HOME, "InstructorProfile")[0];
  const body: Child[] = [
    <Hero label={h[0]!} titleLines={["あなただけの", "ドイツ美大受験準備を", "個別指導で。"]} lead={h[2]!} primaryLabel="オンラインクラス" primaryHref="/lessons/" pricingLabel="コースと料金" pricingHref="#pricing" />,
    <HeroMeta line="完全マンツーマン・オンライン" intro={txt(HOME, "初心者の方も")} />,
    <Section id="for-you" eyebrow="For You" title="こんな方へ" content={[<Checklist items={FM[HOME].targetItems.map((x: string) => <ChecklistItem text={x} />)} />]} />,
    <Section
      id="pricing"
      eyebrow="COURSE & PRICING"
      title="コースと料金"
      content={[
        <PricingCards
          note={plain("components/pricing-section/pricing-section.astro", "p")[0]!}
          moreLabel="クラスの詳細はこちら"
          moreHref="/lessons/"
          items={courses.map((x, i) => <PricingCard name={x.name} price={x.price} unit={x.unit} description={x.description} featured={Boolean(x.featured)} courseIndex={i + 1} taxLabel="税込" popularBadge="POPULAR" linkLabel="このコースについて相談する" />)}
        />,
      ]}
    />,
    <ArtWindow slot="middle" size="large" />,
    <Section id="instructor" eyebrow="Instructor" title="講師紹介" layout="instructor" content={[<Instructor variant="home" {...INSTRUCTOR} name={teacher.name} subtitle={teacher.title} bio={teacher.bio} />]} />,
    <Section id="results" eyebrow="Results" title="合格実績" content={[<ResultPreviews items={FM[HOME].results.map((x: Json) => <ResultPreview yearLabel={x.year} school={x.school} detail={x.detail} />)} />, <MoreLink href="/results/" label="もっと見る" />]} />,
    <Section id="voices" eyebrow="Voices" title="生徒の声" content={[<VoicePreviews items={FM[HOME].voices.map((x: Json) => <VoicePreview quote={x.quote} author={x.author} school={x.school} />)} />, <MoreLink href="/voices/" label="もっと見る" />]} />,
    <Section id="faq" eyebrow="FAQ" title="よくある質問" content={[<Faq items={FM[HOME].faqItems.map((x: Json, i: number) => <FaqItem question={x.question} answer={x.answer} prefix="home-q" openFirst={false} index={i + 1} />)} />, <MoreLink href="/faq/" label="もっと見る" />]} />,
    cta(HOME),
  ];
  return page("", FM[HOME].title, FM[HOME].description, frame("/", body));
}

function lessons(): PrototypePage {
  const toc: [string, string][] = [["for-you", "受講をお勧めする方"], ["course", "授業内容"], ["pricing", "クラス価格"], ["consultation", "有料進路相談"], ["instructor", "講師紹介"], ["specializations", "専攻分野"], ["graduates", "美大卒の方へ"], ["knowledge", "受験について知る"]];
  const lists: string[][] = D.inlineLists[LESSONS];
  const grad = D.staticText[LESSONS].filter((x: Json) => x.tag === "p" && x.sourceLine >= 280 && !x.hasExpression).map((x: Json) => x.text as string);
  const body: Child[] = [
    head(LESSONS, "Lessons", "medium"),
    <Toc label="このページの内容" wide items={toc.map(([target, label], i) => <TocItem label={label} target={target} prefix="" index={i + 1} />)} />,
    <Section id="for-you" eyebrow="For You" title={txt(LESSONS, "このような方に")} content={[<Checklist items={FM[LESSONS].recommendedItems.map((x: string) => <ChecklistItem text={x} />)} />]} />,
    <Section
      id="course"
      eyebrow="Course"
      title={txt(LESSONS, "オンラインクラス授業内容")}
      content={[<Paragraphs paragraphs={[txt(LESSONS, "２ヶ月コースまたは")]} />, <CourseSteps items={componentProps(LESSONS, "InfoCard").map((x, i) => <CourseStep title={x.title} description={x.description} index={i + 1} />)} />]}
    />,
    <Section
      id="pricing"
      eyebrow="Pricing"
      title={txt(LESSONS, "オンラインクラス価格")}
      content={[
        <PriceDetail items={[<PriceDetailCard name="2ヶ月コース" price="¥50,000" note="税込 / 1ヶ月あたり25,000円" />, <PriceDetailCard name="4ヶ月コース" price="¥92,000" note="税込 / 1ヶ月あたり23,000円" />]} />,
        <Paragraphs paragraphs={[txt(LESSONS, "レッスンスケジュール"), txt(LESSONS, "引き続き受講"), txt(LESSONS, "お支払いは")]} />,
      ]}
    />,
    <Section
      id="consultation"
      eyebrow="Consultation"
      title={txt(LESSONS, "オンライン有料進路相談")}
      content={[<ConsultationIntro name="進路相談" price="¥10,000" note={txt(LESSONS, "税込 / 1時間半")} topicsTitle="面談で話す内容" topics={lists[0]!} faqTitle="よくある質問" faqTopics={lists[1]!} />]}
    />,
    <ArtWindow slot="middle" size="large" drift={-1} />,
    <Section
      id="instructor"
      eyebrow="Instructor"
      title="講師紹介"
      content={[
        <Instructor variant="lessons" {...INSTRUCTOR} subtitle="" bio={txt(LESSONS, "ドイツに10年間")} />,
        <Timeline variant="career" title="経歴" items={FM[LESSONS].careerTimeline.map((x: Json) => <TimelineEntry year={x.year} text={x.text} />)} />,
      ]}
    />,
    <Section
      id="specializations"
      eyebrow="Specializations"
      title={txt(LESSONS, "ドイツ美術大学 専攻")}
      content={[<SpecializationGrid items={FM[LESSONS].specializations.map((x: Json) => <Specialization de={x.de} ja={x.ja} />)} />, <SectionAfter content={[<Paragraphs paragraphs={[txt(LESSONS, "どの学科の")]} />]} />]}
    />,
    <GraduatesSection eyebrow="For Graduates" title={txt(LESSONS, "美大卒の方へ")} paragraphs={grad} />,
    <Section id="knowledge" eyebrow="Knowledge" title="ドイツ美大受験について知る" content={[<NoteCards editorial={false} items={FM[LESSONS].knowledgeCards.map((x: Json, i: number) => <NoteCard href={`/${x.href.replace(/^\//, "")}`} title={x.title} description={x.description} index={i + 1} />)} />]} />,
    cta(LESSONS),
  ];
  return page("lessons/", FM[LESSONS].title, FM[LESSONS].description, frame("/lessons/", body));
}

function about(): PrototypePage {
  const cv = (rows: string[]) =>
    rows.map((s) => {
      const [year, ...rest] = s.split("　");
      return <TimelineEntry year={year!} text={rest.join("　")} />;
    });
  const message = D.staticText[ABOUT].filter((x: Json) => x.tag === "p" && x.sourceLine >= 120 && !x.hasExpression).map((x: Json) => x.text as string);
  const body: Child[] = [
    head(ABOUT, "About", "small"),
    <Section id="" eyebrow="" title="" label="高津戸優子のプロフィール" content={[<Instructor variant="about" {...INSTRUCTOR} subtitle={txt(ABOUT, "1987年")} bio="" />]} />,
    <Section id="" eyebrow="" title="" content={[<TwoColumn columns={[<Timeline variant="cv" title="経歴" items={cv(FM[ABOUT].career)} />, <Timeline variant="cv" title="学歴" items={cv(FM[ABOUT].education)} />]} />]} />,
    <ArtWindow slot="middle" size="medium" />,
    <Message eyebrow="Message" title="メッセージ" paragraphs={message} />,
    <Section id="" eyebrow="Our lessons" title="レッスンの特長" content={[<FeatureGrid items={FM[ABOUT].features.map((x: Json) => <FeatureCard title={x.title} description={x.description} />)} />]} />,
    cta(ABOUT),
  ];
  return page("about/", FM[ABOUT].title, FM[ABOUT].description, frame("/about/", body));
}

function results(): PrototypePage {
  const years: Json[] = D.data.resultsData;
  const body: Child[] = [
    head(RESULTS, "Results", "small", FM[RESULTS].stats.map((x: Json) => <Stat number={x.number} label={x.label} />)),
    <ArchiveLayout
      tocLabel="年度から見る"
      toc={years.map((x, i) => <TocItem label={x.year} target={`year-${x.year}`} prefix="" index={i + 1} />)}
      body={years.map((year) => (
        <ResultsYearSection label={year.year} count={year.count} rows={year.entries.map((x: Json) => <ResultRow school={x.school} department={x.department} url={D.data.schoolUrls[x.school] ?? ""} />)} />
      ))}
    />,
    cta(RESULTS, false),
  ];
  return page("results/", FM[RESULTS].title, FM[RESULTS].description, frame("/results/", body));
}

function voices(): PrototypePage {
  const records: Json[] = D.data.voicesData;
  const body: Child[] = [
    head(VOICES, "Voices", "medium"),
    <StudentIndex items={records.map((x, i) => <StudentLink author={x.author} school={x.school} index={i + 1} />)} />,
    ...records.map((x, i) => <VoiceDetail author={x.author} yearLabel={x.year} school={x.school} department={x.department} quote={x.quote} artAfter={2} index={i + 1} />),
    cta(VOICES, false),
  ];
  return page("voices/", FM[VOICES].title, FM[VOICES].description, frame("/voices/", body));
}

function faqs(): PrototypePage {
  const categories: Json[] = D.data.faqData;
  const body: Child[] = [
    head(FAQ, "FAQ", "small"),
    <ArchiveLayout
      tocLabel="質問のカテゴリー"
      toc={categories.map((x, i) => <TocItem label={x.title} target="" prefix="faq-" index={i + 1} />)}
      body={categories.map((x, c) => (
        <FaqCategory title={x.title} index={c + 1} content={[<Faq items={x.items.map((q: Json, i: number) => <FaqItem question={q.question} answer={q.answer} prefix={`category-${c + 1}`} openFirst={c === 0} index={i + 1} />)} />]} />
      ))}
    />,
    cta(FAQ, false),
  ];
  return page("faq/", FM[FAQ].title, FM[FAQ].description, frame("/faq/", body));
}

const NOTE_ORDER = ["free-tuition", "what-is-mappe", "exam-schedule", "online-exam", "german-language"];

function notesIndex(): PrototypePage {
  const body: Child[] = [
    <PageHeading title="Notes" description="ドイツ美大受験に関する情報をまとめたノートです。" eyebrow="Notes" artSize="medium" />,
    <Section id="" eyebrow="" title="" label="ノート一覧" content={[<NoteCards editorial items={NOTE_ORDER.map((slug, i) => <NoteCard href={`/notes/${slug}/`} title={D.notes[slug].title} description={D.notes[slug].description} index={i + 1} />)} />]} />,
    <ArtWindow slot="closing" size="small" />,
  ];
  return page("notes/", "Notes - Pinsel", "ドイツ美大受験に関するノート・記事一覧", frame("/notes/", body));
}

function note(slug: string): PrototypePage {
  const x = D.notes[slug];
  const pathname = `/notes/${slug}/`;
  const body: Child[] = [
    <ArticleHeading title={x.title} description={x.description} eyebrow="Pinsel Notes" slug={slug} parentLabel="Notes" parentHref="/notes/" />,
    <ArticleLayout
      markdown={x.body}
      contentsLabel="Contents"
      allNotesLabel="All Notes"
      related={Object.keys(D.notes).map((key) => <RelatedNote href={`/notes/${key}/`} title={D.notes[key].title} route={{ pathname }} />)}
    />,
    <ArtWindow slot="closing" size="small" />,
  ];
  return page(`notes/${slug}/`, `${x.title} - Pinsel Notes`, x.description, frame(pathname, body));
}

function contact(): PrototypePage {
  const c = D.contact;
  const meta = FM[CONTACT];
  const body: Child[] = [
    head(CONTACT, "Contact", "ribbon"),
    <ContactLayout
      stepsTitle="お申し込みの流れ"
      steps={meta.steps.map((x: Json, i: number) => <Step title={x.title} description={x.description} index={i + 1} />)}
      panel={[
        <ContactForm
          formAriaLabel="お問い合わせフォーム"
          errorMessage={c.error}
          nameLabel="お名前"
          emailLabel="メールアドレス"
          courseLabel="ご希望のコース"
          courseUndecidedOption={c.courseOptions[0]}
          messageLabel="ご相談内容"
          requiredLabel={c.requiredLabel}
          optionalLabel="任意"
          submitLabel={c.button}
          submittingLabel={c.submitting}
          valueMissingMessage="{label}を入力してください。"
          emailFormatMessage="メールアドレスの形式をご確認ください。"
          previewNotice="デザイン確認用のプレビューです。入力内容は送信されません。"
          successPreviewEyebrow="送信完了画面 · プレビュー"
          successTitle={c.successTitle}
          successBody={c.successBody}
          successPreviewNotice="プレビューのため、実際のお問い合わせは送信されていません。"
          backLabel="入力画面に戻る"
          courseOptions={c.courseOptions.slice(1).map((label: string) => CourseOption({ label }))}
        />,
      ]}
    />,
    <LegalTable summary="特定商取引法に基づく表記" rows={meta.tokushoho.map((x: Json) => LegalRow({ term: x.key, value: x.value }))} />,
    <ArtWindow slot="closing" size="medium" />,
  ];
  return page("contact/", meta.title, meta.description, frame("/contact/", body));
}

function notFound(): PrototypePage {
  const s = "src/pages/404.astro";
  return page("404.html", "ページが見つかりません - Pinsel", "", frame("/404.html", [<NotFound title={plain(s, "h1")[0]!} body={plain(s, "p")[0]!} linkLabel="トップページに戻る" />]));
}

export function prototypePages(render: (child: Child) => string): PrototypePage[] {
  renderDocument = (pathname, title, description, body) =>
    render(
      <DocumentShell pathname={pathname} title={title} description={description} robots="noindex,nofollow">
        {body}
      </DocumentShell>,
    );
  return [home(), lessons(), about(), results(), voices(), faqs(), notesIndex(), ...Object.keys(D.notes).map(note), contact(), notFound()];
}
