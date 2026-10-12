import type { Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow } from "../art-window/art-window";
import { Breadcrumb } from "../breadcrumb/breadcrumb";

export interface StatProps {
  number: string;
  label: string;
}

/** One results figure (`123+` 合格実績). */
export function Stat({ number, label }: StatProps): Child {
  return (
    <p>
      <strong>{number}</strong>
      <span>{label}</span>
    </p>
  );
}

export interface PageHeadingProps {
  title: string;
  description: string;
  /** English eyebrow above the h1 (`Lessons`, `About`, …). */
  eyebrow: string;
  /** Shallow hero strip under the heading; `none` renders no art. */
  artSize: "small" | "medium" | "ribbon" | "none";
  /** `pinsel.stat` children (the results page), rendered as `div.stats` under the description. */
  stats?: readonly unknown[];
}

// The approved lessons heading sets its title on two lines.
const TITLE_LINES: Readonly<Record<string, readonly string[]>> = {
  "ドイツ美大受験オンラインクラス": ["ドイツ美大受験", "オンラインクラス"],
};

/** Prototype `ui.py page_header()`: breadcrumb, heading, description and the shallow hero art. */
export function PageHeading(props: PageHeadingProps): Child {
  const lines = TITLE_LINES[props.title];
  const stats = props.stats ?? [];
  return (
    <>
      <Breadcrumb label={props.title} />
      <header class="page-heading container reading-zone">
        <div>
          <p class="eyebrow">{props.eyebrow}</p>
          <h1>{lines ? lines.map((line) => <span>{line}</span>) : props.title}</h1>
        </div>
        <div class="page-heading__description">
          <p>{props.description}</p>
          {stats.length > 0 ? <div class="stats">{stats as Child}</div> : null}
        </div>
      </header>
      {props.artSize === "none" ? null : <ArtWindow slot="hero" size={props.artSize} />}
    </>
  );
}
