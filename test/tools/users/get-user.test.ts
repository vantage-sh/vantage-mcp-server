import { type GetUserResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/users/get-user";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const success: GetUserResponse = {
  token: "usr_abc123def456",
  name: "Alice Johnson",
  email: "alice.johnson@example.com",
  role: "Admin",
  last_seen_at: "2025-11-10",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "takes user_token",
    data: {
      user_token: "usr_abc123def456",
    },
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/users/${pathEncode("usr_abc123def456")}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: success,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({ user_token: "usr_abc123def456" });
      expect(res).toEqual(success);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/users/${pathEncode("usr_notfound")}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "User not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({ user_token: "usr_notfound" });
      expect(err.exception).toEqual({
        errors: [{ message: "User not found" }],
      });
    },
  },
];

const validOutput = success;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(tool, argumentSchemaTests, outputSchemaTests, executionTests);
