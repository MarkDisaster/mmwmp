import { useTranslation } from 'react-i18next';

import { InfoHint } from '@/components/common/InfoHint';
import { MAX_FILE_SIZE_MB } from '@/features/files/constants';

type FileTypesHelpProps = {
   imagesOnly?: boolean;
};

export const FileTypesHelp = ({ imagesOnly }: FileTypesHelpProps) => {
   const { t } = useTranslation();

   return (
      <InfoHint label={t('files.field.helpLabel')}>
         <p>
            {t(`files.field.types.${imagesOnly ? 'image' : 'file'}`)}{' '}
            {t('files.field.maxSize', { size: MAX_FILE_SIZE_MB })}
         </p>
      </InfoHint>
   );
};
