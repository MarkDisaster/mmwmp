export type ProjectYears = { from: number; to: number | null };

type ProjectYearFields = {
   startYear?: number | null;
   endYear?: number | null;
   ongoing?: boolean | null;
};

export const getProjectYears = (
   project: ProjectYearFields,
   currentYear: number = new Date().getFullYear(),
): ProjectYears | null => {
   const from = project.startYear;
   if (from === null || from === undefined) return null;

   const to = project.ongoing ? Math.max(currentYear, from) : project.endYear;
   if (to === null || to === undefined || to === from) return { from, to: null };

   return { from, to };
};

export const formatProjectYears = ({ from, to }: ProjectYears): string =>
   to === null ? String(from) : `${from}–${to}`;
