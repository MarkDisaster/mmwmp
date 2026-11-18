import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { userControllerChangePassword } from '@/api/generated';
import { endAuthSession } from '@/features/auth/auth-query';
import { signInAs } from '@/test/auth';
import { createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { UserProfilePage } from '../components/UserProfilePage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/auth/auth-query', async (importOriginal) => ({
   ...(await importOriginal<typeof import('@/features/auth/auth-query')>()),
   endAuthSession: vi.fn(),
}));
vi.mock('@/api/generated', async (importOriginal) => ({
   ...(await importOriginal<typeof import('@/api/generated')>()),
   userControllerChangePassword: vi.fn(),
}));

const NEW_PASSWORD = 'new-secret';

const changePassword = async (currentPassword: string) => {
   signInAs(createUser(createRole([])));
   const user = userEvent.setup();
   render(<UserProfilePage />, { wrapper: QueryWrapper });

   await user.type(screen.getByLabelText('Current password'), currentPassword);
   await user.type(screen.getByLabelText('New password (min. 8 chars)'), NEW_PASSWORD);
   await user.click(screen.getByRole('button', { name: 'Change password' }));
};

afterEach(() => {
   queryClient.clear();
   vi.clearAllMocks();
});

describe('UserProfilePage', () => {
   it('should sign out to the login page after the own password was changed', async () => {
      vi.mocked(userControllerChangePassword).mockResolvedValue(
         {} as Awaited<ReturnType<typeof userControllerChangePassword>>,
      );
      await changePassword('old-secret');

      await vi.waitFor(() => expect(endAuthSession).toHaveBeenCalledWith({ reason: 'logout' }));
      expect(userControllerChangePassword).toHaveBeenCalledWith({
         currentPassword: 'old-secret',
         newPassword: NEW_PASSWORD,
      });
      expect(toast.success).toHaveBeenCalledWith('Password changed, sign in again');
   });

   it('should keep the session when the password change failed', async () => {
      vi.mocked(userControllerChangePassword).mockRejectedValue(new Error('Wrong password'));
      await changePassword('wrong');

      await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(endAuthSession).not.toHaveBeenCalled();
   });
});
