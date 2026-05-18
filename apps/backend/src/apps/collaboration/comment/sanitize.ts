import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'a',
  'span',
  'img',
];

export function sanitize(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['data-mention-user-id', 'data-mention-name', 'class'],
      code: ['class'],
      img: ['src', 'alt', 'title', 'class', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    /// Inline image src — allow our /uploads/ relative URLs + http/https.
    /// data: URIs are blocked by allowedSchemes already (no 'data' in list).
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    transformTags: {
      // Inline plain transform — `sanitizeHtml.simpleTransform` is missing
      // off the default import in this CJS/ESM interop setup.
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });
}

export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
