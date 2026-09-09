import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import type { AppEnv } from "./env";
import { SERVER_VERSION } from "./tools/structure/constants";
import { formatErrorsForTelemetry, tracer } from "./tracing";

export const serverMeta = {
  name: "Vantage Cloud Costs Helper",
  version: SERVER_VERSION,
};

export async function callApi<
  P extends Path,
  M extends SupportedMethods<P>,
  Request extends RequestBodyForPathAndMethod<P, M>,
  Response extends ResponseBodyForPathAndMethod<P, M>,
>(
  baseUrl: string,
  headers: Record<string, string>,
  params: Request,
  method: M,
  endpoint: P,
  env?: AppEnv
): Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }> {
  headers["User-Agent"] = `vantage-mcp-server/${serverMeta.version}`;

  const url = new URL(endpoint, baseUrl);

  if (method === "GET") {
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(`${key}[]`, String(item));
        }
      } else {
        url.searchParams.append(key, String(value));
      }
    });
  } else {
    headers["Content-Type"] = "application/json";
  }
  const options = {
    method,
    headers,
    body: method !== "GET" ? JSON.stringify(params) : undefined,
  };

  const response = await tracer.traceFetch(fetch, url.toString(), options, { env });
  if (!response.ok) {
    const bestAnyDetail = await response.text();
    let errors: unknown[];
    try {
      const res = JSON.parse(bestAnyDetail) as { errors?: string[] };
      if (Array.isArray(res.errors)) {
        errors = res.errors;
      } else {
        errors = [
          {
            message: "Vantage API request failed",
            status: response.status,
            endpoint,
            details: bestAnyDetail,
          },
        ];
      }
    } catch {
      errors = [
        {
          message: "Vantage API request failed",
          status: response.status,
          endpoint,
          details: bestAnyDetail,
        },
      ];
    }

    // Attach the parsed API errors onto the active tool span (client span is enriched in traceFetch).
    const activeSpan = tracer.getActiveSpan();
    if (activeSpan) {
      activeSpan.attributes["error.message"] = formatErrorsForTelemetry(errors, bestAnyDetail);
      activeSpan.attributes["http.response.status_code"] = response.status;
    }

    return { errors, ok: false };
  }

  if (response.status === 204) {
    // No content response - return undefined
    return { data: undefined as Response, ok: true };
  }
  const responseData = await response.json();
  return { data: responseData as Response, ok: true };
}
