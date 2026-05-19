import { SERVER_VERSION } from "../tools/structure/constants";
import { CloudflareWorkerTracer } from "./tracer";

export * from "./otlp";
export * from "./tracer";

export const tracer = new CloudflareWorkerTracer({
  serviceName: "vantage-mcp-server",
  scopeName: "vantage-mcp-server",
  scopeVersion: SERVER_VERSION,
});
