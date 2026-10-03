import { type GetFolderResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/folders/get-folder";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const success: GetFolderResponse = {
  token: "fldr_123",
  title: "Infrastructure Resources",
  type: "ProviderResourceFolder",
  saved_filter_tokens: [],
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  workspace_token: "wrkspc_123",
};

const validOutput = success;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

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
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({ folder_token: "fldr_123" });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/folders/${pathEncode("fldr_notfound")}`,
          params: {},
          method: "GET",
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
