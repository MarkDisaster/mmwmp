import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import { EditorFormActions } from '../EditorFormActions';

const noop = () => {};

const LABELS = {
   saveDraft: 'Save draft',
   publish: 'Publish',
   unpublish: 'Unpublish',
   save: 'Save',
};

const renderActions = (props: Partial<ComponentProps<typeof EditorFormActions>> = {}) =>
   render(
      <EditorFormActions
         isDraft
         isSaving={false}
         formId="form"
         onPublish={noop}
         onUnpublish={noop}
         labels={LABELS}
         {...props}
      />,
   );

describe('EditorFormActions', () => {
   it('should lock the actions without the loading label while disabled', () => {
      renderActions({ disabled: true });

      expect(screen.getByRole('button', { name: LABELS.saveDraft })).toBeDisabled();
      expect(screen.getByRole('button', { name: LABELS.publish })).toBeDisabled();
   });

   it('should lock the actions of a published record while disabled', () => {
      renderActions({ isDraft: false, disabled: true });

      expect(screen.getByRole('button', { name: LABELS.unpublish })).toBeDisabled();
      expect(screen.getByRole('button', { name: LABELS.save })).toBeDisabled();
   });

   it('should lock the actions and show the loading label while saving', () => {
      renderActions({ isSaving: true });

      const buttons = screen.getAllByRole('button', { name: 'Loading...' });
      expect(buttons).toHaveLength(2);
      for (const button of buttons) expect(button).toBeDisabled();
   });

   it('should offer the actions while neither saving nor disabled', () => {
      renderActions();

      expect(screen.getByRole('button', { name: LABELS.saveDraft })).toBeEnabled();
      expect(screen.getByRole('button', { name: LABELS.publish })).toBeEnabled();
   });

   it('should offer no save of a read-only record', () => {
      renderActions({ readOnly: true, extraActions: <button type="button">Preview</button> });

      expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
         'Preview',
      ]);
   });

   it('should still offer the unpublish of a read-only published record to a publisher', () => {
      renderActions({ readOnly: true, isDraft: false });

      expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
         LABELS.unpublish,
      ]);
   });

   it('should hide publishing without the permission', () => {
      renderActions({ canPublish: false });

      expect(screen.getByRole('button', { name: LABELS.saveDraft })).toBeEnabled();
      expect(screen.queryByRole('button', { name: LABELS.publish })).not.toBeInTheDocument();
   });
});
