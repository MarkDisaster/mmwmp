import type { Meta, StoryObj } from '@storybook/react-vite';

import { EditorFormActions } from '@/components/common/EditorFormActions';
import { Button } from '@/components/ui/button';

const meta = {
   title: 'Common/EditorFormActions',
   component: EditorFormActions,
   tags: ['autodocs'],
   args: {
      isDraft: true,
      isSaving: false,
      formId: 'story-form',
      onPublish: () => undefined,
      onUnpublish: () => undefined,
      labels: {
         saveDraft: 'Save draft',
         publish: 'Publish',
         unpublish: 'Unpublish',
         save: 'Save',
      },
   },
} satisfies Meta<typeof EditorFormActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};

export const Published: Story = { args: { isDraft: false } };

export const Saving: Story = { args: { isSaving: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DraftWithoutPublishRight: Story = { args: { canPublish: false } };

export const ReadOnlyPublished: Story = { args: { isDraft: false, readOnly: true } };

export const ReadOnlyDraft: Story = { args: { readOnly: true } };

export const WithExtraActions: Story = {
   args: { extraActions: <Button variant="ghost">Preview</Button> },
};
