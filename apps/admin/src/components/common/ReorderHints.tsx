import { useTranslation } from 'react-i18next';

import { InfoHint } from '@/components/common/InfoHint';

type ReorderHintsProps = {
   canReorder: boolean;
   itemCount: number;
   withCards?: boolean;
};

export const ReorderHints = ({ canReorder, itemCount, withCards = false }: ReorderHintsProps) => {
   const { t } = useTranslation();

   if (canReorder || itemCount <= 1) return null;
   const hint = withCards ? t('common.reorder.sortHintWithCards') : t('common.reorder.sortHint');
   return <InfoHint label={t('common.reorder.hintLabel')}>{hint}</InfoHint>;
};
