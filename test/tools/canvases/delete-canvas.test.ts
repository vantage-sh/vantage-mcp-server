import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/canvases/delete-canvas";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validOutput = { token: "cnvs_abc123" };

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
      name: "takes canvas_token",
      data: {
        canvas_token: "cnvs_abc123",
      },
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/canvases/${pathEncode("cnvs_abc123")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        } as any,
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          canvas_token: "cnvs_abc123",
        });
        expect(res).toEqual({ token: "cnvs_abc123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/canvases/${pathEncode("cnvs_notfound")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Canvas not found" }],
          },
        } as any,
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          canvas_token: "cnvs_notfound",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Canvas not found" }],
        });
      },
    },
  ]
);
