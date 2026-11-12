import { afterEach, expect, it, vi } from "vitest";
import z from "zod";
import { callApi } from "../../../src/shared";
import createCostReport from "../../../src/tools/cost-reports/create-cost-report";
import updateCostReport from "../../../src/tools/cost-reports/update-cost-report";
import createCalculation from "../../../src/tools/custom-calculations/create-custom-calculation";
import deleteCalculation from "../../../src/tools/custom-calculations/delete-custom-calculation";
import getCalculation from "../../../src/tools/custom-calculations/get-custom-calculation";
import updateCalculation from "../../../src/tools/custom-calculations/update-custom-calculation";
import { calculation, divisionFilter } from "./fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Exercise the actual tool -> callApi -> JSON boundary without network access.
it.each([undefined, null, [], ["cstm_clcltn_123"]])("serializes report attachments %j", async (tokens) => {
  const fetchMock = vi.fn(async () => Response.json({ token: "rprt_123", custom_calculation_tokens: tokens ?? [] }));
  vi.stubGlobal("fetch", fetchMock);
  await updateCostReport.execute(
    z.object(updateCostReport.args).parse({ cost_report_token: "rprt_123", custom_calculation_tokens: tokens }),
    { callVantageApi: (endpoint, params, method) => callApi("https://api.example", {}, params, method, endpoint) }
  );
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://api.example/v2/cost_reports/rprt_123");
  expect(options.method).toBe("PUT");
  expect(JSON.parse(options.body as string)).toEqual(tokens === undefined ? {} : { custom_calculation_tokens: tokens });
});

it.each([undefined, null, [], ["rprt_123"]])(
  "serializes calculation attachments %j alongside definition edits",
  async (tokens) => {
    const fetchMock = vi.fn(async () => Response.json(calculation));
    vi.stubGlobal("fetch", fetchMock);
    const definition = { operation: "division", filter: divisionFilter, display_as: "per-n", unit_scale: 1000000 };
    await updateCalculation.execute(
      z
        .object(updateCalculation.args)
        .parse({ custom_calculation_token: calculation.token, ...definition, cost_report_tokens: tokens }),
      { callVantageApi: (endpoint, params, method) => callApi("https://api.example", {}, params, method, endpoint) }
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example/v2/custom_calculations/cstm_clcltn_123");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body as string)).toEqual({
      ...definition,
      ...(tokens === undefined ? {} : { cost_report_tokens: tokens }),
    });
  }
);

it("exposes only supported attachment and definition fields", () => {
  for (const tool of [createCalculation, updateCalculation]) {
    expect(tool.args).not.toHaveProperty("is_read_only");
    expect(tool.args).not.toHaveProperty("has_line");
    expect(tool.args).not.toHaveProperty("dashboard_tokens");
  }
  expect(createCalculation.args).not.toHaveProperty("cost_report_tokens");
  expect(createCostReport.args).not.toHaveProperty("custom_calculation_tokens");
  expect(updateCostReport.args).not.toHaveProperty("has_line");
});

it("handles a real 204 response for deletion", async () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(
    await deleteCalculation.execute(
      { custom_calculation_token: calculation.token },
      {
        callVantageApi: (endpoint, params, method) => callApi("https://api.example", {}, params, method, endpoint),
      }
    )
  ).toEqual({ token: calculation.token });
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.example/v2/custom_calculations/cstm_clcltn_123",
    expect.objectContaining({ method: "DELETE" })
  );
});

it("encodes tokens in API paths and preserves read-only response fields", async () => {
  const data = { ...calculation, is_read_only: true };
  const fetchMock = vi.fn(async () => Response.json(data));
  vi.stubGlobal("fetch", fetchMock);
  expect(
    await getCalculation.execute(
      { custom_calculation_token: "cstm_clcltn_abc/def?" },
      {
        callVantageApi: (endpoint, params, method) => callApi("https://api.example", {}, params, method, endpoint),
      }
    )
  ).toEqual(data);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.example/v2/custom_calculations/cstm_clcltn_abc%2Fdef%3F",
    expect.objectContaining({ method: "GET" })
  );
});

for (const tool of [createCalculation, updateCalculation]) {
  const updating = tool === updateCalculation;
  const required = updating
    ? { custom_calculation_token: calculation.token }
    : { title: calculation.title, filter: divisionFilter };
  it.each([undefined, null, 1000])(`${tool.name} preserves unit_scale %j in JSON`, async (unit_scale) => {
    const fetchMock = vi.fn(async () => Response.json(calculation));
    vi.stubGlobal("fetch", fetchMock);
    const args = z.object(tool.args).parse({ ...required, unit_scale });
    await tool.execute(args as never, {
      callVantageApi: (endpoint, params, method) => callApi("https://api.example", {}, params, method, endpoint),
    });
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.example/v2/custom_calculations${updating ? `/${calculation.token}` : ""}`);
    expect(options.method).toBe(updating ? "PUT" : "POST");
    const { custom_calculation_token: _token, ...body } = required as { custom_calculation_token?: string };
    expect(JSON.parse(options.body as string)).toEqual({
      ...body,
      ...(unit_scale === undefined ? {} : { unit_scale }),
    });
  });

  it.each([undefined, null, "", "Tracks equivalent token units"])(
    `${tool.name} preserves description %j and usage-unit arrays`,
    async (description) => {
      const fetchMock = vi.fn(async () => Response.json({ ...calculation, description: description || null }));
      vi.stubGlobal("fetch", fetchMock);
      const filter = {
        ...divisionFilter,
        usage_unit_numerator: ["Tokens", "tokens"],
        usage_unit_denominator: ["Requests", "requests"],
      };
      const definition = { filter, operation: "division", unit_scale: 1 };
      const args = z.object(tool.args).parse({ ...required, ...definition, description });
      const result = await tool.execute(args as never, {
        callVantageApi: (endpoint, params, method) => callApi("https://api.example", {}, params, method, endpoint),
      });
      const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      const { custom_calculation_token: _token, ...body } = required as { custom_calculation_token?: string };
      expect(JSON.parse(options.body as string)).toEqual({
        ...body,
        ...definition,
        ...(description === undefined ? {} : { description }),
      });
      expect(result.description).toBe(description || null);
    }
  );
}
