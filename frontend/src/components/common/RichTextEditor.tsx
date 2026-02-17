import { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Bold, Italic, Minus, Pilcrow } from 'lucide-react';
import { normalizeHtmlForCompare, toEditorHtml } from '../../lib/noteHtml';

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const FONT_STEP = 2;
const DEFAULT_FONT_SIZE = 14;
const COLOR_SWATCHES = [
    { label: 'Default', value: '' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Green', value: '#16a34a' },
];

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element: HTMLElement) => element.style.fontSize.replace('px', '') || null,
                        renderHTML: (attributes: { fontSize?: string | null }) => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}px` };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (fontSize: string) =>
                    ({ chain }: { chain: any }) =>
                        chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize:
                () =>
                    ({ chain }: { chain: any }) =>
                        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        } as any;
    },
});

interface RichTextEditorProps {
    value: string;
    onChange: (nextHtml: string) => void;
    placeholder?: string;
    minHeight?: number;
    maxHeight?: number;
    disabled?: boolean;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Write notes...',
    minHeight = 180,
    maxHeight = 360,
    disabled = false,
}: RichTextEditorProps) {
    const initialHtml = useMemo(() => toEditorHtml(value || ''), [value]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TextStyle,
            Color,
            FontSize,
            Placeholder.configure({
                placeholder,
            }),
        ],
        editable: !disabled,
        content: initialHtml,
        onUpdate: ({ editor: currentEditor }) => {
            onChange(currentEditor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;
        const current = normalizeHtmlForCompare(editor.getHTML());
        const incoming = normalizeHtmlForCompare(value || '');
        if (current !== incoming) {
            editor.commands.setContent(toEditorHtml(value || ''), { emitUpdate: false });
        }
    }, [editor, value]);

    if (!editor) {
        return (
            <div
                style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    minHeight,
                    background: 'var(--bg-content)',
                }}
            />
        );
    }

    const normalizeFontSize = (rawSize?: string | number | null): number => {
        const parsed = Number(rawSize ?? '');
        if (!Number.isFinite(parsed)) return DEFAULT_FONT_SIZE;
        return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parsed));
    };

    const getCurrentFontSize = (): number => {
        const currentAttr = editor.getAttributes('textStyle').fontSize as string | undefined;
        return normalizeFontSize(currentAttr);
    };

    return (
        <div
            style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                background: 'var(--bg-content)',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    padding: '0.55rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: 'var(--bg-main)',
                }}
            >
                <button type="button" className="hero-btn hero-btn-ghost" style={{ padding: '0.25rem 0.45rem' }} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold size={13} />
                </button>
                <button type="button" className="hero-btn hero-btn-ghost" style={{ padding: '0.25rem 0.45rem' }} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic size={13} />
                </button>
                <button type="button" className="hero-btn hero-btn-ghost" style={{ padding: '0.25rem 0.45rem' }} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                    <Minus size={13} />
                </button>
                <button type="button" className="hero-btn hero-btn-ghost" style={{ padding: '0.25rem 0.45rem' }} onClick={() => editor.chain().focus().unsetColor().unsetFontSize().run()}>
                    <Pilcrow size={13} />
                </button>

                <button
                    type="button"
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.25rem 0.45rem', fontSize: 'var(--text-xs)' }}
                    onClick={() => {
                        const next = normalizeFontSize(getCurrentFontSize() - FONT_STEP);
                        editor.chain().focus().setFontSize(String(next)).run();
                    }}
                    title="Decrease font size"
                >
                    <span style={{ fontWeight: 800, fontSize: '0.78rem', lineHeight: 1 }}>A</span>
                </button>
                <button
                    type="button"
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.25rem 0.45rem', fontSize: 'var(--text-xs)' }}
                    onClick={() => {
                        const next = normalizeFontSize(getCurrentFontSize() + FONT_STEP);
                        editor.chain().focus().setFontSize(String(next)).run();
                    }}
                    title="Increase font size"
                >
                    <span style={{ fontWeight: 800, fontSize: '1.02rem', lineHeight: 1 }}>A</span>
                </button>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.45rem',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-dim)',
                    }}
                    title="Current font size"
                >
                    <span style={{ fontWeight: 700, fontSize: '0.72rem', lineHeight: 1 }}>A</span>
                    {getCurrentFontSize()}px
                </span>

                {COLOR_SWATCHES.map((swatch) => (
                    <button
                        key={swatch.label}
                        type="button"
                        className="hero-btn hero-btn-ghost"
                        style={{ padding: '0.25rem 0.45rem', fontSize: 'var(--text-xs)' }}
                        onClick={() => {
                            if (!swatch.value) editor.chain().focus().unsetColor().run();
                            else editor.chain().focus().setColor(swatch.value).run();
                        }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '999px',
                                border: '1px solid var(--border-subtle)',
                                background: swatch.value || 'transparent',
                                display: 'inline-block',
                                marginRight: '0.35rem',
                            }}
                        />
                        {swatch.label}
                    </button>
                ))}

            </div>

            <div
                style={{
                    minHeight,
                    maxHeight,
                    overflowY: 'auto',
                    padding: '0.85rem 0.95rem',
                    cursor: 'text',
                }}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        e.preventDefault();
                        editor.chain().focus().run();
                    }
                }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
