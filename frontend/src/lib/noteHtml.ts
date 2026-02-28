import DOMPurify from 'dompurify';
import { marked } from 'marked';

export interface NoteHeading {
    id: string;
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
}

const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'data-note-heading-id', 'src', 'alt', 'width', 'height'];

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
        return html.replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n')
            .replace(/<li>/gi, '\n- ')
            .replace(/<[^>]+>/g, '')
            .replace(/[ \t]+/g, ' ')
            .trim();
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Refined traversal
    const processElement = (el: Element): string => {
        let text = '';
        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childEl = node as HTMLElement;
                const tag = childEl.tagName.toLowerCase();

                if (tag === 'p' || tag === 'div' || tag.match(/^h[1-6]$/)) {
                    text += '\n' + processElement(childEl) + '\n';
                } else if (tag === 'br') {
                    text += '\n';
                } else if (tag === 'li') {
                    text += '\n- ' + processElement(childEl);
                } else if (tag === 'ul' || tag === 'ol') {
                    text += '\n' + processElement(childEl) + '\n';
                } else {
                    text += processElement(childEl);
                }
            }
        });
        return text;
    };

    const finalResult = processElement(doc.body);
    // Cleanup: collapse multiple newlines and spaces, but keep structure
    return finalResult
        .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // Max 2 newlines
        .trim();
};

export const prepareNoteHtmlForRender = (value: string): { html: string; headings: NoteHeading[] } => {
    const html = sanitizeNoteHtml(toEditorHtml(value || ''));
    if (typeof window === 'undefined') return { html, headings: [] };

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const headings: NoteHeading[] = [];
    // Select standard headings AND paragraphs that look like section titles
    const els = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p');

    // Pattern for emoji numbers (1️⃣, 2️⃣, etc.) or "1. ", "2. " at start of paragraph
    const sectionPattern = /^(\d+️⃣|[\u2460-\u2473]|\d+\.|\u2022)\s*(.+)/;

    els.forEach((el, idx) => {
        let level: 1 | 2 | 3 | 4 | 5 | 6 = 3; // Default for pseudo-headings
        let isHeading = false;
        let text = (el.textContent || '').trim();

        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
            level = Number(el.tagName[1]) as any;
            isHeading = true;
        } else if (el.tagName === 'P') {
            // Check if paragraph starts with heading-like markers
            // We only count it if it's bold or has a specific emoji pattern
            const isBold = el.querySelector('strong, b') !== null;
            const matches = text.match(sectionPattern);

            if (matches && (isBold || text.length < 100)) {
                level = 3;
                isHeading = true;
            }
        }

        if (isHeading && text) {
            const id = `note-heading-${idx}`;
            el.setAttribute('data-note-heading-id', id);
            headings.push({
                id,
                text: text.length > 60 ? text.substring(0, 57) + '...' : text,
                level,
            });
        }
    });

    return { html: doc.body.innerHTML, headings };
};
