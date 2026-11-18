import { HttpStatusCode, isAxiosError } from 'axios';

export async function nullOnNotFound<T>(request: Promise<{ data: T }>): Promise<T | null> {
   try {
      return (await request).data;
   } catch (error) {
      if (isAxiosError(error) && error.response?.status === HttpStatusCode.NotFound) return null;
      throw error;
   }
}
