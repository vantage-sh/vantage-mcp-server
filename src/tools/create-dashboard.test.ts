import { expect } from "vitest";
import tool from "./create-dashboard";
import {
	dateValidatorPoisoner,
	type ExecutionTestTableItem,
	type ExtractValidators,
	type InferValidators,
	poisonOneValue,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const undefineds = {
	widgets: undefined,
	saved_filter_tokens: undefined,
	date_bin: undefined,
	start_date: undefined,
	end_date: undefined,
	date_interval: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
	...undefineds,
	title: "My Dashboard",
	workspace_token: "wrkspc_123",
};

const validInputArguments: InferValidators<Validators> = {
	...undefineds,
	title: "New Dashboard",
	workspace_token: "wrkspc_123",
	widgets: [
		{
			widgetable_token: "rprt_123",
			title: "Weekly Sales Report",
			settings: {
				display_type: "chart",
			},
		},
		{
			widgetable_token: "rprt_456",
			settings: {
				display_type: "table",
			},
		},
	],
	saved_filter_tokens: ["svd_fltr_123"],
	date_bin: "week",
	date_interval: "this_month",
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
	poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
	{
		name: "invalid widget display type",
		data: {
			...validInputArguments,
			widgets: [
				{
					widgetable_token: "rprt_123",
					settings: {
						display_type: "graph" as any,
					},
				},
			],
		},
		expectedIssues: ['Invalid option: expected one of "table"|"chart"'],
	},
];

const successData = {
	token: "dshbrd_123",
	title: "New Dashboard",
	workspace_token: "wrkspc_123",
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/dashboards",
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
				endpoint: "/v2/dashboards",
				params: minimalValidInputArguments,
				method: "POST",
				result: {
					ok: false,
					errors: [{ message: "Workspace not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(minimalValidInputArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Workspace not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
