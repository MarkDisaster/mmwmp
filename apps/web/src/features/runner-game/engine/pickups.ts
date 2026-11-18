import { GROUND_Y } from './constants';
import { KINDS, type ObstacleKind } from './obstacles';
import type { Reward } from './phases';
import type { Random } from './rng';

export type PickupKind = 'commit' | 'review' | 'deploy' | 'skill' | 'feedback' | 'docs';

export type Pickup = {
   kind: PickupKind;
   x: number;
   prevX?: number;
   y: number;
   label: string;
   taken: boolean;
};

export const PICKUPS: Record<PickupKind, { w: number; h: number; points: number }> = {
   commit: { w: 5, h: 5, points: 1 },
   review: { w: 7, h: 6, points: 2 },
   deploy: { w: 7, h: 9, points: 3 },
   skill: { w: 28, h: 9, points: 10 },
   feedback: { w: 7, h: 4, points: 2 },
   docs: { w: 7, h: 8, points: 5 },
};

export const PICKUP_LIST = Object.keys(PICKUPS) as PickupKind[];

type SkillGroup = 'fe' | 'be' | 'devops' | 'design' | 'ai';

const SKILLS: Record<SkillGroup, readonly string[]> = {
   fe: [
      'React',
      'Next.js',
      'TypeScript',
      'JavaScript',
      'HTML',
      'CSS',
      'Sass',
      'Tailwind',
      'Storybook',
      'Vite',
      'Webpack',
      'Redux',
      'Zustand',
      'TanStack',
      'Zod',
      'Motion',
      'Radix UI',
      'a11y',
      'PWA',
      'i18n',
   ],
   be: [
      'Node.js',
      'NestJS',
      'Express',
      'Prisma',
      'PostgreSQL',
      'MySQL',
      'MongoDB',
      'Redis',
      'REST API',
      'GraphQL',
      'tRPC',
      'WebSocket',
      'JWT',
      'OAuth',
      'Swagger',
      'Kafka',
      'RabbitMQ',
      'Python',
      'Go',
      'Bun',
   ],
   devops: [
      'Docker',
      'Kubernetes',
      'Vercel',
      'Railway',
      'Cloudflare',
      'AWS',
      'GCP',
      'Azure',
      'Terraform',
      'GitHub',
      'GitLab',
      'CI/CD',
      'Turborepo',
      'pnpm',
      'Nginx',
      'Linux',
      'Bash',
      'Sentry',
      'Grafana',
      'Neon',
   ],
   design: [
      'Figma',
      'UX/UI',
      'Typography',
      'Prototype',
      'Wireframe',
      'Design Sys',
      'Tokens',
      'Grid',
      'Color',
      'Icons',
      'Branding',
      'Motion UX',
      'Usability',
      'Persona',
      'User Flow',
      'Moodboard',
      'A/B test',
      'Pixel art',
      'Layout',
      'Mobile UX',
   ],
   ai: [
      'Claude',
      'LLM',
      'RAG',
      'MCP',
      'Prompting',
      'Agents',
      'Embeddings',
      'Vectors',
      'Fine-tune',
      'OpenAI',
      'Anthropic',
      'LangChain',
      'Ollama',
      'Whisper',
      'Tool use',
      'Evals',
      'Context',
      'Streaming',
      'Copilot',
      'Cursor',
   ],
};

const SKILL_GROUPS = Object.keys(SKILLS) as SkillGroup[];

function randomSkill(random: Random): string {
   const group = SKILLS[SKILL_GROUPS[Math.floor(random() * SKILL_GROUPS.length)]];
   return group[Math.floor(random() * group.length)];
}

const RUN = GROUND_Y - 10;
const LOW = GROUND_Y - 22;
const HIGH = GROUND_Y - 34;
const TIERS = [RUN, LOW, HIGH] as const;
const TIER_WEIGHTS = [0.35, 0.45, 0.2] as const;

const SKILL_CHANCE = 0.1;
const DOCS_CHANCE = 0.05;
const REVIEW_CHANCE = 0.2;

