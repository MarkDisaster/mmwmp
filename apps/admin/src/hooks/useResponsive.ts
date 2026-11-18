import { useMediaQuery } from 'react-responsive';

const BREAKPOINTS = {
   md: 768,
   lg: 1024,
} as const;

export type Responsive = {
   isMobile: boolean;
   isTablet: boolean;
   isDesktop: boolean;
};

const MOBILE_MAX_WIDTH = BREAKPOINTS.md - 1;

export const useResponsive = (): Responsive => ({
   isMobile: useMediaQuery({ maxWidth: MOBILE_MAX_WIDTH }),
   isTablet: useMediaQuery({ minWidth: BREAKPOINTS.md, maxWidth: BREAKPOINTS.lg - 1 }),
   isDesktop: useMediaQuery({ minWidth: BREAKPOINTS.lg }),
});

export const isMobileViewport = (): boolean =>
   window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
