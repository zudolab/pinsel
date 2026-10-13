import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { consultationFaqTopics, consultationTopics } from "../stories/samples";
import { ConsultationIntro } from "./consultation-intro";

const meta: StoryMeta = {
  title: "ConsultationIntro",
  category: "Sections",
  description: "The lessons 有料進路相談 price summary and its two topic lists.",
  usage: `import { ConsultationIntro } from "@pinsel/ui";\n\n<ConsultationIntro name="進路相談" price="¥10,000" note="税込 / 1時間半" topicsTitle="面談で話す内容" topics={[…]} faqTitle="よくある質問" faqTopics={[…]} />`,
};
export default meta;

export const Lessons: Story = {
  name: "Lessons #consultation",
  render: (): Child => (
    <Section
      id="consultation"
      eyebrow="Consultation"
      title="オンライン有料進路相談"
      content={[<ConsultationIntro name="進路相談" price="¥10,000" note="税込 / 1時間半" topicsTitle="面談で話す内容" topics={consultationTopics} faqTitle="よくある質問" faqTopics={consultationFaqTopics} />]}
    />
  ),
};
