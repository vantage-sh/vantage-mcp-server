import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import { withLogTags } from "workers-tagged-logger";
import type { UserProps } from "./auth";
import type { AppEnv } from "./env";
import { logger } from "./logger";
import { callApi } from "./shared";
import { datadogTraceLogTags, formatErrorsForTelemetry, tracer } from "./tracing";

export type CoreCredentialProps = UserProps & { vantageHeaders?: Record<string, string> };

/**
 * Core request headers for validated provider props. The development token
 * overrides OAuth. Returns undefined when no credential is available.
 */
export function coreApiHeaders(
  props: CoreCredentialProps | undefined,
  env: Pick<AppEnv, "VANTAGE_MCP_TOKEN">
): Record<string, string> | undefined {
  const vantageHeaders = props?.vantageHeaders ?? {};
  const token = env.VANTAGE_MCP_TOKEN || props?.tokenSet?.accessToken;
  if (!token && Object.keys(vantageHeaders).length === 0) return undefined;
  return { ...vantageHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function callCoreApi<
  P extends Path,
  M extends SupportedMethods<P>,
  Request extends RequestBodyForPathAndMethod<P, M>,
  Response extends ResponseBodyForPathAndMethod<P, M>,
>(
  env: AppEnv,
  headers: Record<string, string>,
  client: { name: string; version: string } | undefined,
  endpoint: P,
  params: Request,
  method: M,
  signal?: AbortSignal
): Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }> {
  return withLogTags({}, async () => {
    logger.setTags({
      endpoint: endpoint as string,
      method: method as string,
      ...(client ? { mcp_client_name: client.name, mcp_client_version: client.version } : {}),
      ...datadogTraceLogTags(tracer.getActiveTraceContext()),
    });

    const result = await callApi<P, M, Request, Response>(
      env.VANTAGE_API_HOST,
      { ...headers },
      params,
      method,
      endpoint,
      env,
      signal
    );

    logger.setTags({ ok: result.ok, ...datadogTraceLogTags(tracer.getActiveTraceContext()) });
    if (!result.ok) {
      logger.setTags({ api_errors: formatErrorsForTelemetry(result.errors) });
      logger.error("Vantage API request failed");
    } else {
      logger.info("Vantage API request");
    }
    return result;
  });
}
