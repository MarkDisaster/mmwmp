import type { ProjectFormValues } from '@/features/projects/validation/projectSchema';

type ProjectLink = { label: string | null; url: string };

export const EMPTY_LINK = { label: '', url: '' };

export const toFormLinks = (links: ProjectLink[] | undefined): ProjectFormValues['links'] =>
   links?.length
      ? links.map((link) => ({ label: link.label ?? '', url: link.url }))
      : [{ ...EMPTY_LINK }];

export const countFilledLinks = (links: ProjectFormValues['links']) =>
   links.filter((link) => link.url.trim() !== '').length;

export const hasFilledLink = (links: ProjectFormValues['links']) => countFilledLinks(links) > 0;

export const toProjectLinks = (links: ProjectFormValues['links']): ProjectLink[] =>
   links
      .filter((link) => link.url.trim() !== '')
      .map((link) => ({ label: link.label?.trim() || null, url: link.url.trim() }));

export const focusIndexAfterRemove = (removedIndex: number, remaining: number) =>
   Math.max(0, Math.min(removedIndex, remaining - 1));
