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
	limit: 50,
	user: 123,
	workspace_token: "ws_123",
	action: "create" as const,
	object_name: "MyCostReport",
	source: "api" as const,
	object_type: "cost_report" as const,
	token: "audit_123",
	object_token: "obj_123",
	start_date: "2025-01-01T00:00:00Z",
	end_date: "2025-01-31T23:59:59Z",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "default page",
		data: {
			page: undefined,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "valid page number",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "all valid arguments",
		data: validArguments,
	},
	{
		name: "only user filter",
		data: {
			page: 1,
			limit: undefined,
			user: 123,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "only action filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: "update",
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "only date filters",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: "2025-01-01T00:00:00Z",
			end_date: "2025-01-31T23:59:59Z",
		},
	},
	{
		name: "only start_date filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: "2025-01-01T00:00:00Z",
			end_date: undefined,
		},
	},
	{
		name: "only end_date filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: "2025-01-31T23:59:59Z",
		},
	},
	{
		name: "action filter with 'create'",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: "create",
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "action filter with 'update'",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: "update",
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "action filter with 'delete'",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: "delete",
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "user and action combination",
		data: {
			page: 1,
			limit: undefined,
			user: 123,
			workspace_token: undefined,
			action: "create",
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "user and date combination",
		data: {
			page: 1,
			limit: undefined,
			user: 123,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: "2025-01-01T00:00:00Z",
			end_date: "2025-01-31T23:59:59Z",
		},
	},
	{
		name: "action and date combination",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: "update",
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: "2025-01-01T00:00:00Z",
			end_date: "2025-01-31T23:59:59Z",
		},
	},
	{
		name: "workspace_token filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: "ws_123",
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "object_name filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: "MyCostReport",
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "source filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: "console",
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "object_type filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: "virtual_tag",
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "token filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: "audit_123",
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "object_token filter",
		data: {
			page: 1,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: "obj_123",
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "limit filter",
		data: {
			page: 1,
			limit: 500,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "different page number",
		data: {
			page: 5,
			limit: undefined,
			user: undefined,
			workspace_token: undefined,
			action: undefined,
			object_name: undefined,
			source: undefined,
			object_type: undefined,
			token: undefined,
			object_token: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
];

const successData = {
	audit_logs: [
		{
			token: "audit_123",
			object_token: "wrkspc_123",
			object_type: "Workspace",
			object_title: "My Workspace",
			event: "record_created",
			source: "console",
			user: "alice@example.com",
			workspace_title: "My Workspace",
			workspace_token: "wrkspc_123",
			created_at: "2025-01-15T10:30:00Z",
			changed_values: {},
			unchanged_values: {},
		},
		{
			token: "audit_456",
			object_token: "wrkspc_123",
			object_type: "Workspace",
			object_title: "My Workspace",
			event: "record_updated",
			source: "console",
			user: "bob@example.com",
			workspace_title: "My Workspace",
			workspace_token: "wrkspc_123",
			created_at: "2025-01-16T14:20:00Z",
			changed_values: {},
			unchanged_values: {},
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
					user: undefined,
					workspace_token: undefined,
					action: undefined,
					object_name: undefined,
					source: undefined,
					object_type: undefined,
					token: undefined,
					object_token: undefined,
					start_date: undefined,
					end_date: undefined,
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
					limit: validArguments.limit ?? DEFAULT_LIMIT,
					action: "create" as const,
					source: "api" as const,
					object_type: "cost_report" as const,
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
		name: "successful call with only user filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					user: 123,
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
				limit: undefined,
				user: 123,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with only action filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					action: "create",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: "create",
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with only date filters",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					start_date: "2025-01-01T00:00:00Z",
					end_date: "2025-01-31T23:59:59Z",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: "2025-01-01T00:00:00Z",
				end_date: "2025-01-31T23:59:59Z",
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
		name: "successful call with only start_date filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					start_date: "2025-01-01T00:00:00Z",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: "2025-01-01T00:00:00Z",
				end_date: undefined,
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
		name: "successful call with only end_date filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					end_date: "2025-01-31T23:59:59Z",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: "2025-01-31T23:59:59Z",
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
		name: "successful call with action 'update'",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					action: "update",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: "update",
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with action 'delete'",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					action: "delete",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: "delete",
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with user and action combination",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					user: 123,
					action: "create",
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
				limit: undefined,
				user: 123,
				workspace_token: undefined,
				action: "create",
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with user and date combination",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					user: 123,
					start_date: "2025-01-01T00:00:00Z",
					end_date: "2025-01-31T23:59:59Z",
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
				limit: undefined,
				user: 123,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: "2025-01-01T00:00:00Z",
				end_date: "2025-01-31T23:59:59Z",
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
		name: "successful call with action and date combination",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					action: "update",
					start_date: "2025-01-01T00:00:00Z",
					end_date: "2025-01-31T23:59:59Z",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: "update",
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: "2025-01-01T00:00:00Z",
				end_date: "2025-01-31T23:59:59Z",
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
		name: "successful call with workspace_token filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					workspace_token: "ws_123",
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
				limit: undefined,
				user: undefined,
				workspace_token: "ws_123",
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with object_name filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					object_name: "MyCostReport",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: "MyCostReport",
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with source filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					source: "api",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: "api",
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with object_type filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					object_type: "cost_report",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: "cost_report",
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with token filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					token: "audit_123",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: "audit_123",
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with object_token filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					object_token: "obj_123",
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: "obj_123",
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with custom limit",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 1,
					limit: 500,
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
				limit: 500,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
		name: "successful call with different page number",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/audit_logs",
				params: {
					page: 5,
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
				page: 5,
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
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
				limit: undefined,
				user: undefined,
				workspace_token: undefined,
				action: undefined,
				object_name: undefined,
				source: undefined,
				object_type: undefined,
				token: undefined,
				object_token: undefined,
				start_date: undefined,
				end_date: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
