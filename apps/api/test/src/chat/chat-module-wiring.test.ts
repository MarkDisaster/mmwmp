import { ChatController } from '../../../src/chat/chat.controller';
import { PageContextService } from '../../../src/chat/page-context.service';
import { getApp } from '../../setup/init';

describe('Chat module wiring (e2e)', () => {
   it('should resolve the chat controller and its page context service from the app', () => {
      expect(getApp().get(PageContextService)).toBeInstanceOf(PageContextService);
      expect(getApp().get(ChatController)).toBeInstanceOf(ChatController);
   });
});
