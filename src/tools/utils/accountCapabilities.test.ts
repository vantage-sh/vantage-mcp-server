import { describe, expect, it, vi } from "vitest";
import MCPUserError from "../structure/MCPUserError";
import { resolveAccountCapabilities } from "./accountCapabilities";

describe("resolveAccountCapabilities", () => {
  it("sets msp true when exchange_rates succeeds", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: true,
        data: { exchange_rates: [] },
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: true });
    expect(ctx.callVantageApi).toHaveBeenCalledWith("/v2/exchange_rates", { page: 1, limit: 1 }, "GET");
  });

  it("sets msp false when exchange_rates returns the MSP denial message as a string", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: ["This feature is not available for this account."],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
  });

  it("sets msp false when exchange_rates returns the MSP denial in an error object", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: [{ message: "This feature is not available for this account." }],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
  });

  it("throws when exchange_rates fails for a reason other than MSP denial", async () => {
    const errors = [
      {
        message: "Vantage API request failed",
        status: 503,
        endpoint: "/v2/exchange_rates",
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
