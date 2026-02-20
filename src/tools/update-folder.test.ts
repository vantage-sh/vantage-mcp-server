import { type GetFolderResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./update-folder";
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
	title: undefined,
	parent_folder_token: undefined,
	saved_filter_tokens: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
	...undefineds,
	folder_token: "fldr_123",
};

const validInputArguments: InferValidators<Validators> = {
	folder_token: "fldr_123",
	title: "Updated Team Reports",
	parent_folder_token: "fldr_parent",
	saved_filter_tokens: ["svd_fltr_abc"],
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
];

const successData: GetFolderResponse = {
	token: "fldr_123",
	title: "Updated Team Reports",
	parent_folder_token: "fldr_parent",
	saved_filter_tokens: ["svd_fltr_abc"],
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-02T00:00:00Z",
	workspace_token: "wrkspc_123",
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
				params: {
					title: "Updated Team Reports",
					parent_folder_token: "fldr_parent",
					saved_filter_tokens: ["svd_fltr_abc"],
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
				endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
				params: {},
				method: "PUT",
				result: {
					ok: false,
					errors: [{ message: "Folder not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(minimalValidInputArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Folder not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
