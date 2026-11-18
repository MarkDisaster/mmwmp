import { Badge } from '@/components/ui/badge';

type LanguageBadgeProps = {
   language: string;
};

function LanguageBadge({ language }: LanguageBadgeProps) {
   return (
      <Badge variant="secondary" className="text-xs">
         {language}
      </Badge>
   );
}

export { LanguageBadge };
