import { useEffect, useState } from 'react';

type ObjectUrl = { source: Blob; url: string };

export const useObjectUrl = (source: Blob | null | undefined): string | null => {
   const [objectUrl, setObjectUrl] = useState<ObjectUrl | null>(null);

   useEffect(() => {
      if (!source) return;
      const url = URL.createObjectURL(source);
      setObjectUrl({ source, url });
      return () => URL.revokeObjectURL(url);
   }, [source]);

   return objectUrl && objectUrl.source === source ? objectUrl.url : null;
};
