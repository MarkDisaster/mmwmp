import { servicePublicControllerFindAllPublished } from '@/api/generated/clients/servicePublicControllerFindAllPublished';
import { getPreviewAuthorization } from '@/features/draft-preview/utils/previewCredentials';

export const getPreviewServices = async (locale: string) =>
   (
      await servicePublicControllerFindAllPublished(undefined, {
         'Accept-Language': locale,
         Authorization: getPreviewAuthorization(),
      })
   ).data;
