import { readdirSync } from 'node:fs';
import path from 'node:path';

import { AiTool, type AiToolHandler, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';

export type ToolClass = { new (...deps: never[]): AiToolHandler; readonly name: string };

export type DiscoveredTool = { file: string; Class: ToolClass; meta: AiToolMetadata };

export const SRC_DIR = path.resolve(__dirname, '..', '..', '..');

export const discoverToolsOnDisk = (): DiscoveredTool[] =>
   readdirSync(SRC_DIR, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.tool.ts') && file.includes(`${path.sep}tools${path.sep}`))
      .sort()
      .map((file) => {
         const exported = require(path.join(SRC_DIR, file)) as Record<string, unknown>;
         const classes = Object.values(exported).filter(
            (value): value is ToolClass =>
               typeof value === 'function' && value.name.endsWith('Tool'),
         );
         if (classes.length !== 1) {
            throw new Error(
               `${file} must export exactly one *Tool class, found ${classes.length}.`,
            );
         }
         const [Class] = classes;
         const meta = Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata | undefined;
         if (!meta) {
            throw new Error(`${file} exports ${Class.name} without an @AiTool() decorator.`);
         }
         return { file, Class, meta };
      });
