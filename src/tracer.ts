import { SERVER_VERSION } from "./tools/structure/constants";
import { CloudflareWorkerTracer } from "./tracing";

export const tracer = new CloudflareWorkerTracer({
	serviceName: "vantage-mcp-server",
	scopeName: "vantage-mcp-server",
	scopeVersion: SERVER_VERSION,
});
