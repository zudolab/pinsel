import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";

export interface ResultRowProps {
  school: string;
  department: string;
  /** School site (allowlisted https URL); empty renders the row without a link. */
  url: string;
}

/** One `li.result-row`: school and department side by side, the whole row linking out when a URL exists. */
export function ResultRow({ school, department, url }: ResultRowProps): Child {
  const names = (
    <div>
      <p>{school}</p>
      <p>{department}</p>
    </div>
  );
  return (
    <li class="result-row">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {names}
          <Icon name="arrow-up-right" />
        </a>
      ) : (
        names
      )}
    </li>
  );
}

export interface ResultsYearSectionProps {
  /** `2025年度`; also the fragment id `#year-2025年度`. */
  label: string;
  /** The declared count shown in the heading, independent of the rows. */
  count: number;
  /** `pinsel.result-row` children. */
  items?: readonly unknown[];
}

/** One results year: `section#year-<label>` with `h2 {label}（{count}件）` and its rows. */
export function ResultsYearSection(props: ResultsYearSectionProps): Child {
  return (
    <section class="year-section reading-zone" id={`year-${props.label}`}>
      <h2>
        {props.label}
        <span>（{props.count}件）</span>
      </h2>
      <ul>{(props.items ?? []) as Child}</ul>
    </section>
  );
}
