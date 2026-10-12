import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { aboutMessage } from "../stories/samples";
import { Message } from "./message";

const meta: StoryMeta = {
  title: "Message",
  category: "Sections",
  description: "The about #message block.",
  usage: `import { Message } from "@pinsel/ui";\n\n<Message eyebrow="Message" title="メッセージ" paragraphs={[…]} />`,
};
export default meta;

export const About: Story = {
  name: "About #message",
  render: (): Child => (
<Message eyebrow="Message" title="メッセージ" paragraphs={aboutMessage} />
  ),
};