const COMMIT_SPACING = 7;
const MAX_COMMITS = 5;
const PLANNING_MAX_COMMITS = 3;

export type PickupRules = {
   planning: boolean;
   review: boolean;
   skill: boolean;
   docs: boolean;
};

const pickup = (kind: PickupKind, x: number, y: number, label = ''): Pickup => ({
   kind,
   x,
   y,
   label,
   taken: false,
});

function randomTier(planning: boolean, random: Random): number {
   if (planning) return random() < 0.5 ? RUN : LOW;
   let roll = random();
   for (let i = 0; i < TIERS.length; i++) {
      roll -= TIER_WEIGHTS[i];
      if (roll <= 0) return TIERS[i];
   }
   return LOW;
}

type CommitShape = 'line' | 'arc' | 'stairs';
const SHAPES: CommitShape[] = ['line', 'arc', 'stairs'];

function shapeOffset(shape: CommitShape, i: number, n: number): number {
   if (shape === 'arc' && n > 2) return -Math.round(Math.sin((Math.PI * i) / (n - 1)) * 6);
   if (shape === 'stairs') return -i * 3;
   return 0;
}

function commitGroup(x: number, planning: boolean, random: Random): Pickup[] {
   const n = 1 + Math.floor(random() * (planning ? PLANNING_MAX_COMMITS : MAX_COMMITS));
   const shape = SHAPES[Math.floor(random() * SHAPES.length)];
   const base = shape === 'stairs' ? RUN : randomTier(planning, random);
   return Array.from({ length: n }, (_, i) =>
      pickup('commit', x + i * COMMIT_SPACING, Math.max(HIGH, base + shapeOffset(shape, i, n))),
   );
}

export function pickupGroup(
   x: number,
   rules: PickupRules,
   random: Random,
): { pickups: Pickup[]; width: number } {
   const roll = random();
   if (rules.skill && roll < SKILL_CHANCE) {
      return { pickups: [pickup('skill', x, HIGH - 2, randomSkill(random))], width: 28 };
   }
   if (rules.docs && roll > SKILL_CHANCE && roll < SKILL_CHANCE + DOCS_CHANCE) {
      return { pickups: [pickup('docs', x, HIGH)], width: 7 };
   }
   if (rules.review && roll > 1 - REVIEW_CHANCE)
      return { pickups: [pickup('review', x, HIGH)], width: 7 };
   const pickups = commitGroup(x, rules.planning, random);
   return { pickups, width: pickups.length * COMMIT_SPACING };
}

const reviewOver = (center: number) => pickup('review', center - 3, GROUND_Y - 38);
const releaseOver = (center: number) => pickup('deploy', center - 3, GROUND_Y - 30);

export function rewardPickup(reward: Reward, kind: ObstacleKind, x: number): Pickup {
   const center = x + KINDS[kind].width / 2;
   return reward === 'review' ? reviewOver(center) : releaseOver(center);
}

const TALL: ObstacleKind[] = ['semicolon', 'legacy', 'merge', 'meeting'];

export function obstaclePickups(
   kind: ObstacleKind,
   x: number,
   rules: PickupRules,
   random: Random,
): Pickup[] {
   const center = x + KINDS[kind].width / 2;
   if (!rules.planning && KINDS[kind].pit) {
      const chance = kind === 'pit500' ? 0.8 : 0.6;
      return random() < chance ? [releaseOver(center)] : [];
   }
   if (rules.review && TALL.includes(kind) && random() < 0.2) return [reviewOver(center)];
   return [];
}

const ARC_COMMITS = 7;
const ARC_SPACING = 9;

export function deliveryArc(x: number): Pickup[] {
   const commits = Array.from({ length: ARC_COMMITS }, (_, i) =>
      pickup(
         'commit',
         x + i * ARC_SPACING,
         LOW - Math.round(Math.sin((Math.PI * i) / (ARC_COMMITS - 1)) * 5),
      ),
   );
   return [...commits, pickup('feedback', x + ARC_COMMITS * ARC_SPACING, LOW)];
}
