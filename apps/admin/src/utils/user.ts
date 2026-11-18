export const PASSWORD_MIN_LENGTH = 8;

type AuthorLike = { firstName?: string; lastName?: string } | null | undefined;

export const getUserDisplayName = (
   firstName?: string | null,
   lastName?: string | null,
   email?: string | null,
): { fullName: string; displayName: string } => {
   const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
   const displayName = fullName || email || '';
   return { fullName, displayName };
};

export const getAuthorLabel = (author: AuthorLike): string =>
   getUserDisplayName(author?.firstName, author?.lastName).fullName || '—';

export const getUserInitials = (
   firstName?: string | null,
   lastName?: string | null,
   email?: string | null,
): string => {
   const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
   if (fullName) {
      return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase();
   }
   return email?.charAt(0).toUpperCase() || '?';
};
