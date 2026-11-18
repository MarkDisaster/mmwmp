import { isAxiosError } from 'axios';

export const isExpectedError = (error: unknown): boolean =>
   isAxiosError(error) && error.response !== undefined && error.response.status < 500;
