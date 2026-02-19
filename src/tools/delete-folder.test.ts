import { type GetFolderResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./delete-folder";
import { requestsInOrder, testTool } from "./utils/testing";

const successData: GetFolderResponse = {
	token: "fldr_123",
	title: "Platform Team Reports",
	saved_filter_tokens: [],
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z",
	workspace_token: "wrkspc_123",
};

testTool(
	tool,
	[
		{
			name: "takes folder_token",
			data: {
				folder_token: "fldr_123",
			},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
					params: {},
					method: "DELETE",
					result: {
						ok: true,
						data: successData,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({ folder_token: "fldr_123" });
				expect(res).toEqual(successData);
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/folders/${pathEncode("fldr_notfound")}`,
					params: {},
					method: "DELETE",
					result: {
						ok: false,
						errors: [{ message: "Folder not found" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({ folder_token: "fldr_notfound" });
				expect(err.exception).toEqual({
					errors: [{ message: "Folder not found" }],
				});
			},
		},
	]
);
