import { WorkersLogger } from "workers-tagged-logger";

export type LogTagHints = {
  mcp_client_name?: string;
  mcp_client_version?: string;
  endpoint?: string;
  method?: string;
  oauth_error_category?: string;
  oauth_error_code?: string;
  oauth_error_reason?: string;
  oauth_error_status?: number;
  ok?: boolean;
  /** JSON-serialized API error payload for failed Vantage calls. */
  api_errors?: string;
  "dd.trace_id"?: string;
  "dd.span_id"?: string;
  "otel.trace_id"?: string;
  "otel.span_id"?: string;
};

export const logger = new WorkersLogger<LogTagHints>();
