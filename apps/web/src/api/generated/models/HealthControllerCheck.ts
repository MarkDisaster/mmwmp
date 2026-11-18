/* eslint-disable */

export type HealthControllerCheck200 = {
   status?: string;
   info?: {
      [key: string]: {
         status: string;
         [key: string]: unknown;
      };
   } | null;
   error?: {
      [key: string]: {
         status: string;
         [key: string]: unknown;
      };
   } | null;
   details?: {
      [key: string]: {
         status: string;
         [key: string]: unknown;
      };
   };
};

export type HealthControllerCheck503 = {
   status?: string;
   info?: {
      [key: string]: {
         status: string;
         [key: string]: unknown;
      };
   } | null;
   error?: {
      [key: string]: {
         status: string;
         [key: string]: unknown;
      };
   } | null;
   details?: {
      [key: string]: {
         status: string;
         [key: string]: unknown;
      };
   };
};

export type HealthControllerCheckQueryResponse = HealthControllerCheck200;

export type HealthControllerCheckQuery = {
   Response: HealthControllerCheck200;
   Errors: HealthControllerCheck503;
};
