import { expect } from "vitest";
import tool from "./get-users";
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
	page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "default page",
		data: {
			page: undefined,
		},
	},
	{
		name: "valid page number",
		data: validArguments,
	},
];

const successData = {
	users: [
		{
			token: "usr_abc123def456",
			name: "Alice Johnson",
			email: "alice.johnson@example.com",
			role: "Admin",
			last_seen_at: "2025-11-10",
		},
		{
			token: "usr_xyz789ghi012",
			name: "Bob Smith",
			email: "bob.smith@example.com",
			role: "Owner",
			last_seen_at: "2025-11-11",
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/users",
				params: {
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
				users: successData.users,
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
				endpoint: "/v2/users",
				params: {
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Access denied" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
