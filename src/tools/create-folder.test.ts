import { expect } from "vitest";
import tool from "./create-folder";
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
	parent_folder_token: undefined,
	saved_filter_tokens: undefined,
	workspace_token: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
	...undefineds,
	title: "My Folder",
};

const validInputArguments: InferValidators<Validators> = {
	title: "Platform Team Reports",
	parent_folder_token: "fldr_123",
	saved_filter_tokens: ["svd_fltr_abc", "svd_fltr_def"],
	workspace_token: "wrkspc_123",
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
			...undefineds,
			title: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
];

const successData = {
	token: "fldr_789",
	title: "Platform Team Reports",
	parent_folder_token: "fldr_123",
	saved_filter_tokens: ["svd_fltr_abc", "svd_fltr_def"],
	workspace_token: "wrkspc_123",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/folders",
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
				endpoint: "/v2/folders",
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
