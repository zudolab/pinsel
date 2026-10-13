import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { Instructor } from "./instructor";

const meta: StoryMeta = {
  title: "Instructor",
  category: "Sections",
  description: "The modest portrait beside the identity block, in the three approved variants.",
  usage: `import { Instructor } from "@pinsel/ui";\n\n<Instructor variant="home" name="高津戸 優子" … />`,
};
export default meta;

const BASE = { name: "高津戸 優子", latinName: "Yuko Takatsudo", portraitAlt: "高津戸 優子", detailLabel: "詳しく見る", detailHref: "/about/", instagramLabel: "Instagram" };
const HOME_BIO = "ドイツ美大受験は情報が少なく、不安に感じる方が多いと思います。私自身の経験をもとに、進路相談からポートフォリオ作成、出願準備まで、一人ひとりに寄り添ったサポートをしています。";

export const Home: Story = {
  name: "Home (title, bio, link)",
  render: (): Child => (
    <Section id="instructor" eyebrow="Instructor" title="講師紹介" layout="instructor" content={[<Instructor variant="home" {...BASE} subtitle="東京芸大卒 / ミュンヘン芸術アカデミー修了" bio={HOME_BIO} />]} />
  ),
};

export const Lessons: Story = {
  name: "Lessons (bio, link)",
  render: (): Child => <Section id="instructor" eyebrow="Instructor" title="講師紹介" content={[<Instructor variant="lessons" {...BASE} subtitle="" bio={HOME_BIO} />]} />,
};

export const About: Story = {
  name: "About (birth line, Instagram)",
  render: (): Child => <Section id="" eyebrow="" title="" label="高津戸優子のプロフィール" content={[<Instructor variant="about" {...BASE} subtitle="1987年 埼玉県生まれ" bio="" />]} />,
};
