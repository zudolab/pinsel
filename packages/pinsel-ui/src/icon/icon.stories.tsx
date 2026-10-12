import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { ICON_NAMES, Icon } from "./icon";

const meta: StoryMeta = {
  title: "Icon",
  category: "Typography",
  description: "The approved 24×24 line icons (currentColor, 1.7 stroke); always decorative.",
  usage: `import { Icon } from "@pinsel/ui";\n\n<Icon name="arrow-right" />`,
};
export default meta;

export const All: Story = {
  name: "All icons",
  render: (): Child => (
    <ul style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(9rem, 1fr))", gap: "1rem", padding: "1.5rem", "list-style": "none" }}>
      {ICON_NAMES.map((name) => (
        <li style={{ display: "flex", gap: ".75rem", "align-items": "center" }}>
          <Icon name={name} />
          <code>{name}</code>
        </li>
      ))}
    </ul>
  ),
};
