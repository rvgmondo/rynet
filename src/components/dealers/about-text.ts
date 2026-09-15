/**
 * A dealership's About text, read out of the rich text field as plain paragraphs.
 *
 * The About copy is a few sentences a dealership writes about itself. Rendering it as plain
 * paragraphs in the page's own type, rather than through a rich text renderer, keeps a
 * dealership from pasting headings, colours or links into the middle of a Rynet page, and costs
 * no JavaScript. Headings, list items and quotes each become a paragraph of their own.
 */

type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
};

function textOf(node: LexicalNode): string {
  if (typeof node.text === "string") return node.text;
  if (node.type === "linebreak") return " ";
  return (node.children ?? []).map(textOf).join("");
}

function blocksOf(node: LexicalNode): string[] {
  if (node.type === "list") {
    return (node.children ?? []).flatMap(blocksOf);
  }
  const text = textOf(node).replace(/\s+/g, " ").trim();
  return text ? [text] : [];
}

export function aboutParagraphs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const root = (value as { root?: LexicalNode }).root;
  if (!root?.children) return [];
  return root.children.flatMap(blocksOf).slice(0, 6);
}

/** The first sentence, for a meta description. Never cut mid-word. */
export function firstSentence(paragraphs: string[], max = 160): string | null {
  const first = paragraphs[0];
  if (!first) return null;
  const sentence = /^(.+?[.!?])(\s|$)/.exec(first)?.[1] ?? first;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}.`;
}
