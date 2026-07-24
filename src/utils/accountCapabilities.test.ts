import { describe, expect, it, vi } from "vitest";
import MCPUserError from "../tools/structure/MCPUserError";
import { resolveAccountCapabilities } from "./accountCapabilities";

describe("resolveAccountCapabilities", () => {
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

  it("sets msp false when managed_accounts returns the documented MSP denial message as a string", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: ["This feature is not available for this account."],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
  });

  it("sets msp false when managed_accounts returns the documented MSP denial in an error object", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: [{ message: "This feature is not available for this account." }],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
  });

  it("sets msp false when managed_accounts returns the legacy permission denial message", async () => {
    const ctx = {
      callVantageApi: vi.fn().mockResolvedValue({
        ok: false,
        errors: [{ message: "You do not have permission to access this resource." }],
      }),
    };

    await expect(resolveAccountCapabilities(ctx)).resolves.toEqual({ msp: false });
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
