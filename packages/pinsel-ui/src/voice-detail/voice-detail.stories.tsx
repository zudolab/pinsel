import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { voices } from "../stories/samples";
import { VoiceDetail } from "./voice-detail";

const meta: StoryMeta = {
  title: "VoiceDetail",
  category: "Sections",
  description: "One full testimonial (article#student-N); the page's middle art follows the second.",
  usage: `import { VoiceDetail } from "@pinsel/ui";\n\n<VoiceDetail author="Rさん" yearLabel="2025年度合格" school="…" department="…" quote="…" artAfter={2} />`,
};
export default meta;

export const First: Story = { name: "Testimonial #1", render: (): Child => <VoiceDetail {...voices[0]!} artAfter={2} index={1} /> };
export const WithArt: Story = { name: "Testimonial #2 with the art after it", render: (): Child => <VoiceDetail {...voices[1]!} artAfter={2} index={2} /> };
