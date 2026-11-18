import { useQueryClient } from '@tanstack/react-query';
import type { ChatAddToolApproveResponseFunction } from 'ai';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EditLockNote } from '@/features/ai-chat/components/approval-tile/EditLockNote';
import { RolePermissionsLines } from '@/features/ai-chat/components/approval-tile/PermissionDiff';
import { useCurrentRole } from '@/features/ai-chat/components/approval-tile/useCurrentRole';
import {
   describeBulkHeader,
   describeBulkLine,
   describeTagLine,
   describeToolInput,
   describeUserLine,
} from '@/features/ai-chat/utils/describeToolInput';
import { summarizeFileRenames } from '@/features/ai-chat/utils/summarizeFileRenames';
import { summarizeRolePermissions } from '@/features/ai-chat/utils/summarizeRolePermissions';
import { summarizeTagInput } from '@/features/ai-chat/utils/summarizeTagInput';
import { findCachedUser, summarizeUserInput } from '@/features/ai-chat/utils/summarizeUserInput';

export const ApprovalTile = ({
   toolName,
   input,
   approvalId,
   addToolApprovalResponse,
}: {
   toolName: string;
   input: unknown;
   approvalId: string;
   addToolApprovalResponse: ChatAddToolApproveResponseFunction;
}) => {
   const { t, i18n } = useTranslation();
   const [expanded, setExpanded] = useState(false);
   const listId = useId();
   const queryClient = useQueryClient();
   const fileRenames = summarizeFileRenames(input, { expandAll: expanded });
   const tagLines = summarizeTagInput(toolName, input);
   const userLine = summarizeUserInput(toolName, input, (id) => findCachedUser(queryClient, id));
   const currentRole = useCurrentRole(toolName, input);
   const roleSummary = summarizeRolePermissions(toolName, input, currentRole);
   const inputLabel =
      fileRenames || tagLines || userLine || roleSummary ? null : describeToolInput(input);
   const canExpand = expanded || (fileRenames?.more ?? 0) > 0;

   return (
      <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px]">
         <div className="flex items-baseline gap-2">
            <span className="font-semibold text-destructive">{toolName}</span>
            {inputLabel !== null && (
               <span className="font-mono text-[11px] break-all text-muted-foreground">
                  ({inputLabel})
               </span>
            )}
         </div>
         <EditLockNote toolName={toolName} input={input} />
         {tagLines && (
            <ul className="list-disc pl-4 text-[12px] text-muted-foreground">
               {tagLines.map((line) => {
                  const text = describeTagLine(line, t);
                  return (
                     <li key={text} className="break-all">
                        {text}
                     </li>
                  );
               })}
            </ul>
         )}
         {userLine && <p className="text-[12px] font-semibold">{describeUserLine(userLine, t)}</p>}
         {roleSummary && <RolePermissionsLines summary={roleSummary} />}
         {fileRenames && (
            <div className="text-[12px]">
               <p className="font-semibold">
                  {t('chat.approval.filesCount', { count: fileRenames.count })}
               </p>
               {fileRenames.header && (
                  <p className="font-semibold">
                     {describeBulkHeader(fileRenames.header, t, i18n.language)}
                  </p>
               )}
               <ul id={listId} className="list-disc pl-4 text-muted-foreground">
                  {fileRenames.lines.map((line, index) => {
                     const text = describeBulkLine(line, t, i18n.language);
                     return (
                        <li key={`${index}:${text}`} className="break-all">
                           {text}
                        </li>
                     );
                  })}
                  {fileRenames.more > 0 && (
                     <li>{t('chat.approval.filesMore', { count: fileRenames.more })}</li>
                  )}
               </ul>
               {canExpand && (
                  <Button
                     type="button"
                     size="sm"
                     variant="link"
                     aria-expanded={expanded}
                     aria-controls={listId}
                     className="h-auto px-0 text-[12px]"
                     onClick={() => setExpanded((value) => !value)}
                  >
                     {t(expanded ? 'chat.approval.showLess' : 'chat.approval.showAll')}
                  </Button>
               )}
            </div>
         )}
         <div className="flex gap-2">
            <Button
               type="button"
               size="sm"
               variant="destructive"
               onClick={() => addToolApprovalResponse({ id: approvalId, approved: true })}
            >
               {t('chat.approval.approve')}
            </Button>
            <Button
               type="button"
               size="sm"
               variant="outline"
               onClick={() => addToolApprovalResponse({ id: approvalId, approved: false })}
            >
               {t('chat.approval.deny')}
            </Button>
         </div>
      </div>
   );
};
