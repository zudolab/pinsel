import type { Child } from "@takazudo/zfb/zudo-react";

export interface VoicePreviewProps {
  quote: string;
  author: string;
  school: string;
}

export function VoicePreview({ quote, author, school }: VoicePreviewProps): Child {
  return (
    <article class="voice-preview">
      <blockquote>{quote}</blockquote>
      <cite>
        {author}
        <span>{school}</span>
      </cite>
    </article>
  );
}

export interface VoicePreviewsProps {
  /** `pinsel.voice-preview` children. */
  items?: readonly unknown[];
}

/** The home 生徒の声 excerpts. */
export function VoicePreviews(props: VoicePreviewsProps): Child {
  return <div class="voices-preview">{(props.items ?? []) as Child}</div>;
}
