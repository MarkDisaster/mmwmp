import { Lock } from 'lucide-react';

type ReadOnlyNoticeProps = {
   message: string;
};

export const ReadOnlyNotice = ({ message }: ReadOnlyNoticeProps) => (
   <div role="status" className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm">{message}</p>
   </div>
);
