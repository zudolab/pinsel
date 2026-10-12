import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { ContactForm, CourseOption, type ContactFormProps } from "./contact-form";

const meta: StoryMeta = {
  title: "ContactForm",
  category: "Forms",
  description: "The preview-only inquiry form (nothing is sent) in its idle, invalid, error and success states.",
  usage: `import { ContactForm, CourseOption } from "@pinsel/ui";\n\n<ContactForm nameLabel="お名前" … courseOptions={["有料進路相談", "2ヶ月コース", "4ヶ月コース"].map((label) => CourseOption({ label }))} />`,
};
export default meta;

const COPY: Omit<ContactFormProps, "previewState" | "courseOptions"> = {
  formAriaLabel: "お問い合わせフォーム",
  errorMessage: "送信に失敗しました。時間をおいて再度お試しください。",
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
  successBody: "通常2〜3営業日以内にご返信いたします。しばらくお待ちください。",
  successPreviewNotice: "プレビューのため、実際のお問い合わせは送信されていません。",
  backLabel: "入力画面に戻る",
};

const form = (previewState: ContactFormProps["previewState"]): Child => (
  <div class="container contact-layout">
    <ContactForm {...COPY} previewState={previewState} courseOptions={["有料進路相談", "2ヶ月コース", "4ヶ月コース"].map((label) => CourseOption({ label }))} />
  </div>
);

export const Idle: Story = { name: "Form", render: (): Child => form("idle") };
export const Invalid: Story = { name: "Invalid (required fields empty)", render: (): Child => form("invalid") };
export const Failure: Story = { name: "Failure banner", render: (): Child => form("error") };
export const Success: Story = { name: "Success panel", render: (): Child => form("success") };
