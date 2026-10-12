import type { Child } from "@takazudo/zfb/zudo-react";

export interface FeatureCardProps {
  title: string;
  description: string;
}

export function FeatureCard({ title, description }: FeatureCardProps): Child {
  return (
    <article class="feature-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export interface FeatureGridProps {
  /** `pinsel.feature-card` children. */
  items?: readonly unknown[];
}

/** The about レッスンの特長 cards. */
export function FeatureGrid(props: FeatureGridProps): Child {
  return <div class="feature-grid">{(props.items ?? []) as Child}</div>;
}
