const isPrimitive = (value: unknown): boolean =>
   value === null || (typeof value !== 'object' && typeof value !== 'function');

const formatValue = (value: unknown): string =>
   typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));

export const formatToolInput = (input: unknown): string | null => {
   if (input == null) return null;
   if (typeof input !== 'object' || Array.isArray(input)) return formatValue(input);
   const entries = Object.entries(input as Record<string, unknown>);
   if (entries.length === 1 && isPrimitive(entries[0][1])) return String(entries[0][1]);
   return entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join('; ');
};
