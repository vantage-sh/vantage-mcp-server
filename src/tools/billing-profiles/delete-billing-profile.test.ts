import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../utils/testing";
import tool from "./delete-billing-profile";

testTool(
  tool,
  [
    {
      name: "takes billing_profile_token",
      data: {
        billing_profile_token: "blng_prf_fb27faa25ef5ea72",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/billing_profiles/${pathEncode("blng_prf_fb27faa25ef5ea72")}`,
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
          billing_profile_token: "blng_prf_fb27faa25ef5ea72",
        });
        expect(res).toEqual({ token: "blng_prf_fb27faa25ef5ea72" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/billing_profiles/${pathEncode("blng_prf_nonexistent")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Billing profile not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          billing_profile_token: "blng_prf_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Billing profile not found" }],
        });
      },
    },
  ]
);
