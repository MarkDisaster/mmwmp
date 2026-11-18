import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { EditLockBanner } from '../EditLockBanner';
import { NewerVersionNotice } from '../NewerVersionNotice';

const acquire = vi.hoisted(() => vi.fn());

vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { mutations } = actual.api.editLocks;
   return {
      ...actual,
      api: {
         ...actual.api,
         editLocks: {
            ...actual.api.editLocks,
            mutations: {
               acquire: { ...mutations.acquire, mutationFn: acquire },
               release: { ...mutations.release, mutationFn: vi.fn().mockResolvedValue(undefined) },
            },
         },
      },
   };
});

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

const TAKE_OVER = 'Take over editing';
const takeOverButton = () => screen.queryByRole('button', { name: TAKE_OVER });
const liveRegion = () => document.querySelector('[aria-live="polite"]');

const JANA = { userId: 3, name: 'Jana Nováková', since: '2026-11-12T14:02:00.000Z' };

const renderBanner = (props: { readOnly?: boolean } = {}) =>
   render(<EditLockBanner entity="projects" id={5} {...props} />, { wrapper: QueryWrapper });

describe('EditLockBanner', () => {
   beforeEach(() => {
      acquire.mockReset().mockResolvedValue({ heldBy: JANA, mine: false });
      signInAs(createUser(ADMIN_ROLE, { id: 10 }));
   });
   afterEach(() => queryClient.clear());

   it('should name the user who edits the record and offer to take over', async () => {
      renderBanner();

      expect(await screen.findByRole('button', { name: TAKE_OVER })).toBeInTheDocument();
      expect(
         screen.getByText(/Jana Nováková is editing this record \(since .+\)\./, { selector: 'p' }),
      ).toHaveTextContent(/If you both save, one of you will get a conflict\./);
      expect(liveRegion()).toHaveTextContent(/Jana Nováková is editing this record/);
      expect(screen.getByRole('button', { name: TAKE_OVER })).toBeInTheDocument();
   });

   it('should take the lock over on the button and then disappear', async () => {
      renderBanner();
      const button = await screen.findByRole('button', { name: 'Take over editing' });
      acquire.mockResolvedValue({ heldBy: { ...JANA, userId: 10 }, mine: true });

      await userEvent.click(button);

      expect(acquire).toHaveBeenLastCalledWith(
         expect.objectContaining({ takeOver: true, id: 5 }),
         expect.anything(),
      );
      await vi.waitFor(() => expect(takeOverButton()).not.toBeInTheDocument());
      expect(liveRegion()).toBeEmptyDOMElement();
   });

   it('should show nothing of the previous record when the editor shows another one', async () => {
      const { rerender } = renderBanner();
      expect(await screen.findByRole('button', { name: TAKE_OVER })).toBeInTheDocument();
      acquire.mockResolvedValue({ heldBy: null, mine: false });

      rerender(<EditLockBanner entity="projects" id={6} />);

      expect(takeOverButton()).not.toBeInTheDocument();
      await settle();
      expect(acquire).toHaveBeenLastCalledWith(
         expect.objectContaining({ id: 6 }),
         expect.anything(),
      );
   });

   it('should not say the lock was taken over for a record this editor never held', async () => {
      acquire.mockResolvedValue({ heldBy: { ...JANA, userId: 10 }, mine: true });
      const { rerender } = renderBanner();
      await settle();
      acquire.mockResolvedValue({ heldBy: JANA, mine: false });

      rerender(<EditLockBanner entity="projects" id={6} />);

      expect(
         await screen.findByText(/is editing this record/, { selector: 'p' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/took over/)).not.toBeInTheDocument();
   });

   it('should sit above the newer version notice, each with its own live region', async () => {
      render(
         <>
            <EditLockBanner entity="projects" id={5} />
            <NewerVersionNotice visible onReload={vi.fn()} />
         </>,
         { wrapper: QueryWrapper },
      );

      const lock = await screen.findByText(/Jana Nováková is editing this record/, {
         selector: 'p',
      });
      const newer = screen.getByText(/This record changed outside the form/, { selector: 'p' });
      expect(lock.compareDocumentPosition(newer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(2);
      expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
         TAKE_OVER,
         'Load current version',
      ]);
   });

   it('should show nothing when nobody else holds the lock', async () => {
      acquire.mockResolvedValue({ heldBy: null, mine: false });
      renderBanner();

      await vi.waitFor(() => expect(acquire).toHaveBeenCalled());
      expect(takeOverButton()).not.toBeInTheDocument();
   });

   it('should take no lock for a user who may not update the record', async () => {
      signInAs(createUser(createRole(['projects.read'])));
      renderBanner();
      await settle();

      expect(acquire).not.toHaveBeenCalled();
      expect(takeOverButton()).not.toBeInTheDocument();
   });

   it('should take no lock for a read-only editor', async () => {
      renderBanner({ readOnly: true });
      await settle();

      expect(acquire).not.toHaveBeenCalled();
   });
});
