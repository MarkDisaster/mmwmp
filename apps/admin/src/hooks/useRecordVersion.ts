import { useState } from 'react';

type Versioned = { id: number; version: number };

export const useRecordVersion = (record: Versioned | undefined, isDirty: boolean) => {
   const [base, setBase] = useState(record && { id: record.id, version: record.version });

   if (record && !isDirty && (base?.id !== record.id || record.version > base.version)) {
      setBase({ id: record.id, version: record.version });
   }

   return {
      version: base?.version,
      hasNewer:
         isDirty && record !== undefined && base !== undefined && record.version > base.version,
      adopt: (saved: Versioned) => setBase({ id: saved.id, version: saved.version }),
   };
};
