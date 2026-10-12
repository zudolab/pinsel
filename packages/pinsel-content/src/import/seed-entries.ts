import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "@zudo-composer/component-contract";
import type { ContentEntryRecord, ContentModelRecord } from "zudo-composer/site-project";

import { seedEntryId } from "../import-rules";
import { NOTE_INDEX_ORDER, NOTE_SLUGS, PAGE_COPY_IDS, navLinkId, resultYearId } from "../invariants";
import { MODEL_TIMESTAMP, PINSEL_CONTENT_PROVIDER_ID, fieldId } from "../models/define";

// Builds one Content entry per approved record straight from the immutable
// seed fixture (content.json) plus the copy the approved prototype hard-codes
// in build.py / ui.py. `scripts/content/import-seed.mjs` writes these to
// content/entries; the tests use them as the reference data.

const here = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = resolve(here, "../../../../tests/fixtures/approved-seed");

export function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), "utf8")) as T;
}

interface SeedContent {
  frontmatter: Record<string, Record<string, JsonValue>>;
  notes: Record<string, { title: string; description: string; body: string }>;
  data: {
    faqData: { title: string; items: { question: string; answer: string }[] }[];
    resultsData: { year: string; count: number; entries: { school: string; department: string }[] }[];
    schoolUrls: Record<string, string>;
    voicesData: { author: string; year: string; school: string; department: string; quote: string }[];
  };
  staticText: Record<string, { tag: string; text: string; hasExpression: boolean; sourceLine: number }[]>;
  componentProps: Record<string, { component: string; props: Record<string, JsonValue> }[]>;
  inlineLists: Record<string, string[][]>;
  contact: {
    courseOptions: string[];
    fields: { name: string; label: string; required: boolean }[];
    requiredLabel: string;
    button: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    error: string;
  };
}

export function ref(modelId: string, recordId: string): JsonValue {
  return { providerId: PINSEL_CONTENT_PROVIDER_ID, modelId, recordId };
}

export function makeEntry(model: ContentModelRecord, id: string, valuesByKey: Record<string, JsonValue>): ContentEntryRecord {
  for (const key of Object.keys(valuesByKey)) {
    if (!model.document.fields.some((candidate) => candidate.key === key)) throw new Error(`${model.id} has no field "${key}"`);
  }
  // Canonical key order: the model's field order, so every entry file is byte-stable.
  const values: Record<string, JsonValue> = {};
  for (const field of model.document.fields) {
    if (field.key in valuesByKey) values[fieldId(model.id, field.key)] = valuesByKey[field.key]!;
  }
  return {
    schemaVersion: 1,
    id,
    modelId: model.id,
    createdAt: MODEL_TIMESTAMP,
    updatedAt: MODEL_TIMESTAMP,
    values,
    lifecycle: "published",
    generation: 0,
  };
}

/** List copy is stored one item per line; an item that itself contains a newline would be split, so refuse it. */
export function lines(items: readonly string[]): string {
  for (const item of items) if (item.includes("\n")) throw new Error(`list item contains a newline: ${item}`);
  return items.join("\n");
}

const HOME = "src/pages/index.astro";
const LESSONS = "src/pages/lessons/index.astro";
const ABOUT = "src/pages/about/index.astro";
const RESULTS = "src/pages/results/index.astro";
const VOICES = "src/pages/voices/index.astro";
const FAQ = "src/pages/faq/index.astro";
const CONTACT = "src/pages/contact/index.astro";
const NOTES = "src/pages/notes/index.astro";
const NOT_FOUND = "src/pages/404.astro";

