import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

const CALLOUT_TYPES = new Set(['note', 'info', 'tip', 'warning', 'danger']);

export type WikilinkStatus = 'resolved' | 'dangling' | 'conflict' | 'unknown';

export interface RenderMarkdownOptions {
  wikilinkStatusByTarget?: Record<string, WikilinkStatus>;
}

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const stripFrontmatter = (content: string) => {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0]?.trim() !== '---') {
    return normalized;
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex === -1) {
    return normalized;
  }

  return lines.slice(closingIndex + 1).join('\n').replace(/^\n/, '');
};

const enhanceTaskLists = (html: string) =>
  html
    .replace(
      /<li>\[ \]\s+/g,
      '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" disabled> ',
    )
    .replace(
      /<li>\[[xX]\]\s+/g,
      '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" checked disabled> ',
    )
    .replace(
      /<li><p>\[ \]\s+/g,
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" type="checkbox" disabled> ',
    )
    .replace(
      /<li><p>\[[xX]\]\s+/g,
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" type="checkbox" checked disabled> ',
    );

const enhanceWikilinks = (html: string, options: RenderMarkdownOptions = {}) => {
  const codeBlocks: string[] = [];
  const guarded = html.replace(/<code[^>]*>[\s\S]*?<\/code>/g, (match) => {
    codeBlocks.push(match);
    return `__NOIDEAR_CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const withLinks = guarded.replace(
    /\[\[([^\]|<]+?)(?:\|([^\]<]+?))?\]\]/g,
    (_match, rawTarget: string, rawLabel?: string) => {
      const target = rawTarget.trim();
      const label = (rawLabel || rawTarget).trim();
      const status = options.wikilinkStatusByTarget?.[target] || 'unknown';
      return `<span class="wikilink wikilink-${escapeAttribute(status)}" data-target="${escapeAttribute(target)}">${label}</span>`;
    },
  );

  return withLinks.replace(/__NOIDEAR_CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i, 10)]);
};

const enhanceCallouts = (html: string) =>
  html.replace(
    /<blockquote>\s*<p>\[!([a-zA-Z][\w-]*)\]\s*([^<\n]*)(?:<br>\s*|\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/g,
    (_match, rawType: string, rawTitle: string, rawBody: string) => {
      const requestedType = rawType.toLowerCase();
      const type = CALLOUT_TYPES.has(requestedType) ? requestedType : 'note';
      const title = rawTitle.trim() || requestedType;
      const body = rawBody.trim();
      const content = body ? `<div class="callout-content">${body}</div>` : '';

      return [
        `<div class="callout callout-${escapeAttribute(type)}" data-callout="${escapeAttribute(type)}">`,
        `<div class="callout-title">${title}</div>`,
        content,
        '</div>',
      ].join('');
    },
  );

export const renderMarkdown = (content: string, options: RenderMarkdownOptions = {}) => {
  const withoutFrontmatter = stripFrontmatter(content);
  const rendered = markdown.render(withoutFrontmatter);

  return enhanceWikilinks(enhanceTaskLists(enhanceCallouts(rendered)), options);
};
