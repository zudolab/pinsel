import type { Child } from "@takazudo/zfb/zudo-react";
import { Paragraphs } from "../paragraphs/paragraphs";
import { Section } from "../section/section";

export const GRADUATES_ILLUSTRATION = { src: "/assets/illustrations/10-form-through-dialogue.png", width: 1254, height: 1254 } as const;

export interface GraduatesSectionProps {
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
}

/**
 * `build.py graduates_section()`: the unchanged passage beside the approved
 * R7-10 illustration. The figure is decorative (`aria-hidden`, empty alt);
 * the grid collapses at 70rem and stacks at 47.99rem in components.css.
 */
export function GraduatesSection(props: GraduatesSectionProps): Child {
  return (
    <Section
      id="graduates"
      eyebrow={props.eyebrow}
      title={props.title}
      content={[
        <div class="graduate-content" data-illustrated="10">
          <Paragraphs paragraphs={props.paragraphs} />
          <figure class="graduate-illustration" aria-hidden="true">
            <img src={GRADUATES_ILLUSTRATION.src} alt="" width={GRADUATES_ILLUSTRATION.width} height={GRADUATES_ILLUSTRATION.height} loading="lazy" decoding="async" />
          </figure>
        </div>,
      ]}
    />
  );
}
