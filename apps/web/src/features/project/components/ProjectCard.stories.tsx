import type { Meta, StoryObj } from '@storybook/nextjs';

import type { ProjectCardData } from '@/features/project/utils/projectCard';

import { ProjectCard } from './ProjectCard';

const baseProject: ProjectCardData = {
   id: 1,
   slug: 'sample-project',
   title: 'Marek.media — personal portfolio',
   thumbnail: {
      url: 'https://placehold.co/1160x527/0a0a0a/e7e8ec?text=marek.media',
      alt: 'Mock thumbnail',
   },
   years: { from: 2024, to: 2026 },
   tags: [
      { id: 1, name: 'React' },
      { id: 2, name: 'Next.js' },
      { id: 3, name: 'TypeScript' },
   ],
};

const meta = {
   title: 'Features/Project/ProjectCard',
   component: ProjectCard,
   tags: ['autodocs'],
   parameters: { layout: 'padded' },
   args: { project: baseProject, index: 0 },
   argTypes: {
      index: { control: { type: 'number', min: 0, max: 5 } },
   },
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImageLeft: Story = { args: { index: 0 } };

export const ImageRight: Story = {
   args: { index: 1 },
   parameters: {
      docs: {
         description: {
            story: 'Odd index reverses layout — image on the right, text on the left.',
         },
      },
   },
};

export const NoTags: Story = {
   args: {
      project: { ...baseProject, tags: [] },
   },
};

export const LongTitle: Story = {
   args: {
      project: {
         ...baseProject,
         title: 'Architektonické studio s dlouhým názvem projektu, který se zalomí na více řádků',
      },
   },
};

export const NoThumbnail: Story = {
   args: {
      project: { ...baseProject, thumbnail: null },
   },
};

export const OneYear: Story = {
   args: {
      project: { ...baseProject, years: { from: 2026, to: null } },
   },
};

export const NoYears: Story = {
   args: {
      project: { ...baseProject, years: null },
   },
};
