import type { Child } from "@takazudo/zfb/zudo-react";
import { parseMarkdown, type BlockNode, type InlineNode } from "../markdown/safe-markdown";

export interface ProseProps {
  markdown: string;
}

class UnknownMarkdownNode extends Error {
  readonly name = "UnknownMarkdownNode";
}

function unknownNode(node: never): never {
  throw new UnknownMarkdownNode(`Unknown markdown node ${JSON.stringify(node)}.`);
}

function renderInline(nodes: readonly InlineNode[]): Child {
  return nodes.map((node) => {
    switch (node.kind) {
      case "text":
        return node.text;
      case "strong":
        return <strong>{node.text}</strong>;
      case "link":
        return <a href={node.href}>{node.text}</a>;
      default:
        return unknownNode(node);
    }
  });
}

function renderBlock(block: BlockNode): Child {
  switch (block.kind) {
    case "heading":
      return <h2 id={block.id}>{renderInline(block.children)}</h2>;
    case "paragraph":
      return <p>{renderInline(block.children)}</p>;
    case "list":
      return (
        <ul>
          {block.items.map((item) => (
            <li>{renderInline(item)}</li>
          ))}
        </ul>
      );
    default:
      return unknownNode(block);
  }
}

/** Prototype `.prose` block rendered from the safe Markdown node tree; text is always escaped, never raw HTML. */
export function Prose({ markdown }: ProseProps): Child {
  return <div class="prose">{parseMarkdown(markdown).map(renderBlock)}</div>;
}
