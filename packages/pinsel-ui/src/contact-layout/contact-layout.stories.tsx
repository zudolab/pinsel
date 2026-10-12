import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { contactSteps } from "../stories/samples";
import { ContactLayout, Step } from "./contact-layout";

const meta: StoryMeta = {
  title: "ContactLayout",
  category: "Forms",
  description: "The お申し込みの流れ aside beside the form panel.",
  usage: `import { ContactLayout, Step } from "@pinsel/ui";\n\n<ContactLayout stepsTitle="お申し込みの流れ" steps={[<Step title="…" description="…" />]} panel={[<ContactForm … />]} />`,
};
export default meta;

export const Steps: Story = {
  name: "Application flow",
  render: (): Child => <ContactLayout stepsTitle="お申し込みの流れ" steps={contactSteps.map((step, index) => <Step {...step} index={index + 1} />)} panel={[<div class="contact-panel" />]} />,
};
