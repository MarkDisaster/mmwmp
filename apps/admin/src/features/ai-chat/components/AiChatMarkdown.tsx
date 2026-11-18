import { memo } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { AiChatLink } from './AiChatLink';

const COMPONENTS: Components = {
   p: ({ children }) => <p className="wrap-break-word whitespace-pre-wrap">{children}</p>,
   a: ({ href, children }) => <AiChatLink href={href}>{children}</AiChatLink>,
   ul: ({ children }) => <ul className="flex list-disc flex-col gap-0.5 pl-4">{children}</ul>,
   ol: ({ children }) => <ol className="flex list-decimal flex-col gap-0.5 pl-4">{children}</ol>,
   li: ({ children }) => <li className="wrap-break-word">{children}</li>,
   h1: ({ children }) => <p className="font-semibold">{children}</p>,
   h2: ({ children }) => <p className="font-semibold">{children}</p>,
   h3: ({ children }) => <p className="font-semibold">{children}</p>,
   h4: ({ children }) => <p className="font-semibold">{children}</p>,
   blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-muted-foreground/40 pl-2 text-muted-foreground">
         {children}
      </blockquote>
   ),
   code: ({ children }) => (
      <code className="rounded bg-background/50 px-1 font-mono text-[12px]">{children}</code>
   ),
   pre: ({ children }) => (
      <pre className="overflow-x-auto rounded bg-background/50 p-2 font-mono text-[12px] [&>code]:bg-transparent [&>code]:p-0">
         {children}
      </pre>
   ),
   table: ({ children }) => (
      <div className="overflow-x-auto">
         <table className="border-collapse text-xs">{children}</table>
      </div>
   ),
   th: ({ children }) => (
      <th className="border border-border px-1.5 py-0.5 text-left font-semibold">{children}</th>
   ),
   td: ({ children }) => <td className="border border-border px-1.5 py-0.5">{children}</td>,
   hr: () => <hr className="border-border" />,
};

const REMARK_PLUGINS = [remarkGfm];

type Props = { text: string };

export const AiChatMarkdown = memo(({ text }: Props) => (
   <div className="flex flex-col gap-1.5">
      <Markdown
         remarkPlugins={REMARK_PLUGINS}
         components={COMPONENTS}
         skipHtml
         disallowedElements={['img']}
         unwrapDisallowed
      >
         {text}
      </Markdown>
   </div>
));
AiChatMarkdown.displayName = 'AiChatMarkdown';
