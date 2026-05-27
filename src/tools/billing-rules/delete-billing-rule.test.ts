import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../utils/testing";
import tool from "./delete-billing-rule";

testTool(
  tool,
  [
    {
      name: "takes billing_rule_token",
      data: {
        billing_rule_token: "blng_rl_fb27faa25ef5ea72",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/billing_rules/${pathEncode("blng_rl_fb27faa25ef5ea72")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          billing_rule_token: "blng_rl_fb27faa25ef5ea72",
        });
        expect(res).toEqual({ token: "blng_rl_fb27faa25ef5ea72" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/billing_rules/${pathEncode("blng_rl_nonexistent")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Billing rule not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          billing_rule_token: "blng_rl_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Billing rule not found" }],
        });
      },
    },
  ]
);
