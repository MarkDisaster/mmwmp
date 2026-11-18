import { cn } from '@mm/utils/cn';
import {
   type ChatAddToolApproveResponseFunction,
   type FileUIPart,
   isFileUIPart,
   isToolUIPart,
   type UIMessage,
} from 'ai';
import { File as FileIcon } from 'lucide-react';

import { AssistantSpeakerControl } from '@/features/ai-chat/components/message/AssistantSpeakerControl';
import { ToolPart } from '@/features/ai-chat/components/message/ToolPart';
import { stripControlTags } from '@/features/ai-chat/utils/controlTags';
import { toSpokenText } from '@/features/ai-chat/utils/speech';

import { AiChatMarkdown } from './AiChatMarkdown';

type Props = {
   message: UIMessage;
   addToolApprovalResponse: ChatAddToolApproveResponseFunction;
   isFinalized: boolean;
};

export const AiChatMessage = ({ message, addToolApprovalResponse, isFinalized }: Props) => {
   const isUser = message.role === 'user';
   const parts = message.parts ?? [];

   if (parts.length === 0) return null;

   const spokenText = !isUser
      ? parts
           .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
           .map((p) => toSpokenText(p.text))
           .join(' ')
           .trim()
      : '';

   return (
      <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : '')}>
         <div
            className={cn(
               'flex max-w-[85%] flex-col gap-1.5 rounded-lg px-3 py-2 text-sm',
               isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
            )}
         >
            {parts.map((part, idx) => (
               <PartRenderer
                  key={idx}
                  part={part}
                  isUser={isUser}
                  addToolApprovalResponse={addToolApprovalResponse}
               />
            ))}
            {!isUser && spokenText.length > 0 && (
               <AssistantSpeakerControl
                  messageId={message.id}
                  text={spokenText}
                  isFinalized={isFinalized}
               />
            )}
         </div>
      </div>
   );
};

const TextPart = ({ text, isUser }: { text: string; isUser: boolean }) => {
   const displayText = stripControlTags(text);
   if (!displayText) return null;
   if (isUser) return <p className="wrap-break-word whitespace-pre-wrap">{displayText}</p>;
   return <AiChatMarkdown text={displayText} />;
};

const PartRenderer = ({
   part,
   isUser,
   addToolApprovalResponse,
}: {
   part: UIMessage['parts'][number];
   isUser: boolean;
   addToolApprovalResponse: ChatAddToolApproveResponseFunction;
}) => {
   if (part.type === 'text') return <TextPart text={part.text} isUser={isUser} />;

   if (isFileUIPart(part)) return <FilePartChip part={part} />;

   if (isToolUIPart(part)) {
      return <ToolPart part={part} addToolApprovalResponse={addToolApprovalResponse} />;
   }

   return null;
};

const FilePartChip = ({ part }: { part: FileUIPart }) => (
   <a
      href={part.url}
      target="_blank"
      rel="noreferrer"
      className="flex w-fit max-w-full items-center gap-1.5 text-xs underline-offset-2 hover:underline"
   >
      <FileIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{part.filename ?? part.mediaType}</span>
   </a>
);
