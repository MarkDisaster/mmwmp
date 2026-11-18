/* eslint-disable */

export type UpdateProjectDto = {
   slug?: string;
   company?: string | null;
   startYear?: number | null;
   endYear?: number | null;
   ongoing?: boolean;
   showOnHomepage?: boolean;
   thumbnailId?: number | null;
   version?: number;
};
