import type { Child } from "@takazudo/zfb/zudo-react";
import { INSTAGRAM_URL } from "../site-footer/site-footer";
import { TextLink } from "../text-link/text-link";

export const INSTRUCTOR_PORTRAIT = { src: "/assets/instructor-yuko.jpg", width: 600, height: 902 } as const;

export interface InstructorProps {
  /**
   * `home`: subtitle, bio and the detail link; `lessons`: bio and the detail
   * link; `about`: the larger profile with the birth line and the Instagram
   * link instead of a bio, no detail link.
   */
  variant: "home" | "lessons" | "about";
  name: string;
  latinName: string;
  /** The title (home) or the birth line (about); not shown on lessons. */
  subtitle: string;
  bio: string;
  portraitAlt: string;
  detailLabel: string;
  detailHref: string;
  instagramLabel: string;
}

/** Prototype `ui.py instructor()`: the modest portrait (600×902, never enlarged) beside the identity block. */
export function Instructor(props: InstructorProps): Child {
  const about = props.variant === "about";
  const subtitle = props.variant === "lessons" ? "" : props.subtitle;
  let bio: Child = null;
  if (about) bio = <TextLink href={INSTAGRAM_URL} label={props.instagramLabel} />;
  else if (props.bio) bio = <p>{props.bio}</p>;
  return (
    <div class={about ? "instructor instructor--about" : "instructor"}>
      <figure class="instructor__portrait">
        <img src={INSTRUCTOR_PORTRAIT.src} alt={props.portraitAlt} width={INSTRUCTOR_PORTRAIT.width} height={INSTRUCTOR_PORTRAIT.height} loading="lazy" />
      </figure>
      <div class="instructor__identity">
        <p class="instructor__name">{props.name}</p>
        <p class="instructor__latin">{props.latinName}</p>
        {subtitle ? <p class="instructor__subtitle">{subtitle}</p> : null}
        {bio === null ? null : <div class="instructor__bio">{bio}</div>}
        {!about && props.detailLabel ? <TextLink href={props.detailHref} label={props.detailLabel} /> : null}
      </div>
    </div>
  );
}
