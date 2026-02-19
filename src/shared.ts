import type {
	Path,
	RequestBodyForPathAndMethod,
	ResponseBodyForPathAndMethod,
	SupportedMethods,
} from "@vantage-sh/vantage-client";
import { SERVER_VERSION } from "./tools/structure/constants";

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
	endpoint: P
): Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }> {
	headers["User-Agent"] = `vantage-mcp-server/${serverMeta.version}`;

	const url = new URL(endpoint, baseUrl);

	if (method === "GET") {
		Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.append(
					key,
					Array.isArray(value) ? value.join(",") : String(value)
				);
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

	const response = await fetch(url.toString(), options);
	if (!response.ok) {
		const bestAnyDetail = await response.text();
		try {
			const res = JSON.parse(bestAnyDetail) as { errors?: string[] };
			if (Array.isArray(res.errors)) {
				return {
					errors: res.errors,
					ok: false,
				};
			}
		} catch {
			// ignore JSON parse error - instead just use the text
		}

		return {
			errors: [
				{
					message: "Vantage API request failed",
					status: response.status,
					endpoint,
					details: bestAnyDetail,
				},
			],
			ok: false,
		};
	}

	if (response.status === 204) {
		// No content response - return undefined
		return { data: undefined as Response, ok: true };
	}
	const responseData = await response.json();
	return { data: responseData as Response, ok: true };
}
