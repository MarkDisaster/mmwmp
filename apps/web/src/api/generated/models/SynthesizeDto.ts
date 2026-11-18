/* eslint-disable */

export const synthesizeDtoVoiceEnum = {
   nova: 'nova',
   alloy: 'alloy',
   echo: 'echo',
   onyx: 'onyx',
   shimmer: 'shimmer',
   fable: 'fable',
} as const;

export type SynthesizeDtoVoiceEnumKey =
   (typeof synthesizeDtoVoiceEnum)[keyof typeof synthesizeDtoVoiceEnum];

export type SynthesizeDto = {
   text: string;
   voice?: SynthesizeDtoVoiceEnumKey;
};
