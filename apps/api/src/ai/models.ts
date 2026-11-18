export const GOOGLE_MODEL_ID = 'gemini-3.5-flash';

export const ANTHROPIC_MODEL_ID = 'claude-opus-4-7';

export const PROVIDER_IDS = ['google', 'anthropic'] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];
