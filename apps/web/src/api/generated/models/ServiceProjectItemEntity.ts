/* eslint-disable */

import type { ServiceProjectTranslationEntity } from './ServiceProjectTranslationEntity';

export type ServiceProjectItemEntity = {
   id: number;
   slug: string;
   translations: ServiceProjectTranslationEntity[];
};
