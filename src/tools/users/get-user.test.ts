import { type GetUserResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./get-user";

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

testTool(tool, argumentSchemaTests, executionTests);
