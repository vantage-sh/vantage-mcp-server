import { pathEncode, type UpdateBudgetResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./update-budget";
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

const undefineds = {
	name: undefined,
	cost_report_token: undefined,
	child_budget_tokens: undefined,
	periods: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
	...undefineds,
	budget_token: "bgt_123",
};

const validInputArguments: InferValidators<Validators> = {
	budget_token: "bgt_123",
	name: "Updated Budget",
	cost_report_token: "crt_456",
	child_budget_tokens: ["bgt_child1", "bgt_child2"],
	periods: [
		{
			start_at: "2024-01-01",
			end_at: "2024-01-31",
			amount: 1000,
		},
		{
			start_at: "2024-02-01",
			end_at: "2024-02-29",
			amount: 1200,
		},
	],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: minimalValidInputArguments,
	},
	{
		name: "all valid arguments",
		data: validInputArguments,
	},
	{
		name: "empty name",
		data: {
			...validInputArguments,
			name: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "period with negative amount",
		data: {
			...undefineds,
			budget_token: "bgt_123",
			periods: [
				{
					start_at: "2024-01-01",
					amount: -100,
				},
			],
		},
		expectedIssues: ["Too small: expected number to be >=0"],
	},
	{
		name: "period with zero amount",
		data: {
			...undefineds,
			budget_token: "bgt_123",
			periods: [
				{
					start_at: "2024-01-01",
					amount: 0,
				},
			],
		},
	},
	{
		name: "invalid start_at date",
		data: {
			...undefineds,
			budget_token: "bgt_123",
			periods: [
				{
					start_at: "invalid-date",
					amount: 500,
				},
			],
		},
		expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
	},
	{
		name: "invalid end_at date",
		data: {
			...undefineds,
			budget_token: "bgt_123",
			periods: [
				{
					start_at: "2024-01-01",
					end_at: "invalid-date",
					amount: 500,
				},
			],
		},
		expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
	},
	{
		name: "empty periods array",
		data: {
			...undefineds,
			budget_token: "bgt_123",
			periods: [],
		},
	},
	{
		name: "empty child_budget_tokens array",
		data: {
			...undefineds,
			budget_token: "bgt_123",
			child_budget_tokens: [],
		},
	},
];

const successData: UpdateBudgetResponse = {
	token: "bgt_123",
	name: "Updated Budget",
	workspace_token: "wrkspc_123",
	cost_report_token: "crt_456",
	budget_alert_tokens: [],
	child_budget_tokens: ["bgt_child1", "bgt_child2"],
	created_at: "2023-01-01T00:00:00Z",
	periods: [
		{
			start_at: "2024-01-01",
			end_at: "2024-01-31",
			amount: "1000.0",
		},
		{
			start_at: "2024-02-01",
			end_at: "2024-02-29",
			amount: "1200.0",
		},
	],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/budgets/${pathEncode("bgt_123")}`,
				params: {
					name: "Updated Budget",
					cost_report_token: "crt_456",
					child_budget_tokens: ["bgt_child1", "bgt_child2"],
					periods: [
						{ start_at: "2024-01-01", end_at: "2024-01-31", amount: 1000 },
						{ start_at: "2024-02-01", end_at: "2024-02-29", amount: 1200 },
					],
				},
				method: "PUT",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validInputArguments);
			expect(res).toEqual(successData);
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/budgets/${pathEncode("bgt_123")}`,
				params: {},
				method: "PUT",
				result: {
					ok: false,
					errors: [{ message: "Budget not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(minimalValidInputArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Budget not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
