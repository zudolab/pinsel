import type { Child } from "@takazudo/zfb/zudo-react";
import { parseMarkdown, type InlineNode } from "../markdown/safe-markdown";

export interface ProseProps {
  markdown: string;
}

function renderInline(nodes: InlineNode[]): Child {
  return nodes.map((node) => {
    switch (node.kind) {
      case "strong":
        return <strong>{node.text}</strong>;
      case "link":
        return <a href={node.href}>{node.text}</a>;
      default:
        return node.text;
    }
  });
}

/** Prototype `.prose` block rendered from the safe Markdown subset. */
export function Prose({ markdown }: ProseProps): Child {
  return (
    <div class="prose">
      {parseMarkdown(markdown).map((block) => {
        switch (block.kind) {
          case "heading":
            return <h2 id={block.id}>{block.text}</h2>;
          case "list":
            return (
              <ul>
                {block.items.map((item) => (
                  <li>{renderInline(item)}</li>
                ))}
              </ul>
            );
          default:
            return <p>{renderInline(block.children)}</p>;
        }
      })}
    </div>
  );
}
