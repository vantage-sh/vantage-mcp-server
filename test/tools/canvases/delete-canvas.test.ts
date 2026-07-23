import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../../src/utils/testing";
import tool from "../../../src/tools/canvases/delete-canvas";

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
