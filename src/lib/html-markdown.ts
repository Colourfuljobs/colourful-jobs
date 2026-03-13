import TurndownService from "turndown";
import { marked } from "marked";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  emDelimiter: "_",
});

turndown.addRule("underline", {
  filter: "u",
  replacement: (content) => `<u>${content}</u>`,
});

turndown.addRule("compactHeadings", {
  filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
  replacement: (content, node) => {
    const level = Number(node.nodeName.charAt(1));
    return `${"#".repeat(level)} ${content}\n`;
  },
});

export function htmlToMarkdown(html: string | undefined | null): string {
  if (!html) return "";
  const trimmed = html.trim();
  if (!trimmed) return "";
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return turndown.turndown(trimmed);
}

export function markdownToHtml(markdown: string | undefined | null): string {
  if (!markdown) return "";
  const trimmed = markdown.trim();
  if (!trimmed) return "";
  if (/^<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return marked.parse(trimmed, { async: false }) as string;
}
