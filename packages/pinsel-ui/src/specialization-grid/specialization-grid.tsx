import type { Child } from "@takazudo/zfb/zudo-react";

export interface SpecializationProps {
  de: string;
  ja: string;
}

export function Specialization({ de, ja }: SpecializationProps): Child {
  return (
    <li>
      <p lang="de">{de}</p>
      <p>{ja}</p>
    </li>
  );
}

export interface SpecializationGridProps {
  /** `pinsel.specialization` children. */
  items?: readonly unknown[];
}

/** The lessons 専攻分野 grid (German name above the Japanese one). */
export function SpecializationGrid(props: SpecializationGridProps): Child {
  return <ul class="specialization-grid">{(props.items ?? []) as Child}</ul>;
}
