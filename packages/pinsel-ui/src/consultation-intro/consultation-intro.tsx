import type { Child } from "@takazudo/zfb/zudo-react";

export interface ConsultationIntroProps {
  name: string;
  price: string;
  note: string;
  topicsTitle: string;
  topics: readonly string[];
  faqTitle: string;
  faqTopics: readonly string[];
}

function TopicColumn({ title, items }: { title: string; items: readonly string[] }): Child {
  return (
    <div>
      <h3>{title}</h3>
      <ul class="simple-list">
        {items.map((item) => (
          <li>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** The lessons 有料進路相談 block: price summary beside the two topic lists. */
export function ConsultationIntro(props: ConsultationIntroProps): Child {
  return (
    <div class="consultation-intro">
      <div>
        <p>{props.name}</p>
        <p class="price">{props.price}</p>
        <p class="quiet">{props.note}</p>
      </div>
      <div class="two-column">
        <TopicColumn title={props.topicsTitle} items={props.topics} />
        <TopicColumn title={props.faqTitle} items={props.faqTopics} />
      </div>
    </div>
  );
}
