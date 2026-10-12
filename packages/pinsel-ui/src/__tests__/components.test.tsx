import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToString } from "@takazudo/zfb/zudo-react/server";

import { ArchiveLayout } from "../archive-layout/archive-layout";
import { ArticleHeading } from "../article-heading/article-heading";
import { ArticleLayout, RelatedNote } from "../article-layout/article-layout";
import { ART_SOURCES } from "../art-window/art-sources";
import { ArtWindow } from "../art-window/art-window";
import { Breadcrumb } from "../breadcrumb/breadcrumb";
import { ContactForm, CourseOption } from "../contact-form/contact-form";
import { ContactLayout, Step } from "../contact-layout/contact-layout";
import { Cta, ctaHeadingLines, ctaRemainder } from "../cta/cta";
import { DocumentShell } from "../document/document-shell";
import { Faq, FaqCategory, FaqItem } from "../faq/faq";
import { GraduatesSection } from "../graduates-section/graduates-section";
import { Hero } from "../hero/hero";
import { ICON_NAMES, Icon } from "../icon/icon";
import { Instructor } from "../instructor/instructor";
import { LegalRow, LegalTable } from "../legal-table/legal-table";
import { NotFound } from "../not-found/not-found";
import { NoteCard, NoteCards } from "../note-cards/note-cards";
import { PageHeading, Stat } from "../page-heading/page-heading";
import { Paragraphs } from "../paragraphs/paragraphs";
import { ResultRow, ResultsYearSection } from "../results-year/results-year";
import { Section } from "../section/section";
import { formatCopyright } from "../site-footer/site-footer";
import { SiteFrame } from "../site-frame/site-frame";
import { StudentIndex, StudentLink } from "../student-index/student-index";
import { Timeline, TimelineEntry } from "../timeline/timeline";
import { Toc, TocItem } from "../toc/toc";
import { ButtonLink, TextLink } from "../text-link/text-link";
import { VoiceDetail } from "../voice-detail/voice-detail";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "../..");
const FRAME = { brandWord: "Pinsel", brandSub: "ART STUDY IN GERMANY", instagramLabel: "yuko_takatsudo", copyright: "© 2015–{year} Pinsel Germany. All rights reserved.", backToTopLabel: "ページの先頭へ" };
const INSTRUCTOR = { name: "高津戸 優子", latinName: "Yuko Takatsudo", subtitle: "東京芸大卒 / ミュンヘン芸術アカデミー修了", bio: "紹介文", portraitAlt: "高津戸 優子", detailLabel: "詳しく見る", detailHref: "/about/", instagramLabel: "Instagram" };