export function buildSeedEntries(models: readonly ContentModelRecord[]): ContentEntryRecord[] {
  const seed = readFixture<SeedContent>("content.json");
  const model = (id: string) => {
    const found = models.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`model ${id} missing`);
    return found;
  };
  const plain = (source: string, tag?: string) =>
    seed.staticText[source]!.filter((row) => !row.hasExpression && (tag === undefined || row.tag === tag)).map((row) => row.text);
  const txt = (source: string, prefix: string) => {
    const rows = plain(source).filter((text) => text.startsWith(prefix));
    if (rows.length !== 1) throw new Error(`${source} ${prefix}: ${rows.length} matches`);
    return rows[0]!;
  };
  const props = (source: string, component: string) =>
    seed.componentProps[source]!.filter((row) => row.component === component).map((row) => row.props);
  const fm = (source: string) => seed.frontmatter[source]!;
  const str = (value: JsonValue | undefined) => value as string;

  const entries: ContentEntryRecord[] = [];
  const hero = plain("components/hero-section/hero-section.astro", "p");
  const pricingNote = plain("components/pricing-section/pricing-section.astro", "p")[0]!;
  const teacher = props(HOME, "InstructorProfile")[0]!;
  const stats = fm(RESULTS).stats as { number: string; label: string }[];

  entries.push(
    makeEntry(model("site-copy"), "site-copy", {
      brandWord: "Pinsel",
      brandSub: "ART STUDY IN GERMANY",
      heroLabel: hero[0]!,
      heroTitleLines: lines(["あなただけの", "ドイツ美大受験準備を", "個別指導で。"]),
      heroLead: hero[2]!.split("\n").filter(Boolean).join("\n"),
      heroPrimaryLabel: "オンラインクラス",
      heroPricingLabel: "コースと料金",
      heroMetaLine: "完全マンツーマン・オンライン",
      heroIntro: txt(HOME, "初心者の方も"),
      forYouTitle: "こんな方へ",
      pricingTitle: "コースと料金",
      pricingNote,
      pricingMoreLabel: str(props(HOME, "MoreLinkButton")[0]!.text),
      instructorTitle: "講師紹介",
      instructorDetailLabel: plain("components/instructor-profile/instructor-profile.astro", "a")[0]!,
      resultsTitle: "合格実績",
      voicesTitle: "生徒の声",
      faqTitle: "よくある質問",
      moreLabel: str(props(HOME, "Carousel")[0]!.moreText),
      ctaTitle: plain("components/cta-section/cta-section.astro", "p")[1]!,
      ctaButtonLabel: str(props(HOME, "CtaSection")[0]!.text),
      statsResultsNumber: stats[0]!.number,
      statsResultsLabel: stats[0]!.label,
      statsSchoolsNumber: stats[1]!.number,
      statsSchoolsLabel: stats[1]!.label,
      notesIndexTitle: str(props(NOTES, "PageHeader")[0]!.title),
      notesIndexDescription: str(props(NOTES, "PageHeader")[0]!.description),
      noteEyebrow: "Pinsel Notes",
      allNotesLabel: "All Notes",
      contentsLabel: "Contents",
      notFoundTitle: plain(NOT_FOUND, "h1")[0]!,
      notFoundBody: plain(NOT_FOUND, "p")[0]!,
      notFoundLinkLabel: plain(NOT_FOUND, "a")[0]!,
      footerInstagramLabel: "yuko_takatsudo",
      footerCopyright: "© 2015–2026 Pinsel Germany. All rights reserved.",
      backToTopLabel: "ページの先頭へ",
    }),
  );

  const pageMeta = (source: string) => ({ metaTitle: str(fm(source).title), metaDescription: str(fm(source).description) });
  const header = (source: string) => {
    const page = props(source, "PageHeader")[0]!;
    return { headerTitle: str(page.title), headerDescription: str(page.description ?? fm(source).description) };
  };
  const cta = (source: string) => ({ ctaSubCopy: str(props(source, "CtaSection")[0]!.subCopy) });
  const pageCopy: Record<string, Record<string, JsonValue>> = {
    "/": { ...pageMeta(HOME), ...cta(HOME) },
    "/lessons/": { ...pageMeta(LESSONS), ...header(LESSONS), ...cta(LESSONS) },
    "/about/": { ...pageMeta(ABOUT), ...header(ABOUT), ...cta(ABOUT) },
    "/results/": { ...pageMeta(RESULTS), ...header(RESULTS), asideLabel: "年度から見る", ...cta(RESULTS) },
    "/voices/": { ...pageMeta(VOICES), ...header(VOICES), ...cta(VOICES) },
    "/faq/": { ...pageMeta(FAQ), ...header(FAQ), asideLabel: "質問のカテゴリー", ...cta(FAQ) },
    "/notes/": { metaTitle: "Notes - Pinsel", metaDescription: "ドイツ美大受験に関するノート・記事一覧" },
    "/contact/": { ...pageMeta(CONTACT), ...header(CONTACT) },
    "/404.html": { metaTitle: str(props(NOT_FOUND, "BaseLayout")[0]!.title) },
  };
  Object.entries(PAGE_COPY_IDS).forEach(([route, id], index) => {
    entries.push(makeEntry(model("page-copy"), id, { route, ...pageCopy[route]!, order: index + 1 }));
  });

  const footerLinks = fm("components/site-footer/site-footer.astro").navLinks as { label: string; title: string; description: string; href: string }[];
  const headerLabels: Record<string, string> = { "/notes/": "Notes" };
  footerLinks.forEach((link, index) => {
    entries.push(
      makeEntry(model("nav-link"), navLinkId(link.href), {
        href: link.href,
        label: link.label,
        headerLabel: headerLabels[link.href] ?? link.title,
        footerTitle: link.title,
        footerDescription: link.description,
        order: index + 1,
      }),
    );
  });

  const lists = seed.inlineLists[LESSONS]!;
  entries.push(
    makeEntry(model("lessons-copy"), "lessons-copy", {
      tocForYou: "受講をお勧めする方",
      tocCourse: "授業内容",
      tocPricing: "クラス価格",
      tocConsultation: "有料進路相談",
      tocInstructor: "講師紹介",
      tocSpecializations: "専攻分野",
      tocGraduates: "美大卒の方へ",
      tocKnowledge: "受験について知る",
      forYouTitle: txt(LESSONS, "このような方に"),
      courseTitle: txt(LESSONS, "オンラインクラス授業内容"),
      courseIntro: txt(LESSONS, "２ヶ月コースまたは"),
      pricingTitle: txt(LESSONS, "オンラインクラス価格"),
      pricingScheduleNote: txt(LESSONS, "レッスンスケジュール"),
      pricingContinueNote: txt(LESSONS, "引き続き受講"),
      pricingPaymentNote: txt(LESSONS, "お支払いは"),
      consultationTitle: txt(LESSONS, "オンライン有料進路相談"),
      consultationTopicsTitle: "面談で話す内容",
      consultationTopics: lines(lists[0]!),
      consultationFaqTitle: "よくある質問",
      consultationFaqTopics: lines(lists[1]!),
      instructorTitle: "講師紹介",
      careerTitle: "経歴",
      specializationsTitle: txt(LESSONS, "ドイツ美術大学 専攻"),
      specializationsNote: txt(LESSONS, "どの学科の"),
      graduatesTitle: txt(LESSONS, "美大卒の方へ"),
      graduatesParagraphs: lines(seed.staticText[LESSONS]!.filter((row) => row.tag === "p" && row.sourceLine >= 280 && !row.hasExpression).map((row) => row.text)),
      knowledgeTitle: "ドイツ美大受験について知る",
    }),
    makeEntry(model("about-copy"), "about-copy", {
      birthLine: txt(ABOUT, "1987年"),
      instagramLabel: "Instagram",
      careerTitle: "経歴",
      educationTitle: "学歴",
      messageTitle: "メッセージ",
      featuresTitle: "レッスンの特長",
    }),
    makeEntry(model("instructor-profile"), "instructor-profile", {
      name: str(teacher.name),
      latinName: "Yuko Takatsudo",
      title: str(teacher.title),
      portraitAlt: str(teacher.name),
      homeBio: str(teacher.bio),
      lessonsBio: txt(LESSONS, "ドイツに10年間"),
      aboutMessage: lines(seed.staticText[ABOUT]!.filter((row) => row.tag === "p" && row.sourceLine >= 120 && !row.hasExpression).map((row) => row.text)),
    }),
  );

  const contact = seed.contact;
  const label = (name: string) => contact.fields.find((field) => field.name === name)!.label;
  entries.push(
    makeEntry(model("contact-copy"), "contact-copy", {
      stepsTitle: txt(CONTACT, "お申し込みの流れ"),
      legalSummary: "特定商取引法に基づく表記",
      formAriaLabel: "お問い合わせフォーム",
      nameLabel: label("name"),
      emailLabel: label("email"),
      courseLabel: label("course"),
      courseUndecidedOption: contact.courseOptions[0]!,
      messageLabel: label("message"),
      requiredLabel: contact.requiredLabel,
      optionalLabel: "任意",
      submitLabel: contact.button,
      submittingLabel: contact.submitting,
      successTitle: contact.successTitle,
      successBody: contact.successBody,
      errorMessage: contact.error,
      backLabel: "入力画面に戻る",
      valueMissingMessage: "{label}を入力してください。",
      emailFormatMessage: "メールアドレスの形式をご確認ください。",
      previewNotice: "デザイン確認用のプレビューです。入力内容は送信されません。",
      successPreviewEyebrow: "送信完了画面 · プレビュー",
      successPreviewNotice: "プレビューのため、実際のお問い合わせは送信されていません。",
    }),
  );

  const pricing = fm("components/pricing-section/pricing-section.astro").pricingData as { name: string; price: string; unit: string; description: string; featured?: boolean }[];
  const lessonsNotes = [txt(LESSONS, "税込 / 1時間半"), txt(LESSONS, "税込 / 1ヶ月あたり25,000円"), txt(LESSONS, "税込 / 1ヶ月あたり23,000円")];
  const courseIds = ["consultation", "two-month", "four-month"];
  pricing.forEach((course, index) => {
    entries.push(
      makeEntry(model("course"), courseIds[index]!, {
        name: course.name,
        price: course.price,
        unit: course.unit,
        homeDescription: course.description,
        lessonsNote: lessonsNotes[index]!,
        contactOptionLabel: contact.courseOptions[index + 1]!,
        featured: course.featured === true,
        order: index + 1,
      }),
    );
  });

  props(LESSONS, "InfoCard").forEach((card, index) => {
    entries.push(makeEntry(model("course-step"), seedEntryId("course-step", index + 1), { title: str(card.title), description: str(card.description), order: index + 1 }));
  });
  (fm(HOME).targetItems as string[]).forEach((text, index) => {
    entries.push(makeEntry(model("target-item"), seedEntryId("home", index + 1), { page: "home", text, order: index + 1 }));
  });
  (fm(LESSONS).recommendedItems as string[]).forEach((text, index) => {
    entries.push(makeEntry(model("target-item"), seedEntryId("lessons", index + 1), { page: "lessons", text, order: index + 1 }));
  });
  (fm(LESSONS).specializations as { de: string; ja: string }[]).forEach((item, index) => {
    entries.push(makeEntry(model("specialization"), seedEntryId("specialization", index + 1), { ...item, order: index + 1 }));
  });
  (fm(ABOUT).features as { title: string; description: string }[]).forEach((item, index) => {
    entries.push(makeEntry(model("feature-card"), seedEntryId("feature-card", index + 1), { ...item, order: index + 1 }));
  });

  (fm(LESSONS).careerTimeline as { year: string; text: string }[]).forEach((row, index) => {
    entries.push(makeEntry(model("timeline-entry"), seedEntryId("lessons-career", index + 1), { timeline: "lessons-career", ...row, order: index + 1 }));
  });
  const splitRow = (row: string) => {
    const [year, text] = row.split("　", 2);
    return { year: year!, text: text! };
  };
  (fm(ABOUT).career as string[]).forEach((row, index) => {
    entries.push(makeEntry(model("timeline-entry"), seedEntryId("about-career", index + 1), { timeline: "about-career", ...splitRow(row), order: index + 1 }));
  });
  (fm(ABOUT).education as string[]).forEach((row, index) => {
    entries.push(makeEntry(model("timeline-entry"), seedEntryId("about-education", index + 1), { timeline: "about-education", ...splitRow(row), order: index + 1 }));
  });

  seed.data.resultsData.forEach((year, yearIndex) => {
    const yearId = resultYearId(year.year);
    entries.push(makeEntry(model("result-year"), yearId, { label: year.year, declaredCount: year.count, order: yearIndex + 1 }));
    year.entries.forEach((row, index) => {
      entries.push(
        makeEntry(model("result-entry"), seedEntryId(yearId, index + 1), {
          year: ref("result-year", yearId),
          school: row.school,
          department: row.department,
          url: seed.data.schoolUrls[row.school] ?? "",
          order: index + 1,
        }),
      );
    });
  });
  (fm(HOME).results as { year: string; school: string; detail: string }[]).forEach((row, index) => {
    entries.push(makeEntry(model("home-result"), seedEntryId("home-result", index + 1), { yearLabel: row.year, school: row.school, detail: row.detail, order: index + 1 }));
  });

  seed.data.voicesData.forEach((voice, index) => {
    entries.push(
      makeEntry(model("testimonial"), seedEntryId("student", index + 1), {
        author: voice.author,
        yearLabel: voice.year,
        school: voice.school,
        department: voice.department,
        quote: voice.quote,
        order: index + 1,
      }),
    );
  });
  (fm(HOME).voices as { quote: string; author: string; school: string }[]).forEach((voice, index) => {
    entries.push(makeEntry(model("home-voice"), seedEntryId("home-voice", index + 1), { ...voice, order: index + 1 }));
  });

  const groupIds = ["faq-exam", "faq-lessons", "faq-german", "faq-fees"];
  seed.data.faqData.forEach((group, groupIndex) => {
    const groupId = groupIds[groupIndex]!;
    entries.push(makeEntry(model("faq-group"), groupId, { title: group.title, order: groupIndex + 1 }));
    group.items.forEach((item, index) => {
      entries.push(makeEntry(model("faq-item"), seedEntryId(groupId, index + 1), { group: ref("faq-group", groupId), ...item, order: index + 1 }));
    });
  });
  (fm(HOME).faqItems as { question: string; answer: string }[]).forEach((item, index) => {
    entries.push(makeEntry(model("home-faq"), seedEntryId("home-faq", index + 1), { ...item, order: index + 1 }));
  });

  for (const slug of NOTE_SLUGS) {
    const note = seed.notes[slug]!;
    entries.push(makeEntry(model("note"), slug, { slug, title: note.title, description: note.description, body: note.body, order: NOTE_INDEX_ORDER.indexOf(slug) + 1 }));
  }
  (fm(LESSONS).knowledgeCards as { href: string; title: string; description: string }[]).forEach((card, index) => {
    const slug = card.href.replace("/notes/", "").replace("/", "");
    entries.push(makeEntry(model("knowledge-card"), `card-${slug}`, { note: ref("note", slug), title: card.title, description: card.description, order: index + 1 }));
  });

  (fm(CONTACT).steps as { title: string; description: string }[]).forEach((step, index) => {
    entries.push(makeEntry(model("contact-step"), seedEntryId("contact-step", index + 1), { title: step.title, description: step.description, order: index + 1 }));
  });
  (fm(CONTACT).tokushoho as { key: string; value: string }[]).forEach((row, index) => {
    entries.push(makeEntry(model("legal-row"), seedEntryId("legal-row", index + 1), { ...row, order: index + 1 }));
  });

  return entries;
}
