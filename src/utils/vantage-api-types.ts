import type {
  UpdateCostReportRequest as ClientCostReportUpdate,
  SupportedMethods as ClientMethods,
  Path as ClientPath,
  RequestBodyForPathAndMethod as ClientRequest,
  ResponseBodyForPathAndMethod as ClientResponse,
  pathEncode,
} from "@vantage-sh/vantage-client";

// The published client omits these feature-gated endpoints. Keep this contract
// aligned with Core's v2 CustomCalculations endpoint until the client includes it.
export type CustomCalculationDefinition = {
  title: string;
  description?: string | null;
  operation?: "sum" | "average" | "division" | "min" | "max";
  display_as?: "ratio" | "percent" | "per-n";
  unit_scale?: number | null;
  filter: Record<string, unknown>;
};

export type CustomCalculation = Required<CustomCalculationDefinition> & {
  unit_scale: number;
  token: string;
  cost_report_tokens: string[];
  is_read_only: boolean;
  created_at: string;
  updated_at: string;
};

type CustomCalculationApi = {
  "/v2/custom_calculations": {
    GET: {
      request: { page?: number; limit?: number };
      response: { custom_calculations: CustomCalculation[]; links?: { next?: string | null } };
    };
    POST: { request: CustomCalculationDefinition; response: CustomCalculation };
  };
} & {
  [P in `/v2/custom_calculations/${ReturnType<typeof pathEncode>}`]: {
    GET: { request: Record<string, never>; response: CustomCalculation };
    PUT: {
      request: Partial<CustomCalculationDefinition> & { cost_report_tokens?: string[] | null };
      response: CustomCalculation;
    };
    DELETE: { request: Record<string, never>; response: undefined };
  };
};

// Core accepts null as an instruction to leave attachments unchanged.
export type CostReportUpdateRequest = Omit<ClientCostReportUpdate, "custom_calculation_tokens"> & {
  custom_calculation_tokens?: string[] | null;
};

// Use the published client contract once it includes ranked business metric values.
type AdditionalApi = CustomCalculationApi & {
  [P in `/v2/business_metrics/${ReturnType<typeof pathEncode>}/ranked_values`]: {
    GET: {
      request: { start_date: string; end_date: string; top_labels: number };
      response: { months: string[]; monthly_totals: string[]; series: { label: string; amounts: string[] }[] };
    };
  };
};

type CustomPath = keyof AdditionalApi;
export type Path = ClientPath | CustomPath;
export type SupportedMethods<P extends Path> = P extends CustomPath
  ? keyof AdditionalApi[P]
  : ClientMethods<Extract<P, ClientPath>>;
export type RequestBodyForPathAndMethod<P extends Path, M extends SupportedMethods<P>> = P extends CustomPath
  ? AdditionalApi[P][Extract<M, keyof AdditionalApi[P]>] extends { request: infer R }
    ? R
    : never
  : P extends `/v2/cost_reports/${ReturnType<typeof pathEncode>}`
    ? M extends "PUT"
      ? CostReportUpdateRequest
      : ClientRequest<Extract<P, ClientPath>, Extract<M, ClientMethods<Extract<P, ClientPath>>>>
    : ClientRequest<Extract<P, ClientPath>, Extract<M, ClientMethods<Extract<P, ClientPath>>>>;
export type ResponseBodyForPathAndMethod<P extends Path, M extends SupportedMethods<P>> = P extends CustomPath
  ? AdditionalApi[P][Extract<M, keyof AdditionalApi[P]>] extends { response: infer R }
    ? R
    : never
  : ClientResponse<Extract<P, ClientPath>, Extract<M, ClientMethods<Extract<P, ClientPath>>>>;