describe("Icon", () => {
  it("draws all eighteen names of the approved icons.py as decorative 24px currentColor icons", () => {
    expect(ICON_NAMES).toHaveLength(18);
    for (const name of ICON_NAMES) {
      const html = renderToString(<Icon name={name} />);
      expect(html).toMatch(new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" class="ui-icon ui-icon--${name}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`));
    }
  });
});

describe("links", () => {
  it("puts the mail icon on contact buttons and the up-right arrow on external targets", () => {
    expect(renderToString(<ButtonLink href="/contact/" label="お問い合わせ" primary />)).toMatch(/^<a class="button button--primary" href="\/contact\/"><span class="button__label"><svg[^>]*ui-icon--mail/);
    expect(renderToString(<ButtonLink href="/lessons/" label="x" />)).toContain("ui-icon--arrow-right button__arrow");
    const external = renderToString(<TextLink href="https://www.instagram.com/yuko_takatsudo" label="Instagram" />);
    expect(external).toContain("ui-icon--instagram");
    expect(external).toContain("ui-icon--arrow-up-right");
  });
});

describe("SiteFrame", () => {
  it("renders the nav slots in place of the literals and stamps the copyright year", () => {
    const html = renderToString(<SiteFrame {...FRAME} route={{ pathname: "/contact/" }} headerNav={[<a class="site-nav__item" href="/x/">X</a>]} footerNav={[<li>F</li>]} main={["m"]} />);
    expect(html.match(/class="site-nav__item"/g)).toHaveLength(1);
    expect(html).toContain('<ul class="footer-nav"><li>F</li></ul>');
    expect(html).toContain('<a class="site-nav__contact button--primary" href="/contact/" aria-current="page">');
    expect(html).toContain("お問い合わせ</span>");
    expect(html).toContain(`<p>© 2015–${new Date().getUTCFullYear()} Pinsel Germany. All rights reserved.</p>`);
    expect(formatCopyright("© 2015–{year}", new Date("2031-05-01T00:00:00Z"))).toBe("© 2015–2031");
  });

  it("keeps the approved literals when the slots are empty", () => {
    const html = renderToString(<SiteFrame {...FRAME} route={{ pathname: "/notes/free-tuition/" }} />);
    expect(html.match(/class="site-nav__item"/g)).toHaveLength(6);
    expect(html).toContain('<a class="site-nav__item" href="/notes/" aria-current="page">Notes</a>');
    expect(html.match(/<li><a href="\//g)).toHaveLength(7);
    expect(html).toContain('<a class="footer-instagram" href="https://www.instagram.com/yuko_takatsudo" target="_blank" rel="noopener noreferrer">');
  });
});

describe("DocumentShell", () => {
  it("renders the approved head and the client-script slot last in <head>", () => {
    const html = renderToString(
      <DocumentShell pathname="/faq/" title="よくある質問 - Pinsel" description="d" robots="noindex,nofollow" scripts={<script type="module" src="/assets/client/site.js"></script>}>
        <main id="main" tabindex={-1}>x</main>
      </DocumentShell>,
    );
    expect(html).toMatch(/^<html lang="ja" id="top" data-motion="off"><head><meta charset="utf-8">/);
    expect(html).toContain('<meta name="theme-color" content="#f2f5ee">');
    expect(html).toContain('<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/fonts/fonts.css"><script type="module" src="/assets/client/site.js"></script></head>');
    expect(html).toContain('<body class="page-faq">');
  });
});

describe("ArtWindow", () => {
  it("swaps the pigments, sets the parallax hooks and the aspect rule", () => {
    const hero = renderToString(<ArtWindow slot="hero" size="hero" />);
    expect(hero).toMatch(/^<div class="art-window art-window--hero" aria-hidden="true" data-parallax="" data-drift="1" data-motion-range="52"><svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice" /);
    for (const pigment of ["back", "wash", "current"]) expect(hero).toContain(`data-pigment="${pigment}" fill="var(--art-${pigment}, #`);
    expect(hero).not.toMatch(/fill="#(?:B8C4B6|9EBFBB|60767D)"/);
    expect(hero.match(/data-depth="/g)).toHaveLength(3);
    const shallow = renderToString(<ArtWindow slot="hero" size="small" drift={-1} />);
    expect(shallow).toMatch(/data-drift="-1" data-motion-range="8"><svg aria-hidden="true" focusable="false" preserveAspectRatio="none" [^>]*viewBox="0 0 1440 220"/);
    expect(renderToString(<ArtWindow slot="closing" size="medium" />)).toContain('preserveAspectRatio="none"');
  });

  it("gives two windows of the same slot disjoint ids and self-consistent mask references", () => {
    const html = renderToString(
      <>
        <ArtWindow slot="middle" size="large" />
        <ArtWindow slot="middle" size="medium" drift={-1} />
      </>,
    );
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    const references = [...html.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]!);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) expect(ids).toContain(reference);
    const twice = renderToString(
      <>
        <ArtWindow slot="closing" size="small" instance="a" />
        <ArtWindow slot="closing" size="small" instance="b" />
      </>,
    );
    const twiceIds = [...twice.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
    expect(new Set(twiceIds).size).toBe(twiceIds.length);
  });

  it("inlines the approved SVG files byte for byte", () => {
    for (const [name, svg] of Object.entries(ART_SOURCES)) {
      expect(svg).toBe(readFileSync(path.join(pkg, `src/art/water-paper-${name}.svg`), "utf8"));
    }
  });
});

describe("page blocks", () => {
  it("Section drops the heading without a title and keeps the instructor layout class", () => {
    expect(renderToString(<Section id="" eyebrow="" title="" label="プロフィール" content={["x"]} />)).toBe('<section class="section container reading-zone" aria-label="プロフィール">x</section>');
    expect(renderToString(<Section id="instructor" eyebrow="Instructor" title="講師紹介" layout="instructor" intro="i" />)).toBe(
      '<section class="section container instructor-layout reading-zone" id="instructor"><div class="section-heading"><div><p class="eyebrow">Instructor</p><h2>講師紹介</h2></div><p class="section-heading__intro">i</p></div></section>',
    );
  });

  it("Hero renders the h1 lines, joins the lead and carries the hero art", () => {
    const html = renderToString(<Hero label="l" titleLines={["あなただけの", "個別指導で。"]} lead={"一行目\n二行目"} primaryLabel="オンラインクラス" primaryHref="/lessons/" pricingLabel="コースと料金" pricingHref="#pricing" />);
    expect(html).toContain('<h1 id="hero-title"><span>あなただけの</span><span>個別指導で。</span></h1>');
    expect(html).toContain("<p>一行目二行目</p>");
    expect(html).toContain('<a class="text-link" href="#pricing">');
    expect(html).toContain("art-window--hero");
  });

  it("Instructor renders the three variants with the modest portrait", () => {
    const home = renderToString(<Instructor variant="home" {...INSTRUCTOR} />);
    expect(home).toContain('<img src="/assets/instructor-yuko.jpg" alt="高津戸 優子" width="600" height="902" loading="lazy">');
    expect(home).toContain('<p class="instructor__subtitle">');
    expect(home).toContain('<div class="instructor__bio"><p>紹介文</p></div><a class="text-link" href="/about/">');
    const lessons = renderToString(<Instructor variant="lessons" {...INSTRUCTOR} />);
    expect(lessons).not.toContain("instructor__subtitle");
    const about = renderToString(<Instructor variant="about" {...INSTRUCTOR} subtitle="1987年 東京生まれ" />);
    expect(about).toMatch(/^<div class="instructor instructor--about">/);
    expect(about).toContain('<div class="instructor__bio"><a class="text-link" href="https://www.instagram.com/yuko_takatsudo">');
    expect(about).not.toContain('href="/about/"');
  });

  it("FAQ items take their id from the list position and open only the first when asked", () => {
    const html = renderToString(
      <Faq items={[<FaqItem question="Q1" answer="A1" prefix="category-1" openFirst position={{ index: 1, count: 2 }} />, <FaqItem question="Q2" answer="A2" prefix="category-1" openFirst position={{ index: 2, count: 2 }} />]} />,
    );
    expect(html).toContain('<details id="category-1-1" open><summary><span class="faq-list__q" aria-hidden="true">Q.</span><span>Q1</span>');
    expect(html).toContain('<details id="category-1-2"><summary>');
    expect(html).toContain('<div class="faq-list__answer"><span aria-hidden="true">A.</span><p>A2</p></div>');
    expect(renderToString(<FaqCategory title="受験について" position={{ index: 3, count: 4 }} />)).toBe('<section class="faq-category reading-zone" id="faq-3"><h2>受験について</h2></section>');
  });

  it("Toc numbers its items and links positional targets", () => {
    const html = renderToString(<Toc label="質問のカテゴリー" wide={false} items={[<TocItem label="受験" target="" prefix="faq-" position={{ index: 2, count: 4 }} />]} />);
    expect(html).toContain('<nav class="page-toc" aria-label="質問のカテゴリー"><p class="eyebrow"><svg');
    expect(html).toContain('<li><a href="#faq-2"><span aria-hidden="true">02</span>受験</a></li>');
    expect(renderToString(<Toc label="このページの内容" wide items={[]} />)).toContain('class="page-toc page-toc--wide container"');
  });

  it("ArchiveLayout puts the TOC in the aside rail", () => {
    expect(renderToString(<ArchiveLayout tocLabel="年度から見る" toc={[]} body={["b"]} />)).toMatch(/^<div class="container archive-layout"><aside><nav class="page-toc" aria-label="年度から見る">.*<\/nav><\/aside><div class="archive-body">b<\/div><\/div>$/);
  });

  it("Cta breaks the approved heading and drops the repeated opening sentence", () => {
    expect(ctaHeadingLines("まずはお気軽にご相談ください。")).toEqual(["まずはお気軽に", "ご相談ください。"]);
    expect(ctaRemainder("まずはお気軽にご相談ください。", "まずはお気軽にご相談ください。初回は無料です。")).toBe("初回は無料です。");
    const html = renderToString(<Cta heading="まずはお気軽にご相談ください。" subCopy="まずはお気軽にご相談ください。残り" buttonLabel="お問い合わせ" large={false} />);
    expect(html).toContain('<h2>まずはお気軽に<br>ご相談ください。</h2></div><div class="closing__action"><p>残り</p><a class="button button--primary" href="/contact/">');
    expect(html).toContain("art-window--small");
  });

  it("PageHeading splits the lessons title and renders the results stats", () => {
    const html = renderToString(<PageHeading title="ドイツ美大受験オンラインクラス" description="d" eyebrow="Lessons" artSize="medium" stats={[<Stat number="123+" label="合格実績" />]} />);
    expect(html).toMatch(/^<nav class="breadcrumb container" aria-label="パンくずリスト">/);
    expect(html).toContain("<h1><span>ドイツ美大受験</span><span>オンラインクラス</span></h1>");
    expect(html).toContain('<div class="page-heading__description"><p>d</p><div class="stats"><p><strong>123+</strong><span>合格実績</span></p></div></div>');
    expect(html).toContain('art-window--medium" aria-hidden="true" data-parallax="" data-drift="1" data-motion-range="8"');
    expect(renderToString(<PageHeading title="t" description="" eyebrow="e" artSize="none" />)).not.toContain("art-window");
  });

  it("Breadcrumb marks the current page", () => {
    const html = renderToString(<Breadcrumb label="記事" parentLabel="Notes" parentHref="/notes/" />);
    expect(html).toContain('<li><svg');
    expect(html).toContain('<a href="/notes/">Notes</a></li><li aria-current="page">');
  });

  it("Results year rows link out with noopener and keep school and department together", () => {
    const html = renderToString(
      <ResultsYearSection label="2025年度" count={12} rows={[<ResultRow school="ベルリン芸術大学" department="Design" url="https://www.udk-berlin.de/" />, <ResultRow school="x" department="y" url="" />]} />,
    );
    expect(html).toMatch(/^<section class="year-section reading-zone" id="year-2025年度"><h2>2025年度<span>（12件）<\/span><\/h2><ul>/);
    expect(html).toContain('<li class="result-row"><a href="https://www.udk-berlin.de/" target="_blank" rel="noopener noreferrer"><div><p>ベルリン芸術大学</p><p>Design</p></div><svg');
    expect(html).toContain('<li class="result-row"><div><p>x</p><p>y</p></div></li>');
  });

  it("Voices link the index to positional articles and place the art after the second", () => {
    expect(renderToString(<StudentIndex items={[<StudentLink author="Rさん" school="s" position={{ index: 1, count: 5 }} />]} />)).toBe(
      '<nav class="container student-index" aria-label="生徒の声から選ぶ"><a href="#student-1"><strong>Rさん</strong><span>s</span></a></nav>',
    );
    const second = renderToString(<VoiceDetail author="K" yearLabel="2024" school="s" department="d" quote={"一\n二"} artAfter={2} position={{ index: 2, count: 5 }} />);
    expect(second).toContain('<article class="container voice-detail reading-zone" id="student-2">');
    expect(second).toContain("<blockquote><p>一</p><p>二</p></blockquote></article><div class=\"art-window art-window--medium\"");
    expect(second).toContain('data-drift="-1"');
    expect(renderToString(<VoiceDetail author="K" yearLabel="" school="" department="" quote="q" artAfter={2} position={{ index: 3, count: 5 }} />)).not.toContain("art-window");
  });

  it("Timeline variants", () => {
    const items = [<TimelineEntry year="2015" text="t" />];
    expect(renderToString(<Timeline variant="plain" title="" items={items} />)).toBe('<ol class="timeline"><li><span class="timeline__year">2015</span><p>t</p></li></ol>');
    expect(renderToString(<Timeline variant="cv" title="経歴" items={items} />)).toMatch(/^<div><h2 class="cv-heading">経歴<\/h2><ol class="timeline">/);
    expect(renderToString(<Timeline variant="career" title="経歴" items={items} />)).toMatch(/^<div class="section-after"><h3 class="lesson-career-title">経歴<\/h3><ol class="timeline">/);
  });

  it("GraduatesSection carries the decorative R7-10 illustration", () => {
    const html = renderToString(<GraduatesSection eyebrow="For Graduates" title="美大卒の方へ" paragraphs={["p1", "p2"]} />);
    expect(html).toContain('id="graduates"');
    expect(html).toContain('<div class="graduate-content" data-illustrated="10"><div class="prose"><p>p1</p><p>p2</p></div><figure class="graduate-illustration" aria-hidden="true"><img src="/assets/illustrations/10-form-through-dialogue.png" alt="" width="1254" height="1254" loading="lazy" decoding="async"></figure></div>');
  });

  it("Paragraphs splits a long text on blank lines", () => {
    expect(renderToString(<Paragraphs text={"一\n\n二"} paragraphs={["三"]} />)).toBe('<div class="prose"><p>一</p><p>二</p><p>三</p></div>');
  });

  it("NoteCards numbers the cards", () => {
    expect(renderToString(<NoteCards editorial items={[<NoteCard href="/notes/a/" title="t" description="d" position={{ index: 1, count: 1 }} />]} />)).toMatch(
      /^<div class="note-grid note-grid--editorial"><a class="note-card" href="\/notes\/a\/"><span class="note-card__index" aria-hidden="true">01<\/span><div><h3>t<\/h3><p>d<\/p><\/div><svg[^>]*note-card__arrow/,
    );
  });

  it("ArticleHeading phrases the free-tuition title and ArticleLayout builds Contents from the h2s", () => {
    expect(renderToString(<ArticleHeading title="ドイツの美大は学費が無料" description="d" eyebrow="Pinsel Notes" slug="free-tuition" parentLabel="Notes" parentHref="/notes/" />)).toContain(
      '<h1><span class="title-phrase">ドイツの美大は</span><span class="title-phrase">学費が無料</span></h1>',
    );
    const html = renderToString(
      <ArticleLayout markdown={"前文\n\n## 一つ目\n\n本文 [お問い合わせ](/contact/)\n\n## 二つ目"} contentsLabel="Contents" allNotesLabel="All Notes" related={[<RelatedNote href="/notes/a/" title="A" route={{ pathname: "/notes/a/" }} />, <RelatedNote href="/notes/b/" title="B" route={{ pathname: "/notes/a/" }} />]} />,
    );
    expect(html).toContain('<li><a href="#section-1"><span aria-hidden="true">01</span>一つ目</a></li><li><a href="#section-2"><span aria-hidden="true">02</span>二つ目</a></li>');
    expect(html).toContain('<h2 id="section-2">二つ目</h2>');
    expect(html).toContain('<section class="article-related" aria-label="すべてのノート"><h2>All Notes</h2><ul class="simple-list"><li><span aria-current="page">A</span></li><li><a class="text-link" href="/notes/b/">');
  });

  it("NotFound renders the 404 block and closing art", () => {
    const html = renderToString(<NotFound title="ページが見つかりません" body="b" linkLabel="トップページに戻る" />);
    expect(html).toMatch(/^<section class="container not-found reading-zone"><p class="not-found__number" aria-hidden="true">404<\/p><h1>ページが見つかりません<\/h1><p>b<\/p><a class="button" href="\/">/);
    expect(html).toContain("art-window--medium");
  });
});

describe("contact", () => {
  const LABELS = {
    formAriaLabel: "お問い合わせフォーム",
    errorMessage: "送信に失敗しました。",
    nameLabel: "お名前",
    emailLabel: "メールアドレス",
    courseLabel: "ご希望のコース",
    courseUndecidedOption: "未定",
    messageLabel: "ご相談内容",
    requiredLabel: "必須",
    optionalLabel: "任意",
    submitLabel: "送信する",
    submittingLabel: "送信中...",
    valueMissingMessage: "{label}を入力してください。",
    emailFormatMessage: "メールアドレスの形式をご確認ください。",
    previewNotice: "デザイン確認用のプレビューです。入力内容は送信されません。",
    successPreviewEyebrow: "送信完了画面 · プレビュー",
    successTitle: "送信ありがとうございます",
    successBody: "b",
    successPreviewNotice: "プレビューのため、実際のお問い合わせは送信されていません。",
    backLabel: "入力画面に戻る",
  };

  it("keeps every hook the visitor script needs and the approved option order", () => {
    const html = renderToString(<ContactForm {...LABELS} courseOptions={["有料進路相談", "2ヶ月コース", "4ヶ月コース"].map((label) => CourseOption({ label }))} />);
    for (const hook of [
      '<form id="contact-form" class="contact-form" novalidate aria-label="お問い合わせフォーム" data-submitting-label="送信中..." data-value-missing-message="{label}を入力してください。" data-email-format-message="メールアドレスの形式をご確認ください。">',
      '<p class="form-error" role="alert" data-form-error="" hidden>送信に失敗しました。</p>',
      '<label for="name">お名前<span>必須</span></label><input id="name" name="name" type="text" autocomplete="name" required><p class="form-error" id="name-error" hidden></p>',
      '<input id="email" name="email" type="email" autocomplete="email" required>',
      '<label for="course">ご希望のコース<span>任意</span></label><select id="course" name="course"><option value="未定">未定</option><option value="有料進路相談">有料進路相談</option><option value="2ヶ月コース">2ヶ月コース</option><option value="4ヶ月コース">4ヶ月コース</option></select>',
      '<textarea id="message" name="message" rows="6" required></textarea>',
      '<span data-submit-label="">送信する</span>',
      '<div class="form-success" tabindex="-1" hidden>',
      '<button type="button" class="button" data-form-back="">入力画面に戻る</button>',
    ]) {
      expect(html).toContain(hook);
    }
    expect(html).not.toMatch(/<form[^>]*action|method=/);
  });

  it("numbers the application steps and keeps the legal table closed", () => {
    expect(renderToString(<ContactLayout stepsTitle="お申し込みの流れ" steps={[<Step title="t" description="d" position={{ index: 1, count: 5 }} />]} panel={["p"]} />)).toBe(
      '<div class="container contact-layout"><aside class="contact-aside"><h2>お申し込みの流れ</h2><ol class="step-flow"><li><span class="step-flow__number" aria-hidden="true">01</span><div><h3>t</h3><p>d</p></div></li></ol></aside>p</div>',
    );
    const legal = renderToString(<LegalTable summary="特定商取引法に基づく表記" rows={[LegalRow({ term: "販売業者", value: "Pinsel" })]} />);
    expect(legal).toBe('<section class="container"><details class="legal" id="legal"><summary>特定商取引法に基づく表記</summary><table><tbody><tr><th scope="row">販売業者</th><td>Pinsel</td></tr></tbody></table></details></section>');
  });
});

describe("source hygiene", () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(full);
      return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".generated.ts") ? [full] : [];
    });

  it("uses zudo-react spellings and no scripts outside the document shell slot", () => {
    for (const file of sources(path.join(pkg, "src"))) {
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(/\bclassName\b|\bonClick\b|dangerouslySetInnerHTML|\bhtmlFor\b/);
      if (!file.endsWith("document-shell.tsx")) expect(code, file).not.toMatch(/<script/);
    }
  });

  it("declares only custom properties in the two token files", () => {
    for (const name of ["tokens.css", "colors.css"]) {
      const css = readFileSync(path.join(pkg, "styles", name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const block = /^\s*:root\s*\{([\s\S]*)\}\s*$/.exec(css);
      expect(block, name).not.toBeNull();
      const declarations = block![1]!.split(";").map((declaration) => declaration.trim()).filter(Boolean);
      expect(declarations.length, name).toBeGreaterThan(0);
      for (const declaration of declarations) expect(declaration, name).toMatch(/^--[a-z0-9-]+\s*:/);
    }
  });

  it("keeps the approved state selectors and breakpoints and drops the dead ones", () => {
    const css = readFileSync(path.join(pkg, "styles/components.css"), "utf8");
    expect(css).toContain("@layer tokens, reset, layout, components, responsive;");
    for (const selector of [
      ".menu-toggle[aria-expanded=true]",
      ".motion-toggle[aria-pressed=true]",
      ".site-nav[data-open]",
      ".site-nav a[aria-current]::after",
      ".page-toc a[aria-current=location]",
      ".faq-list details[open]",
      ".form-field [aria-invalid=true]",
      "[hidden] { display: none !important; }",
      ":focus-visible",
      "scroll-padding-block-start: calc(var(--header-offset) + 1.5rem)",
      "container: site-header / inline-size",
    ]) {
      expect(css, selector).toContain(selector);
    }
    for (const query of ["@container site-header (max-width:70rem)", "(max-width:70rem)", "(max-width:74rem)", "(max-width:64rem)", "(max-width:47.99rem)", "(max-width:23rem)", "(min-width:100rem)", "(prefers-reduced-motion:reduce)", "@media print", "(hover:hover)"]) {
      expect(css.replace(/\s+/g, ""), query).toContain(query.replace(/\s+/g, ""));
    }
    expect(css).not.toMatch(/\.jump-row|\.motion-toggle__mark|page-404/);
  });
});
