import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PromptRegistryService implements OnModuleInit {
   private readonly logger = new Logger(PromptRegistryService.name);
   private readonly promptsDir = __dirname;
   private readonly cache = new Map<string, string>();

   async onModuleInit(): Promise<void> {
      await this.loadAll();
   }

   render(name: string, variables: Record<string, string> = {}): string {
      const template = this.cache.get(name);
      if (!template) {
         throw new Error(`Prompt not found: ${name}`);
      }
      const missing = new Set<string>();
      const rendered = template.replace(/\{\{([^}]+)\}\}/g, (placeholder, key: string) => {
         if (Object.hasOwn(variables, key)) return variables[key];
         missing.add(placeholder);
         return placeholder;
      });
      if (missing.size > 0) {
         this.logger.warn(
            `Prompt "${name}" has unresolved placeholders: ${[...missing].join(', ')}`,
         );
      }
      return rendered;
   }

   has(name: string): boolean {
      return this.cache.has(name);
   }

   list(): string[] {
      return Array.from(this.cache.keys());
   }

   private async loadAll(): Promise<void> {
      try {
         const files = await fs.readdir(this.promptsDir);
         const mdFiles = files.filter((f) => f.endsWith('.md'));

         await Promise.all(
            mdFiles.map(async (file) => {
               const content = await fs.readFile(path.join(this.promptsDir, file), 'utf-8');
               const name = file.replace(/\.md$/, '');
               this.cache.set(name, content);
            }),
         );

         this.logger.log(`Loaded ${this.cache.size} prompts: ${this.list().join(', ') || 'none'}`);
      } catch (err) {
         this.logger.warn(
            `Failed to load prompts from ${this.promptsDir}: ${err instanceof Error ? err.message : String(err)}`,
         );
      }
   }
}
