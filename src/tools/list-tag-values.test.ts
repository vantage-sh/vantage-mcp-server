import { expect } from "vitest";
import { pathEncode } from "../../vantage-ts";
import tool from "./list-tag-values";
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
	key: "environment",
	page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "blank string key",
		data: {
			key: "",
			page: 1,
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "valid arguments",
		data: validArguments,
	},
];

const successData = {
	tag_values: [
		{ value: "production", providers: ["aws", "azure"] },
		{ value: "staging", providers: ["aws"] },
		{ value: "development", providers: ["aws", "gcp"] },
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/tags/${pathEncode(validArguments.key)}/values`,
				params: {
					...validArguments,
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
				tag_values: successData.tag_values,
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
				endpoint: `/v2/tags/${pathEncode(validArguments.key)}/values`,
				params: {
					...validArguments,
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Tag not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Tag not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
