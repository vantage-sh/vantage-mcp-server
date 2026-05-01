import { type UpdateDashboardResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
	dateValidatorPoisoner,
	type ExecutionTestTableItem,
	type ExtractOutputSchema,
	type ExtractValidators,
	type InferValidators,
	poisonOneValue,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "../utils/testing";
import tool from "./update-dashboard";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
	title: undefined,
	widgets: undefined,
	saved_filter_tokens: undefined,
	date_bin: undefined,
	start_date: undefined,
	end_date: undefined,
	date_interval: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
	...undefineds,
	dashboard_token: "dshbrd_123",
};

const validInputArguments: InferValidators<Validators> = {
	...undefineds,
	dashboard_token: "dshbrd_123",
	title: "Updated Dashboard",
	widgets: [
		{
			widgetable_token: "rprt_123",
			title: "Weekly Sales Report",
			settings: {
				display_type: "chart",
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
	{
		name: "empty title",
		data: {
			...minimalValidInputArguments,
			title: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
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

const successData: UpdateDashboardResponse = {
	token: "dshbrd_123",
	title: "Updated Dashboard",
	workspace_token: "wrkspc_123",
	widgets: [],
	saved_filter_tokens: ["svd_fltr_123"],
	date_bin: "week",
	date_interval: "this_month",
	created_at: "2023-01-15T10:30:00Z",
	updated_at: "2023-01-16T10:30:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
				params: {
					title: "Updated Dashboard",
					widgets: [
						{
							widgetable_token: "rprt_123",
							title: "Weekly Sales Report",
							settings: { display_type: "chart" },
						},
					],
					saved_filter_tokens: ["svd_fltr_123"],
					date_bin: "week",
					date_interval: "this_month",
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
				endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
				params: {},
				method: "PUT",
				result: {
					ok: false,
					errors: [{ message: "Dashboard not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(minimalValidInputArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Dashboard not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
