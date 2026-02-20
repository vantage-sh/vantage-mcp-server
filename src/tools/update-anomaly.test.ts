import { pathEncode, type UpdateAnomalyAlertResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./update-anomaly";
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
	anomaly_alert_token: "anmly_alrt_123",
	status: "archived",
	feedback: "this stinks",
};

const successData: UpdateAnomalyAlertResponse = {
	token: "anmly_alrt_123",
	created_at: "2024-04-01T17:14:46Z",
	alerted_at: "2024-04-01T17:14:46Z",
	category: "Compute",
	service: "AmazonEKS",
	provider: "aws",
	amount: "100.0",
	previous_amount: "25.0",
	seven_day_average: "10.0",
	status: "archived",
	feedback: "this stinks",
	resources: [],
	cost_report_token: "rprt_123",
	resource_tokens: [],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			anomaly_alert_token: "anmly_alrt_123",
			status: "active",
			feedback: undefined,
		},
	},
	{
		name: "all valid arguments",
		data: validArguments,
	},
	{
		name: "ignore with feedback",
		data: {
			anomaly_alert_token: "anmly_alrt_123",
			status: "ignored",
			feedback: "not relevant to us",
		},
	},
	{
		name: "invalid status",
		data: {
			anomaly_alert_token: "anmly_alrt_123",
			status: "unknown" as "active",
			feedback: undefined,
		},
		expectedIssues: ['Invalid option: expected one of "active"|"archived"|"ignored"'],
	},
];

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/anomaly_alerts/${pathEncode("anmly_alrt_123")}`,
				params: { status: "archived", feedback: "this stinks" },
				method: "PUT",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual(successData);
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/anomaly_alerts/${pathEncode("anmly_alrt_nonexistent")}`,
				params: { status: "archived", feedback: undefined },
				method: "PUT",
				result: {
					ok: false,
					errors: [{ message: "Anomaly alert not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				anomaly_alert_token: "anmly_alrt_nonexistent",
				status: "archived",
				feedback: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Anomaly alert not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
