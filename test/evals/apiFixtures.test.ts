import { describe, expect, it } from "vitest";
import { type ApiFixture, type ApiRequestRecord, createFixtureApi, isSubset } from "../../evals/_lib/apiFixtures";

const emptyCosts = { costs: [], total_cost: { amount: "0.00", currency: "USD" } };

describe("isSubset", () => {
  it("matches object subsets and exact arrays", () => {
    expect(isSubset({ a: 1 }, { a: 1, b: 2 })).toBe(true);
    expect(isSubset({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(isSubset({ a: [1] }, { a: [1, 2] })).toBe(false);
    expect(isSubset({ c: 1 }, { a: 1 })).toBe(false);
  });
});

describe("createFixtureApi", () => {
  it("serves the first fixture whose params are a subset of the request", async () => {
    const fixtures: ApiFixture[] = [
      {
        endpoint: "/v2/costs",
        method: "GET",
        params: { groupings: "category" },
        result: { ok: false, errors: ["Invalid grouping"] },
      },
      { endpoint: "/v2/costs", method: "GET", result: { ok: true, data: emptyCosts } },
    ];
    const requests: ApiRequestRecord[] = [];
    const callVantageApi = createFixtureApi(fixtures, requests, {});

    const rejected = await callVantageApi(
      "/v2/costs",
      { filter: "(costs.provider = 'aws')", workspace_token: "wrkspc_abc123", groupings: "category" },
      "GET"
    );
    const served = await callVantageApi(
      "/v2/costs",
      { filter: "(costs.provider = 'aws')", workspace_token: "wrkspc_abc123", groupings: "cost_category" },
      "GET"
    );

    expect(rejected).toEqual({ ok: false, errors: ["Invalid grouping"] });
    expect(served).toEqual({ ok: true, data: emptyCosts });
    expect(requests.map((request) => request.matched)).toEqual([true, true]);
    expect(requests[1].params).toMatchObject({ groupings: "cost_category" });
  });

  it("serves a `when` fixture only if its checks pass on the tool input and request", async () => {
    const answer = { costs: [], total_cost: { amount: "42.00", currency: "USD" } };
    const fixtures: ApiFixture[] = [
      {
        endpoint: "/v2/costs",
        method: "GET",
        when: [
          { arg: "filter", matches: "costs\\.category\\s*=" },
          { param: "groupings", includes: "cost_subcategory" },
        ],
        result: { ok: true, data: answer },
      },
      { endpoint: "/v2/costs", method: "GET", result: { ok: true, data: emptyCosts } },
    ];
    const correctInput = { filter: "(costs.provider = 'aws' AND costs.category = 'Data Transfer')" };
    const wrongInput = { filter: "(costs.provider = 'aws' AND costs.cost_category = 'Data Transfer')" };

    const correct = await createFixtureApi(fixtures, [], correctInput)(
      "/v2/costs",
      { ...correctInput, workspace_token: "wrkspc_abc123", groupings: "cost_subcategory" },
      "GET"
    );
    const wrongFilter = await createFixtureApi(fixtures, [], wrongInput)(
      "/v2/costs",
      { ...wrongInput, workspace_token: "wrkspc_abc123", groupings: "cost_subcategory" },
      "GET"
    );
    const wrongGrouping = await createFixtureApi(fixtures, [], correctInput)(
      "/v2/costs",
      { ...correctInput, workspace_token: "wrkspc_abc123", groupings: "subcategory" },
      "GET"
    );

    expect(correct).toEqual({ ok: true, data: answer });
    expect(wrongFilter).toEqual({ ok: true, data: emptyCosts });
    expect(wrongGrouping).toEqual({ ok: true, data: emptyCosts });
  });

  it("returns an API error and records unmatched requests", async () => {
    const requests: ApiRequestRecord[] = [];
    const callVantageApi = createFixtureApi([], requests, {});

    const response = await callVantageApi("/v2/me", {}, "GET");

    expect(response.ok).toBe(false);
    expect(requests).toEqual([{ endpoint: "/v2/me", method: "GET", params: {}, matched: false }]);
  });
});
