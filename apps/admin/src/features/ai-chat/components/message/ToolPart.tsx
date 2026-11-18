import { cn } from '@mm/utils/cn';
import {
   type ChatAddToolApproveResponseFunction,
   type DynamicToolUIPart,
   getToolName,
   type ToolUIPart,
} from 'ai';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AiChatLink } from '@/features/ai-chat/components/AiChatLink';
import { ApprovalTile } from '@/features/ai-chat/components/approval-tile/ApprovalTile';
import { ToolStatusTile } from '@/features/ai-chat/components/approval-tile/ToolStatusTile';
import { extractToolEntityLinks } from '@/features/ai-chat/utils/toolEntityLinks';

const formatToolOutput = (
   isError: boolean,
   errorText: string | undefined,
   output: unknown,
   fallbackError: string,
) => {
   if (isError) return errorText ?? fallbackError;
   if (typeof output === 'string') return output;
   return JSON.stringify(output, null, 2);
};

const ToolEntityLinks = ({ output }: { output: unknown }) => {
   const links = extractToolEntityLinks(output, window.location.origin);
   if (links.length === 0) return null;

   return (
      <ul className="flex flex-col gap-1">
         {links.map((link) => (
            <li key={link.href}>
               <AiChatLink
                  href={link.href}
                  className="flex w-fit max-w-full items-center gap-1.5 text-xs no-underline hover:underline hover:opacity-100"
               >
                  <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{link.label}</span>
               </AiChatLink>
            </li>
         ))}
      </ul>
   );
};

export const ToolPart = ({
   part,
   addToolApprovalResponse,
}: {
   part: ToolUIPart | DynamicToolUIPart;
   addToolApprovalResponse: ChatAddToolApproveResponseFunction;
}) => {
   const { t } = useTranslation();
   const toolName = getToolName(part);

   if (part.state === 'approval-requested') {
      return (
         <ApprovalTile
            toolName={toolName}
            input={part.input}
            approvalId={part.approval.id}
            addToolApprovalResponse={addToolApprovalResponse}
         />
      );
   }

   if (part.state === 'approval-responded') {
      return (
         <ToolStatusTile
            toolName={toolName}
            input={part.input}
            isDenied={!part.approval.approved}
         />
      );
   }

   if (part.state === 'output-denied') {
      return <ToolStatusTile toolName={toolName} input={part.input} isDenied />;
   }

   const isError = part.state === 'output-error';
   const hasOutput = part.state === 'output-available' || isError;

   const details = (
      <details
         className={cn(
            'rounded border px-2 py-1 font-mono text-[11px]',
            isError ? 'border-destructive/50 bg-destructive/10' : 'bg-background/50',
         )}
      >
         <summary className="cursor-pointer break-all">
            {isError && '⚠ '}
            <span className="font-semibold">{toolName}</span>
            {part.input !== undefined && (
               <span className="text-muted-foreground"> ({JSON.stringify(part.input)})</span>
            )}
         </summary>
         {hasOutput && (
            <pre className="mt-1 max-h-48 overflow-auto text-[10px] whitespace-pre-wrap">
               {formatToolOutput(isError, part.errorText, part.output, t('chat.error.generic'))}
            </pre>
         )}
      </details>
   );

   if (part.state !== 'output-available') return details;
   return (
      <>
         {details}
         <ToolEntityLinks output={part.output} />
      </>
   );
};
