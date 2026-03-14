import type { ReactNode } from 'react';
import { HeroUIProvider } from '@heroui/react';

interface AdInsightProviderBoundaryProps {
    children: ReactNode;
}

export function AdInsightProviderBoundary({ children }: AdInsightProviderBoundaryProps) {
    return <HeroUIProvider>{children}</HeroUIProvider>;
}
