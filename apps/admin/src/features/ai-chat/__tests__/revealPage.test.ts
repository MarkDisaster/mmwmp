import { beforeEach, describe, expect, it } from 'vitest';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';

const setMode = (mode: Parameters<ReturnType<typeof useAiChatStore.getState>['setMode']>[0]) =>
   useAiChatStore.getState().setMode(mode);

const revealPage = (isMobile: boolean) => {
   useAiChatStore.getState().revealPage(isMobile);
   return useAiChatStore.getState().mode;
};

describe('revealPage', () => {
   beforeEach(() => {
      setMode('closed');
   });

   it('should move a full-screen chat to the side panel on a wide screen', () => {
      setMode('fullpage');

      expect(revealPage(false)).toBe('sidebar');
      expect(useAiChatStore.getState().lastOpenMode).toBe('sidebar');
   });

   it('should leave the side panel and the floating window as they are', () => {
      setMode('sidebar');
      expect(revealPage(false)).toBe('sidebar');

      setMode('floating');
      expect(revealPage(false)).toBe('floating');
   });

   it('should close the chat on a phone and reopen it in the mode it had', () => {
      setMode('floating');

      expect(revealPage(true)).toBe('closed');
      useAiChatStore.getState().reopen();
      expect(useAiChatStore.getState().mode).toBe('floating');
   });

   it('should keep a closed chat closed', () => {
      expect(revealPage(false)).toBe('closed');
      expect(revealPage(true)).toBe('closed');
   });
});
