import type { Child } from "@takazudo/zfb/zudo-react";

export interface LegalRowProps {
  /** `key` is reserved by JSX, so the row label is `term`. */
  term: string;
  value: string;
}

export function LegalRow({ term, value }: LegalRowProps): Child {
  return (
    <tr>
      <th scope="row">{term}</th>
      <td>{value}</td>
    </tr>
  );
}

export interface LegalTableProps {
  summary: string;
  /** `pinsel.legal-row` children (eight in the approved page). */
  items?: readonly unknown[];
  /** Static open state for stories. */
  open?: boolean;
}

/** The 特定商取引法に基づく表記 disclosure, `details#legal`, closed by default. */
export function LegalTable(props: LegalTableProps): Child {
  return (
    <section class="container">
      <details class="legal" id="legal" open={props.open ?? false}>
        <summary>{props.summary}</summary>
        <table>
          <tbody>{(props.items ?? []) as Child}</tbody>
        </table>
      </details>
    </section>
  );
}
