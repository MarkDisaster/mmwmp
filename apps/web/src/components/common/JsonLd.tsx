import { safeJson } from '@/utils/safeJson';

type JsonLdProps = {
   data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
   return (
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />
   );
}
