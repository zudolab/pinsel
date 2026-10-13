import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { voices } from "../stories/samples";
import { StudentIndex, StudentLink } from "./student-index";

const meta: StoryMeta = {
  title: "StudentIndex",
  category: "Sections",
  description: "The voices page index linking #student-N.",
  usage: `import { StudentIndex, StudentLink } from "@pinsel/ui";\n\n<StudentIndex items={[<StudentLink author="Rさん" school="…" />]} />`,
};
export default meta;

export const Voices: Story = {
  name: "Voices index",
  render: (): Child => <StudentIndex items={voices.map((voice, index) => <StudentLink author={voice.author} school={voice.school} index={index + 1} />)} />,
};
