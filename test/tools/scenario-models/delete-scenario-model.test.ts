import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/scenario-models/delete-scenario-model";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const TOKEN = "frcst_mdl_47f8f6511171bc8f";
const ENCODED_TOKEN = "frcst_mdl_a/b";

testTool(
  tool,
  [
    {
      name: "takes scenario_model_token",
      data: {
        scenario_model_token: TOKEN,
      },
    },
    {
      name: "empty token",
      data: {
        scenario_model_token: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/scenario_models/${pathEncode(TOKEN)}`,
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
          scenario_model_token: TOKEN,
        });
        expect(res).toEqual({ token: TOKEN });
      },
    },
    {
      name: "encodes token in path",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/scenario_models/${pathEncode(ENCODED_TOKEN)}`,
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
          scenario_model_token: ENCODED_TOKEN,
        });
        expect(res).toEqual({ token: ENCODED_TOKEN });
      },
    },
    {
      name: "enterprise entitlement error",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/scenario_models/${pathEncode(TOKEN)}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Scenario models are not enabled for this account." }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          scenario_model_token: TOKEN,
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Scenario models are not enabled for this account." }],
        });
      },
    },
  ]
);
