import type { GetCostAlertsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-cost-alerts";
import { DEFAULT_LIMIT } from "./structure/constants";
import {
	type ExecutionTestTableItem,
	type ExtractValidators,
	type InferValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const validArguments: InferValidators<Validators> = {
	page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "default page",
		data: {
			page: undefined,
		},
	},
	{
		name: "valid page number",
		data: validArguments,
	},
];

function makeCostAlert(token: string) {
	return {
		token,
		title: `Cost Alert ${token}`,
		threshold: 100,
		created_at: "2023-01-01T00:00:00Z",
		updated_at: "2023-01-01T00:00:00Z",
		email_recipients: ["user@example.com"],
		slack_channels: ["#alerts"],
		teams_channels: ["General"],
		minimum_threshold: 50,
		workspace_token: "wrkspc_123",
		interval: "day",
		unit_type: "currency",
		report_tokens: ["rprt_123"],
	};
}

const successData: GetCostAlertsResponse = {
	cost_alerts: [makeCostAlert("cstm_alrt_rl_123"), makeCostAlert("cstm_alrt_rl_456")],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_alerts",
				params: {
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				cost_alerts: successData.cost_alerts,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_alerts",
				params: {
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Access denied" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
