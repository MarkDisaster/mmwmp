import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { SKIN_LIST } from '../engine/obstacles';
import { PHASES } from '../engine/phases';
import { PICKUP_LIST, type PickupKind } from '../engine/pickups';
import type { MilestoneKind } from '../engine/state';
import { unsupportedGlyphs } from '../render/pixelFont';
import type { MilestoneText } from '../render/render';
import type { Labels } from '../runtime/game';

const MILESTONE_KINDS: MilestoneKind[] = [...PHASES.map(({ id }) => id), 'delivered', 'version'];

function stringList(value: unknown): string[] {
   return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function pixelTitle(value: unknown): string {
   const title = typeof value === 'string' ? value : '';
   const missing = unsupportedGlyphs(title.replace('{version}', '1.0'));
   if (process.env.NODE_ENV !== 'production' && missing.length > 0) {
      console.warn(`RunnerGame: the pixel font cannot draw ${missing.join(' ')} in "${title}"`);
   }
   return title;
}

export function useGameLabels(): Labels {
   const t = useTranslations('RunnerGame');
   return useMemo<Labels>(
      () => ({
         deaths: Object.fromEntries(
            SKIN_LIST.map((k) => [k, stringList(t.raw(`enemies.${k}.deaths`))]),
         ) as Labels['deaths'],
         deliveredName: t('deliveredName'),
         pickupNames: Object.fromEntries(
            PICKUP_LIST.map((k) => [k, t(`pickupNames.${k}`)]),
         ) as Record<PickupKind, string>,
         milestones: Object.fromEntries(
            MILESTONE_KINDS.map((k) => [
               k,
               {
                  title: pixelTitle(t.raw(`phases.${k}.title`)),
                  subtitle: t(`phases.${k}.subtitle`),
               },
            ]),
         ) as Record<MilestoneKind, MilestoneText>,
      }),
      [t],
   );
}
