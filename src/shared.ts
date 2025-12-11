import { SERVER_VERSION } from "./tools/structure/constants";
import type { AllowedMethods } from "./tools/structure/registerTool";

export const serverMeta = {
	name: "Vantage Cloud Costs Helper",
	version: SERVER_VERSION,
};

export async function callApi(
	baseUrl: string,
	headers: Record<string, string>,
	params: Record<string, unknown>,
	method: AllowedMethods,
	endpoint: string
): Promise<{ data: any; ok: true } | { errors: unknown[]; ok: false }> {
	headers["User-Agent"] = `vantage-mcp-server/${serverMeta.version}`;

	const url = new URL(endpoint, baseUrl);

	if (method === "GET") {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
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

	const response = await fetch(url.toString(), options);
	if (!response.ok) {
		let bestAnyDetail = await response.text();
		try {
			bestAnyDetail = JSON.parse(bestAnyDetail);
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

	const responseData = await response.json();
	return { data: responseData, ok: true };
}
