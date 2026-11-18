/* eslint-disable */

export type AiObservabilityControllerSummaryQueryParams = {
   from?: string;
   to?: string;
   userId?: number;
};

export type AiObservabilityControllerSummary200 = {
   interactionCount: number;
   totalTokens: number;
   avgLatencyMs: number | null;
   errorCount: number;
};

export type AiObservabilityControllerSummaryQueryResponse = AiObservabilityControllerSummary200;

export type AiObservabilityControllerSummaryQuery = {
   Response: AiObservabilityControllerSummary200;
   QueryParams: AiObservabilityControllerSummaryQueryParams;
   Errors: any;
};
