// TODO: Replace these temporary types with @vantage-sh/vantage-client exports after core#20392 is merged
// and the client is regenerated. This file exists only because the endpoint is being tested before that merge.

export const NETWORK_FLOW_LOGS_ENDPOINT = "/v2/network_flow_logs" as const;

export type TemporaryListNetworkFlowReportsRequest = {
  q?: string;
  page?: number;
  limit?: number;
};

export type TemporaryNetworkFlowLogsRequest = {
  network_flow_report_token?: string;
  workspace_token?: string;
  filter?: string;
  date_interval?: "last_3_days" | "last_7_days" | "last_14_days" | "last_30_days";
  start_date?: string;
  end_date?: string;
  groupings?: string[];
  flow_direction?: "all" | "ingress" | "egress";
  flow_weight?: "costs" | "bytes";
  page: number;
  limit: number;
};

export type TemporaryNetworkFlowLogGrouping = {
  value: string;
  label: string;
  provider_resource_token: string | null;
};

export type TemporaryNetworkFlowLog = {
  groupings: Record<string, TemporaryNetworkFlowLogGrouping>;
  bytes: number;
  estimated_cost: string;
  currency: string;
  sampled_bytes: number | null;
  sampled_estimated_cost: string | null;
};

export type TemporaryNetworkFlowLogsResponse = {
  links?: {
    self?: string | null;
    first?: string | null;
    next?: string | null;
    last?: string | null;
    prev?: string | null;
  } | null;
  flow_weight: "costs" | "bytes";
  sampling: {
    sampled: boolean;
    max_sampling_rate_percent: number | null;
  };
  network_flow_logs: TemporaryNetworkFlowLog[];
};

export type TemporaryCallNetworkFlowLogsApi = (
  endpoint: typeof NETWORK_FLOW_LOGS_ENDPOINT,
  params: TemporaryNetworkFlowLogsRequest,
  method: "GET"
) => Promise<{ data: TemporaryNetworkFlowLogsResponse; ok: true } | { errors: unknown[]; ok: false }>;
