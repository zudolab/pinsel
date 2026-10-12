import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { MoreLink } from "../more-link/more-link";
import { Section } from "../section/section";
import { homeVoices } from "../stories/samples";
import { VoicePreview, VoicePreviews } from "./voice-previews";

const meta: StoryMeta = {
  title: "VoicePreviews",
  category: "Sections",
  description: "The home 生徒の声 excerpts.",
  usage: `import { VoicePreview, VoicePreviews } from "@pinsel/ui";\n\n<VoicePreviews items={[<VoicePreview quote="…" author="Rさん" school="…" />]} />`,
};
export default meta;

export const Home: Story = {
  name: "Home #voices",
  render: (): Child => <Section id="voices" eyebrow="Voices" title="生徒の声" content={[<VoicePreviews items={homeVoices.map((voice) => <VoicePreview {...voice} />)} />, <MoreLink href="/voices/" label="もっと見る" />]} />,
};
