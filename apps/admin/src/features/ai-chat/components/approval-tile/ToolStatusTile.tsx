import { cn } from '@mm/utils/cn';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
   describeBulkSummary,
   describeTagLine,
   describeToolInput,
   describeUserLine,
} from '@/features/ai-chat/utils/describeToolInput';
import { summarizeFileRenames } from '@/features/ai-chat/utils/summarizeFileRenames';
import { summarizeTagInput } from '@/features/ai-chat/utils/summarizeTagInput';
import { findCachedUser, summarizeUserInput } from '@/features/ai-chat/utils/summarizeUserInput';

export const ToolStatusTile = ({
   toolName,
   input,
   isDenied,
}: {
   toolName: string;
   input?: unknown;
   isDenied: boolean;
}) => {
   const { t, i18n } = useTranslation();
   const queryClient = useQueryClient();
   const tagLines = summarizeTagInput(toolName, input);
   const userLine = summarizeUserInput(toolName, input, (id) => findCachedUser(queryClient, id));
   const bulk = summarizeFileRenames(input);
   const inputLabel = describeToolInput(
      input,
      tagLines?.map((line) => describeTagLine(line, t)) ??
         (userLine ? [describeUserLine(userLine, t)] : null) ??
         (bulk ? [describeBulkSummary(bulk, t, i18n.language)] : null),
   );
   return (
      <div
         className={cn(
            'rounded border px-2 py-1 font-mono text-[11px]',
            isDenied
               ? 'border-muted-foreground/30 bg-background/50 text-muted-foreground'
               : 'bg-background/50',
         )}
      >
         <span className="font-semibold">{toolName}</span>
         {inputLabel !== null && (
            <span className="ml-1 break-all text-muted-foreground">({inputLabel})</span>
         )}
         <span className="text-muted-foreground">
            {' — '}
            {isDenied ? t('chat.approval.deny') : t('chat.approval.processing')}
         </span>
      </div>
   );
};
