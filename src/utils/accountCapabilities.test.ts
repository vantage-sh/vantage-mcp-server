import { afterEach, describe, expect, it, vi } from "vitest";
import { callApi } from "../shared";
import MCPUserError from "../tools/structure/MCPUserError";
import { resolveAccountCapabilities } from "./accountCapabilities";

const MANAGED_ACCOUNTS_MSP_DENIAL_BODY = JSON.stringify({
  errors: ["You do not have permission to access this resource."],
});

describe("resolveAccountCapabilities", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sets msp true when managed_accounts succeeds", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: true,
        data: { managed_accounts: [] },
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: true });
    expect(ctx.callVantageApi).toHaveBeenCalledWith("/v2/managed_accounts", { page: 1, limit: 1 }, "GET");
  });

  it("sets msp false when managed_accounts returns the MSP denial message as a string", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: ["You do not have permission to access this resource."],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
  });

  it("sets msp false when managed_accounts returns the MSP denial in an error object", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: [{ message: "You do not have permission to access this resource." }],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
  });

  it("parses core's Grape 403 body through callApi and resolves msp false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(MANAGED_ACCOUNTS_MSP_DENIAL_BODY, {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const ctx = {
      callVantageApi: (endpoint: "/v2/managed_accounts", params: { page: 1; limit: 1 }, method: "GET") =>
        callApi("https://api.vantage.sh", { Authorization: "Bearer test" }, params, method, endpoint),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/managed_accounts"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("throws when managed_accounts fails for a reason other than MSP denial", async () => {
    const errors = [
      {
        message: "Vantage API request failed",
        status: 503,
        endpoint: "/v2/managed_accounts",
        details: "upstream unavailable",
      },
    ];
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors,
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).rejects.toBeInstanceOf(MCPUserError);
    await expect(resolveAccountCapabilities(ctx)).rejects.toMatchObject({
      exception: { errors },
    });
  });
});
