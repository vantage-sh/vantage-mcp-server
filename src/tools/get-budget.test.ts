import { type GetBudgetResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./get-budget";
import {
	type ExecutionTestTableItem,
	type ExtractOutputSchema,
	type ExtractValidators,
	type InferValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const success: GetBudgetResponse = {
	token: "bgt_123",
	name: "Monthly AWS Budget",
	workspace_token: "wrkspc_123",
	created_at: "2023-01-15T10:30:00Z",
	budget_alert_tokens: [],
	child_budget_tokens: [],
	periods: [],
	cost_report_token: "crt_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "takes budget_token",
		data: {
			budget_token: "bgt_123",
			include_performance: undefined,
		},
	},
	{
		name: "with include_performance",
		data: {
			budget_token: "bgt_123",
			include_performance: true,
		},
	},
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
	{
		name: "successful call without include_performance",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/budgets/${pathEncode("bgt_123")}`,
				params: {},
				method: "GET",
				result: {
					ok: true,
					data: success,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				budget_token: "bgt_123",
				include_performance: undefined,
			});
			expect(res).toEqual(success);
		},
	},
	{
		name: "successful call with include_performance",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/budgets/${pathEncode("bgt_123")}`,
				params: { include_performance: true },
				method: "GET",
				result: {
					ok: true,
					data: success,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				budget_token: "bgt_123",
				include_performance: true,
			});
			expect(res).toEqual(success);
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/budgets/${pathEncode("bgt_notfound")}`,
				params: {},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Budget not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				budget_token: "bgt_notfound",
				include_performance: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Budget not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
