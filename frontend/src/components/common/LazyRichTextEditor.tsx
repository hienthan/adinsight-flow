import { Suspense, lazy } from 'react';
import type { RichTextEditorProps } from './RichTextEditor';

const RichTextEditor = lazy(() => import('./RichTextEditor'));

export default function LazyRichTextEditor(props: RichTextEditorProps) {
    const minHeightValue = props.minHeight ?? 180;
    const minHeight = typeof minHeightValue === 'number' ? `${minHeightValue}px` : minHeightValue;

    return (
        <Suspense
            fallback={
                <div
                    style={{
                        minHeight,
                        borderRadius: props.variant === 'minimal' ? '12px' : '16px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-overlay)',
                    }}
                />
            }
        >
            <RichTextEditor {...props} />
        </Suspense>
    );
}
