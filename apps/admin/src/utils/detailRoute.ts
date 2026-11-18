import { notFound } from '@tanstack/react-router';
import { isAxiosError } from 'axios';

const ID_PATTERN = /^[1-9]\d*$/;

export const parseIdParam = (value: string): number => {
   const id = Number(value);
   if (!ID_PATTERN.test(value) || !Number.isSafeInteger(id)) throw notFound();
   return id;
};

export const notFoundOn404 = async <T>(request: Promise<T>): Promise<T> => {
   try {
      return await request;
   } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) throw notFound();
      throw error;
   }
};
