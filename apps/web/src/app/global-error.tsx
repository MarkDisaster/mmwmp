'use client';

import './globals.css';

import { fontVariables } from './fonts/fonts';

type GlobalErrorProps = {
   error: Error & { digest?: string };
   reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
   return (
      <html lang="cs" className={fontVariables}>
         <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center text-foreground">
            <h2 className="font-heading text-2xl font-semibold">
               Něco se pokazilo <span lang="en">/ Something went wrong</span>
            </h2>
            <button
               onClick={reset}
               className="rounded-full border-3 border-border px-6 py-2 font-bold uppercase transition-all duration-400 hover:bg-brand hover:text-brand-foreground"
            >
               Zkusit znovu <span lang="en">/ Try again</span>
            </button>
         </body>
      </html>
   );
}
