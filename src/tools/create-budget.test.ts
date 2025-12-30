import { expect } from "vitest";
import type { CreateBudgetResponse } from "../../vantage-ts";
import tool from "./create-budget";
import {
	type ExecutionTestTableItem,
	type ExtractValidators,
	type InferValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const undefineds = {
	workspace_token: undefined,
	cost_report_token: undefined,
	child_budget_tokens: undefined,
	periods: undefined,
};

const validInputArguments: InferValidators<Validators> = {
	name: "Test Budget",
	workspace_token: "wt_123",
	cost_report_token: "crt_456",
	child_budget_tokens: ["cb_123", "cb_456"],
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
		data: {
			...undefineds,
			name: "Minimal Budget",
		},
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
		name: "budget with workspace token only",
		data: {
			...undefineds,
			name: "Workspace Budget",
			workspace_token: "wt_789",
		},
	},
	{
		name: "budget with cost report token only",
		data: {
			...undefineds,
			name: "Cost Report Budget",
			cost_report_token: "crt_789",
		},
	},
	{
		name: "hierarchical budget with child tokens",
		data: {
			...undefineds,
			name: "Parent Budget",
			child_budget_tokens: ["cb_111", "cb_222"],
		},
	},
	{
		name: "budget with single period",
		data: {
			...undefineds,
			name: "Single Period Budget",
			periods: [
				{
					start_at: "2024-01-01",
					amount: 5000,
				},
			],
		},
	},
	{
		name: "budget with period without end date",
		data: {
			...undefineds,
			name: "Open-ended Budget",
			periods: [
				{
					start_at: "2024-01-01",
					amount: 2500,
				},
			],
		},
	},
	{
		name: "period with zero amount",
		data: {
			...undefineds,
			name: "Zero Budget",
			periods: [
				{
					start_at: "2024-01-01",
					amount: 0,
				},
			],
		},
	},
	{
		name: "period with negative amount",
		data: {
			...undefineds,
			name: "Invalid Budget",
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
		name: "empty child budget tokens array",
		data: {
			...undefineds,
			name: "Empty Children Budget",
			child_budget_tokens: [],
		},
	},
	{
		name: "empty periods array",
		data: {
			...undefineds,
			name: "Empty Periods Budget",
			periods: [],
		},
	},
	{
		name: "handles invalid date in periods start_at",
		data: {
			...validInputArguments,
			periods: [
				{
					...validInputArguments.periods![0],
					start_at: "invalid-date",
				},
			],
		},
		expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
	},
	{
		name: "handles invalid date in periods end_at",
		data: {
			...validInputArguments,
			periods: [
				{
					...validInputArguments.periods![0],
					end_at: "invalid-date",
				},
			],
		},
		expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
	},
];

const successData: CreateBudgetResponse = {
	token: "bt_123",
	name: "Test Budget",
	workspace_token: "wt_123",
	cost_report_token: "crt_456",
	periods: [
		{
			start_at: "2024-01-01",
			end_at: "2024-01-31",
			amount: "1000.0",
		},
	],
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/budgets",
				params: validInputArguments,
				method: "POST",
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
				endpoint: "/v2/budgets",
				params: {
					name: "Budget with Invalid Report",
					cost_report_token: "crt_nonexistent",
				},
				method: "POST",
				result: {
					ok: false,
					errors: [{ message: "Cost report not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				...undefineds,
				name: "Budget with Invalid Report",
				cost_report_token: "crt_nonexistent",
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Cost report not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
