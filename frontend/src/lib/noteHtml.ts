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
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

/**
 * Collapse runs of consecutive empty <p> elements.
 * Keeps at most `maxGap` empty paragraphs between content blocks.
 */
const collapseEmptyParagraphs = (container: HTMLElement, maxGap = 1): void => {
    const isEmptyParagraph = (el: Element): boolean => {
        if (el.tagName !== 'P') return false;
        const text = (el.textContent || '').trim();
        if (text) return false;
        // A <p> with only <br> or nothing inside counts as empty
        const childNodes = Array.from(el.childNodes);
        return childNodes.every(
            n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'BR')
        );
    };

    const children = Array.from(container.children);
    let consecutiveEmpty = 0;
    const toRemove: Element[] = [];

    for (const child of children) {
        if (isEmptyParagraph(child)) {
            consecutiveEmpty++;
            if (consecutiveEmpty > maxGap) {
                toRemove.push(child);
            }
        } else {
            consecutiveEmpty = 0;
        }
    }

    // Also remove leading and trailing empty paragraphs
    // Leading
    for (const child of children) {
        if (isEmptyParagraph(child) && !toRemove.includes(child)) {
            toRemove.push(child);
        } else if (!isEmptyParagraph(child)) {
            break;
        }
    }
    // Trailing
    for (let i = children.length - 1; i >= 0; i--) {
        if (isEmptyParagraph(children[i]) && !toRemove.includes(children[i])) {
            toRemove.push(children[i]);
        } else if (!isEmptyParagraph(children[i])) {
            break;
        }
    }

    for (const el of toRemove) {
        el.remove();
    }
};

export const prepareNoteHtmlForRender = (value: string): { html: string; headings: NoteHeading[] } => {
    const html = sanitizeNoteHtml(toEditorHtml(value || ''));
    if (typeof window === 'undefined') return { html, headings: [] };

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Auto-clean excessive line breaks for professional layout
    collapseEmptyParagraphs(doc.body);
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
