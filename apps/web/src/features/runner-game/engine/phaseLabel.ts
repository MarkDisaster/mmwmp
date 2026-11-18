import type { PhaseId } from './phases';

export type VersionLabel = `v${number}.${number}`;

export type PhaseLabel = PhaseId | 'delivered' | VersionLabel;

export const isVersionLabel = (label: PhaseLabel): label is VersionLabel =>
   /^v\d+\.\d+$/.test(label);
