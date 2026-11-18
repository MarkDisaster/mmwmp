import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

export const useDebouncedParam = (value: string, commit: (value: string) => void) => {
   const [inputValue, setInputValue] = useState(value);
   const [committed, setCommitted] = useState(value);
   const [prevValue, setPrevValue] = useState(value);
   if (value !== prevValue) {
      setPrevValue(value);
      if (value !== committed) {
         setInputValue(value);
         setCommitted(value);
      }
   }

   const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
   useEffect(() => () => clearTimeout(timer.current), []);

   const onChange = (next: string) => {
      setInputValue(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
         setCommitted(next);
         commit(next);
      }, DEBOUNCE_MS);
   };

   return [inputValue, onChange] as const;
};
