import { WorkersLogger } from "workers-tagged-logger";

export type LogTagHints = {
	mcp_client_name?: string;
	mcp_client_version?: string;
	endpoint?: string;
	method?: string;
	ok?: boolean;
};

export const logger = new WorkersLogger<LogTagHints>();
