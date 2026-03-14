import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { SAFE_INTERACTIVE_TRANSITION } from '../../../lib/uiMotion';

interface SafeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export const SafeButton = forwardRef<HTMLButtonElement, SafeButtonProps>(function SafeButton(
    { className, style, children, type = 'button', ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cn(className)}
            style={{
                transition: SAFE_INTERACTIVE_TRANSITION,
                ...style,
            }}
            {...props}
        >
            {children}
        </button>
    );
});
