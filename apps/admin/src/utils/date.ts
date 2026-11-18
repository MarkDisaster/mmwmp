export const formatDate = (date: string | Date, locale: string): string =>
   new Date(date).toLocaleDateString(locale);

export const formatDateTime = (date: string | Date, locale: string): string =>
   new Date(date).toLocaleString(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
   });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
   ['minute', 60],
   ['hour', 24],
   ['day', 7],
];

export const formatRelativeDate = (date: string | Date, locale: string): string => {
   const d = new Date(date);
   if (Number.isNaN(d.getTime())) return '—';

   const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
   let elapsed = Math.floor((Date.now() - d.getTime()) / 60_000);
   if (elapsed < 1) return format.format(0, 'second');

   for (const [unit, limit] of RELATIVE_UNITS) {
      if (elapsed < limit) return format.format(-elapsed, unit);
      elapsed = Math.floor(elapsed / limit);
   }
   return d.toLocaleDateString(locale);
};
