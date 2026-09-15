import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/access-policies/delete-access-policy";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

testTool(
  tool,
  [
    {
      name: "takes an Access Policy token",
      data: { access_policy_token: "accss_plcy_c40f15062b6d5c37" },
    },
    {
      name: "validates Access Policy token",
      data: { access_policy_token: "rsrc_accss_grnt_123" },
      expectedIssues: ["Must be a Access Policy token (accss_plcy_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/access_policies/${pathEncode("accss_plcy_c40f15062b6d5c37")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess({ access_policy_token: "accss_plcy_c40f15062b6d5c37" })).toEqual({
          token: "accss_plcy_c40f15062b6d5c37",
        });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/access_policies/${pathEncode("accss_plcy_missing")}`,
          params: {},
          method: "DELETE",
          result: { ok: false, errors: [{ message: "Access Policy not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({ access_policy_token: "accss_plcy_missing" });
        expect(error.exception).toEqual({ errors: [{ message: "Access Policy not found" }] });
      },
    },
  ]
);
