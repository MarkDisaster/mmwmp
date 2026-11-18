export const getStartOfLocalDay = (now: Date): string =>
   new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

export const formatCount = (count: number, locale: string): string =>
   new Intl.NumberFormat(locale).format(count);

export const formatRunTime = (seconds: number | null | undefined): string | null => {
   if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null;
   const whole = Math.floor(seconds);
   return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
