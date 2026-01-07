import { expect } from "vitest";
import tool from "./create-virtual-tag-config";
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
	backfill_until: undefined,
	collapsed_tag_keys: undefined,
	values: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
	...undefineds,
	key: "cost_center",
	overridable: false,
};

const validInputArguments: InferValidators<Validators> = {
	...undefineds,
	key: "cost_center",
	overridable: true,
	backfill_until: "2025-07-01",
	collapsed_tag_keys: [
		{
			key: "team",
			providers: ["aws", "gcp"],
		},
		{
			key: "environment",
		},
	],
	values: [
		{
			name: "Storage",
			filter: "(costs.provider = 'aws' AND costs.service = 'AmazonS3')",
			business_metric_token: "bsnss_mtrc_123",
			cost_metric: {
				filter: "(costs.provider = 'aws')",
				aggregation: {
					tag: "tag:environment",
				},
			},
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
	poisonOneValue(validInputArguments, "backfill_until", dateValidatorPoisoner),
	{
		name: "value missing filter",
		data: {
			...validInputArguments,
			values: [
				{
					name: "No Filter",
				} as any,
			],
		},
		expectedIssues: ["Required"],
	},
];

const successData = {
	token: "vtag_1234",
	key: "cost_center",
	overridable: true,
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/virtual_tag_configs",
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
				endpoint: "/v2/virtual_tag_configs",
				params: minimalValidInputArguments,
				method: "POST",
				result: {
					ok: false,
					errors: [{ message: "Invalid VQL" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(minimalValidInputArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid VQL" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
