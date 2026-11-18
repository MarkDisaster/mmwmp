import { useMediaQuery } from 'react-responsive';

export const useIsTouchOnly = () => useMediaQuery({ query: '(hover: none) and (pointer: coarse)' });
