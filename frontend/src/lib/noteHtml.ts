import DOMPurify from 'dompurify';
import { marked } from 'marked';

export interface NoteHeading {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'hr', 'a',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'data-note-heading-id'];

const sanitizeConfig = {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
};

const looksLikeHtml = (input: string): boolean => /<\/?[a-z][\s\S]*>/i.test(input);

const sanitizeRawHtml = (html: string): string => DOMPurify.sanitize(html, sanitizeConfig);

const escapeHtml = (input: string): string =>
    input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const sanitizeNoteHtml = (html: string): string => {
    if (!html) return '';
    if (looksLikeHtml(html)) return sanitizeRawHtml(html);
    return toEditorHtml(html);
};

export const toEditorHtml = (raw: string): string => {
    const input = (raw || '').trim();
    if (!input) return '<p></p>';

    if (looksLikeHtml(input)) {
        const sanitized = sanitizeRawHtml(input);
        return sanitized || '<p></p>';
    }

    const markdownHtml = marked.parse(input, { gfm: true, breaks: true });
    const rendered = typeof markdownHtml === 'string' ? markdownHtml : `${markdownHtml}`;
    const sanitized = sanitizeRawHtml(rendered);
    if (sanitized) return sanitized;

    const plain = escapeHtml(input).replace(/\n/g, '<br />');
    return `<p>${plain}</p>`;
};

export const normalizeHtmlForCompare = (value: string): string => {
    const html = sanitizeNoteHtml(toEditorHtml(value || ''));
    if (typeof window === 'undefined') return html.replace(/\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.innerHTML.replace(/\s+/g, ' ').trim();
};

export const htmlToPlainText = (value: string): string => {
    const html = sanitizeNoteHtml(toEditorHtml(value || ''));
    if (typeof window === 'undefined') {
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

export const prepareNoteHtmlForRender = (value: string): { html: string; headings: NoteHeading[] } => {
    const html = sanitizeNoteHtml(toEditorHtml(value || ''));
    if (typeof window === 'undefined') return { html, headings: [] };

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const headings: NoteHeading[] = [];
    const headingEls = doc.body.querySelectorAll('h1, h2, h3');
    headingEls.forEach((el, idx) => {
        const level = Number(el.tagName[1]) as 1 | 2 | 3;
        const id = `note-heading-${idx}`;
        el.setAttribute('data-note-heading-id', id);
        headings.push({
            id,
            text: (el.textContent || '').trim(),
            level,
        });
    });

    return { html: doc.body.innerHTML, headings };
};
