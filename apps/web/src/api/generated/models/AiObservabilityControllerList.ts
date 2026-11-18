/* eslint-disable */

export type AiObservabilityControllerListQueryParams = {
   page?: number;
   limit?: number;
   from?: string;
   to?: string;
   userId?: number;
};

export type AiObservabilityControllerList200 = {
   items: object[];
   page: number;
   limit: number;
   total: number;
};

export type AiObservabilityControllerListQueryResponse = AiObservabilityControllerList200;

export type AiObservabilityControllerListQuery = {
   Response: AiObservabilityControllerList200;
   QueryParams: AiObservabilityControllerListQueryParams;
   Errors: any;
};
