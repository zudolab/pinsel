import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "./types";
import { ContactForm, CourseOption } from "../contact-form/contact-form";
import { Faq, FaqCategory, FaqItem } from "../faq/faq";
import { GraduatesSection } from "../graduates-section/graduates-section";
import { Hero } from "../hero/hero";
import { HeroMeta } from "../hero-meta/hero-meta";
import { PricingCard, PricingCards } from "../pricing-cards/pricing-cards";
import { SAMPLE_COURSES } from "../pricing-cards/pricing-cards.stories";
import { ResultRow, ResultsYearSection } from "../results-year/results-year";
import { Section } from "../section/section";
import { SiteFrame } from "../site-frame/site-frame";
import { faqGroups, graduatesParagraphs, resultYear } from "./samples";

const meta: StoryMeta = {
  title: "Pages",
  category: "Pages",
  description: "Composed previews inside the site frame: the home hero and pricing, the lessons graduates passage, a results year, a FAQ category and the contact form.",
  usage: `import { SiteFrame } from "@pinsel/ui";\n\n<SiteFrame … route={{ pathname: "/lessons/" }} main={[<GraduatesSection … />]} />`,
  order: 1,
};
export default meta;

const FRAME = { brandWord: "Pinsel", brandSub: "ART STUDY IN GERMANY", instagramLabel: "yuko_takatsudo", copyright: "© 2015–2026 Pinsel Germany. All rights reserved.", backToTopLabel: "ページの先頭へ" };

const framed = (pathname: string, main: Child): Child => <SiteFrame {...FRAME} route={{ pathname }} main={[main]} />;

const LABELS = { taxLabel: "税込", popularBadge: "POPULAR", linkLabel: "このコースについて相談する" };

export const HomeHeroAndPricing: Story = {
  name: "Home: hero + pricing",
  render: (): Child =>
    framed("/", [
      <Hero
        label="ドイツ美大受験部 オンラインクラス"
        titleLines={["あなただけの", "ドイツ美大受験準備を", "個別指導で。"]}
        lead="東京藝術大学、ミュンヘン芸術アカデミー修了の講師があなたの受験をサポートします。"
        primaryLabel="オンラインクラス"
        primaryHref="/lessons/"
        pricingLabel="コースと料金"
        pricingHref="#pricing"
      />,
      <HeroMeta line="完全マンツーマン・オンライン" intro="初心者の方も美大卒の方も、どなたでも１対１のオンライン個人レッスンでドイツ美大留学を目指して頂けます。" />,
      <Section
        id="pricing"
        eyebrow="COURSE & PRICING"
        title="コースと料金"
        content={[
          <PricingCards
            note="※ お問い合わせ後にコースをお選びいただけます"
            moreLabel="クラスの詳細はこちら"
            moreHref="/lessons/"
            items={[SAMPLE_COURSES.map((course) => <PricingCard {...course} {...LABELS} />)]}
          />,
        ]}
      />,
    ]),
};

// Resize the preview iframe below 48rem to see the stacked graduates layout (the SG viewport switcher covers both).
export const LessonsGraduates: Story = {
  name: "Lessons: graduates (desktop two-column, narrow stacked)",
  render: (): Child => framed("/lessons/", <GraduatesSection eyebrow="For Graduates" title="美大卒の方へ" paragraphs={graduatesParagraphs} />),
};

export const ResultsYear: Story = {
  name: "Results: one year",
  render: (): Child =>
    framed(
      "/results/",
      <div class="container page-results">
        <ResultsYearSection label={resultYear.label} count={resultYear.count} items={resultYear.rows.map((row) => <ResultRow {...row} />)} />
      </div>,
    ),
};

export const FaqCategoryPage: Story = {
  name: "FAQ: first category",
  render: (): Child => {
    const group = faqGroups[0]!;
    return framed(
      "/faq/",
      <div class="container">
        <FaqCategory title={group.title} index={1} content={[<Faq items={group.items.map((item, index) => <FaqItem {...item} prefix="category-1" openFirst index={index + 1} />)} />]} />
      </div>,
    );
  },
};

export const ContactPage: Story = {
  name: "Contact: form",
  render: (): Child =>
    framed(
      "/contact/",
      <div class="container contact-layout">
        <ContactForm
          formAriaLabel="お問い合わせフォーム"
          errorMessage="送信に失敗しました。時間をおいて再度お試しください。"
          nameLabel="お名前"
          emailLabel="メールアドレス"
          courseLabel="ご希望のコース"
          courseUndecidedOption="未定"
          messageLabel="ご相談内容"
          requiredLabel="必須"
          optionalLabel="任意"
          submitLabel="送信する"
          submittingLabel="送信中..."
          valueMissingMessage="{label}を入力してください。"
          emailFormatMessage="メールアドレスの形式をご確認ください。"
          previewNotice="デザイン確認用のプレビューです。入力内容は送信されません。"
          successPreviewEyebrow="送信完了画面 · プレビュー"
          successTitle="送信ありがとうございます"
          successBody="通常2〜3営業日以内にご返信いたします。しばらくお待ちください。"
          successPreviewNotice="プレビューのため、実際のお問い合わせは送信されていません。"
          backLabel="入力画面に戻る"
          previewState="idle"
          courseOptions={["有料進路相談", "2ヶ月コース", "4ヶ月コース"].map((label) => CourseOption({ label }))}
        />
      </div>,
    ),
};
