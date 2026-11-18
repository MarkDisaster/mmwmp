import { Badge } from '@/components/ui/badge';

type StatusBadgeProps = {
   status: 'draft' | 'published';
   label: string;
};

function StatusBadge({ status, label }: StatusBadgeProps) {
   return <Badge variant={status === 'published' ? 'default' : 'secondary'}>{label}</Badge>;
}

export { StatusBadge };
