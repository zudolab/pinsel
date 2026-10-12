import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { ART_SIZES, ArtWindow } from "./art-window";

const meta: StoryMeta = {
  title: "ArtWindow",
  category: "Art",
  description: "Decorative watercolor windows between reading surfaces. Pigments read --art-back/--art-wash/--art-current; each instance suffixes its SVG ids.",
  usage: `import { ArtWindow } from "@pinsel/ui";\n\n<ArtWindow slot="middle" size="large" drift={-1} />`,
};
export default meta;

const labelled = (label: string, art: Child): Child => (
  <figure style={{ margin: "0 0 2rem" }}>
    <figcaption style={{ padding: ".5rem 1.5rem", "font-size": ".75rem" }}>{label}</figcaption>
    {art}
  </figure>
);

export const Slots: Story = {
  name: "Slots (hero / middle / closing)",
  render: (): Child => [labelled("hero · hero (slice)", <ArtWindow slot="hero" size="hero" />), labelled("middle · large", <ArtWindow slot="middle" size="large" />), labelled("closing · closing", <ArtWindow slot="closing" size="closing" />)],
};

export const Sizes: Story = {
  name: "Sizes of the closing art",
  render: (): Child => ART_SIZES.filter((size) => size !== "hero").map((size) => labelled(`closing · ${size}`, <ArtWindow slot="closing" size={size} instance={`story-${size}`} />)),
};

export const Shallow: Story = {
  name: "Shallow hero strip under page headings",
  render: (): Child => (["small", "medium", "ribbon"] as const).map((size) => labelled(`hero · ${size} (shallow, range 8)`, <ArtWindow slot="hero" size={size} />)),
};

export const Pigment: Story = {
  name: "Another pigment stop (Mineral)",
  render: (): Child => (
    <div style={{ "--art-back": "#c7bdb8", "--art-wash": "#bcb3c3", "--art-current": "#7c7080" }}>
      <ArtWindow slot="middle" size="large" />
    </div>
  ),
};
