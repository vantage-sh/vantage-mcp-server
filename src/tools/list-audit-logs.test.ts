import { expect } from "vitest";
import tool from "./list-audit-logs";
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
	actor: "user@example.com",
	action: "workspace.create",
	since: "2025-01-01T00:00:00Z",
	until: "2025-01-31T23:59:59Z",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "default page",
		data: {
			page: undefined,
			actor: undefined,
			action: undefined,
			since: undefined,
			until: undefined,
		},
	},
	{
		name: "valid page number",
		data: {
			page: 1,
			actor: undefined,
			action: undefined,
			since: undefined,
			until: undefined,
		},
	},
	{
		name: "all valid arguments",
		data: validArguments,
	},
	{
		name: "only actor filter",
		data: {
			page: 1,
			actor: "user@example.com",
			action: undefined,
			since: undefined,
			until: undefined,
		},
	},
	{
		name: "only action filter",
		data: {
			page: 1,
			actor: undefined,
			action: "workspace.update",
			since: undefined,
			until: undefined,
		},
	},
	{
		name: "only date filters",
		data: {
			page: 1,
			actor: undefined,
			action: undefined,
			since: "2025-01-01T00:00:00Z",
			until: "2025-01-31T23:59:59Z",
		},
	},
];

const successData = {
	audit_logs: [
		{
			id: "audit_123",
			actor: { id: "user_123", email: "alice@example.com" },
			action: "workspace.create",
			timestamp: "2025-01-15T10:30:00Z",
			metadata: { workspace_id: "ws_123" },
		},
		{
			id: "audit_456",
			actor: { id: "user_456", email: "bob@example.com" },
			action: "workspace.update",
			timestamp: "2025-01-16T14:20:00Z",
			metadata: { workspace_id: "ws_123" },
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call with minimal arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
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
			const res = await callExpectingSuccess({
				page: 1,
				actor: undefined,
				action: undefined,
				since: undefined,
				until: undefined,
			});
			expect(res).toEqual({
				audit_logs: successData.audit_logs,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "successful call with all filters",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					...validArguments,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: true,
					data: {
						...successData,
						links: {
							next: "https://api.vantage.sh/v2/audit_logs?page=2",
						},
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				audit_logs: successData.audit_logs,
				pagination: {
					hasNextPage: true,
					nextPage: 2,
				},
			});
		},
	},
	{
		name: "successful call with only actor filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					actor: "user@example.com",
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
			const res = await callExpectingSuccess({
				page: 1,
				actor: "user@example.com",
				action: undefined,
				since: undefined,
				until: undefined,
			});
			expect(res).toEqual({
				audit_logs: successData.audit_logs,
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
				endpoint: "/v2/audit_logs",
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
			const err = await callExpectingMCPUserError({
				page: 1,
				actor: undefined,
				action: undefined,
				since: undefined,
				until: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
