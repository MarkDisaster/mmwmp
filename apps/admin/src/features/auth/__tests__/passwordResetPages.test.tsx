import {
   createMemoryHistory,
   createRootRoute,
   createRoute,
   createRouter,
   Outlet,
   RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { ForgotPasswordPage } from '../components/ForgotPasswordPage';
import { ResetPasswordPage } from '../components/ResetPasswordPage';

const forgotPassword = vi.hoisted(() => vi.fn());
const resetPassword = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { mutations } = actual.api.auth;
   return {
      ...actual,
      api: {
         ...actual.api,
         auth: {
            ...actual.api.auth,
            mutations: {
               forgotPassword: { ...mutations.forgotPassword, mutationFn: forgotPassword },
               resetPassword: { ...mutations.resetPassword, mutationFn: resetPassword },
            },
         },
      },
   };
});

const SENT = "If the email exists, we'll send a password reset link";
const TOO_MANY_REQUESTS = 'Too many requests, try again in a moment.';
const FAILED = 'The action could not be completed. Please try again.';
const INVALID_LINK = 'This password reset link has expired or has already been used.';
const PASSWORD = 'secret123';

const httpError = (status: number, message: string | string[] = 'Request failed') =>
   new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status,
      data: { message },
   } as AxiosResponse);

const openPage = (path: string) => {
   const rootRoute = createRootRoute({ component: Outlet });
   const routes = [
      createRoute({
         getParentRoute: () => rootRoute,
         path: 'forgot-password',
         component: ForgotPasswordPage,
      }),
      createRoute({
         getParentRoute: () => rootRoute,
         path: 'reset-password/$token',
         component: () => <ResetPasswordPage token="reset-token" />,
      }),
      createRoute({ getParentRoute: () => rootRoute, path: 'login', component: () => 'Login' }),
   ];
   const router = createRouter({
      routeTree: rootRoute.addChildren(routes),
      history: createMemoryHistory({ initialEntries: [path] }),
   });
   render(<RouterProvider router={router} />, { wrapper: QueryWrapper });
   return { user: userEvent.setup(), router };
};

beforeEach(() => {
   forgotPassword.mockReset();
   resetPassword.mockReset();
   vi.mocked(toast.error).mockClear();
});

afterEach(() => {
   queryClient.clear();
});

describe('ForgotPasswordPage', () => {
   const submit = async () => {
      const { user } = openPage('/forgot-password');
      await user.type(await screen.findByLabelText('Email'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: 'Send link' }));
   };

   it('should say the link is on its way once the API accepted the request', async () => {
      forgotPassword.mockResolvedValue(undefined);
      await submit();

      expect(await screen.findByText(SENT)).toBeInTheDocument();
   });

   it('should report a rejected request and keep the form for another try', async () => {
      forgotPassword.mockRejectedValue(httpError(429));
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(TOO_MANY_REQUESTS);
      expect(screen.queryByText(SENT)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send link' })).toBeEnabled();
   });

   it('should report a failure without a response from the API', async () => {
      forgotPassword.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
      expect(screen.queryByText(SENT)).not.toBeInTheDocument();
   });
});

describe('ResetPasswordPage', () => {
   const submit = async () => {
      const opened = openPage('/reset-password/reset-token');
      await opened.user.type(await screen.findByLabelText(/^New password/), PASSWORD);
      await opened.user.type(screen.getByLabelText('Confirm password'), PASSWORD);
      await opened.user.click(screen.getByRole('button', { name: 'Set password' }));
      return opened;
   };

   it('should offer a new link for a link the API no longer accepts', async () => {
      resetPassword.mockRejectedValue(httpError(400));
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_LINK);
      expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
         'href',
         '/forgot-password',
      );
      expect(toast.error).not.toHaveBeenCalled();
   });

   it('should not call a password the API rejects an expired link', async () => {
      resetPassword.mockRejectedValue(httpError(400, ['newPassword must be longer than 8']));
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
      expect(screen.queryByText(INVALID_LINK)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Request a new link' })).not.toBeInTheDocument();
   });

   it('should report another failure on the page, once', async () => {
      resetPassword.mockRejectedValue(httpError(500));
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
      expect(screen.queryByText(INVALID_LINK)).not.toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
   });

   it('should send the token with the new password and go to the login', async () => {
      resetPassword.mockResolvedValue(undefined);
      const { router } = await submit();

      expect(await screen.findByText('Login')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/login');
      expect(resetPassword.mock.calls[0]?.[0]).toEqual({
         data: { token: 'reset-token', newPassword: PASSWORD },
      });
   });
});
