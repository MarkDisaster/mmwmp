import { promises as fs } from 'node:fs';

import { Logger } from '@nestjs/common';

import { PromptRegistryService } from '../prompt-registry.service';

const loadPrompts = async (files: Record<string, string>): Promise<PromptRegistryService> => {
   jest.spyOn(fs, 'readdir').mockResolvedValue(Object.keys(files) as never);
   jest
      .spyOn(fs, 'readFile')
      .mockImplementation((file) =>
         Promise.resolve(files[String(file).split('/').pop() ?? ''] as never),
      );
   const service = new PromptRegistryService();
   await service.onModuleInit();
   return service;
};

describe('PromptRegistryService', () => {
   let warn: jest.SpyInstance;

   beforeEach(() => {
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
   });

   afterEach(() => {
      jest.restoreAllMocks();
   });

   describe('render', () => {
      it('substitutes every provided variable', async () => {
         const service = await loadPrompts({ 'a.md': 'Hi {{name}}, {{name}} and {{other}}.' });

         expect(service.render('a', { name: 'X', other: 'Y' })).toBe('Hi X, X and Y.');
         expect(warn).not.toHaveBeenCalled();
      });

      it('inserts a value that contains a placeholder verbatim and does not warn about it', async () => {
         const service = await loadPrompts({ 'a.md': '{{source}} / {{target}}' });

         const rendered = service.render('a', { source: 'text with {{target}}', target: 'cs' });

         expect(rendered).toBe('text with {{target}} / cs');
         expect(warn).not.toHaveBeenCalled();
      });

      it('inserts `$` sequences in a value literally', async () => {
         const service = await loadPrompts({ 'a.md': 'Price: {{price}}' });

         expect(service.render('a', { price: "$& $1 $'" })).toBe("Price: $& $1 $'");
      });

      it('substitutes an empty string and leaves unknown placeholders with one warning', async () => {
         const service = await loadPrompts({ 'a.md': '[{{empty}}] {{missing}} {{missing}}' });

         expect(service.render('a', { empty: '' })).toBe('[] {{missing}} {{missing}}');
         expect(warn).toHaveBeenCalledTimes(1);
         expect(warn).toHaveBeenCalledWith(expect.stringContaining('{{missing}}'));
      });

      it('does not resolve a placeholder from the object prototype', async () => {
         const service = await loadPrompts({ 'a.md': '{{constructor}}' });

         expect(service.render('a')).toBe('{{constructor}}');
         expect(warn).toHaveBeenCalledTimes(1);
      });

      it('throws for an unknown prompt', async () => {
         const service = await loadPrompts({ 'a.md': 'x' });

         expect(() => service.render('b')).toThrow('Prompt not found: b');
      });
   });

   it('logs a readable reason when the prompts cannot be loaded', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValue('disk gone' as never);
      const service = new PromptRegistryService();

      await service.onModuleInit();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disk gone'));
      expect(service.list()).toEqual([]);
   });
});
