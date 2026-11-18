import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
   projectControllerGetPreviewUrl,
   type ProjectPreviewUrlEntity,
   serviceControllerGetPreviewUrl,
} from '@/api/generated';
import { toLanguageCode } from '@/utils/language';

type PreviewResource = 'projects' | 'services';

const fetchPreviewUrl = (
   resource: PreviewResource,
   id: number,
   locale: string,
): Promise<ProjectPreviewUrlEntity> => {
   const request =
      resource === 'projects' ? projectControllerGetPreviewUrl : serviceControllerGetPreviewUrl;
   return request(id, { locale }).then((response) => response.data);
};

export const openInNewTab = async (loadUrl: () => Promise<string>): Promise<boolean> => {
   const tab = window.open('about:blank', '_blank');
   if (!tab) return false;
   tab.opener = null;
   try {
      tab.location.href = await loadUrl();
      return true;
   } catch {
      tab.close();
      return false;
   }
};

export const usePreviewUrl = (resource: PreviewResource) => {
   const { t, i18n } = useTranslation();

   return useCallback(
      async (id: number, locale: string = toLanguageCode(i18n.language)) => {
         const opened = await openInNewTab(() =>
            fetchPreviewUrl(resource, id, locale).then((data) => data.previewUrl),
         );
         if (!opened) toast.error(t('common.error'));
      },
      [resource, t, i18n.language],
   );
};
