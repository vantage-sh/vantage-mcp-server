import { expect, test } from "vitest";
import { vantageToken } from "../../../src/utils/zod";

test("accepts a token with the expected prefix and trims whitespace", () => {
  expect(vantageToken("workspace").parse(" wrkspc_b7512e04f758f5e7 ")).toBe("wrkspc_b7512e04f758f5e7");
});

test("rejects an empty token with a too-small issue only", () => {
  const result = vantageToken("workspace").safeParse("   ");
  expect(result.success).toBe(false);
  if (result.success) {
    return;
  }
  expect(result.error.issues.map((issue) => issue.message)).toEqual([
    "Too small: expected string to have >=1 characters",
  ]);
});

test("rejects a token with the wrong prefix", () => {
  const result = vantageToken("workspace").safeParse("rcmmndtn_5a727210453f6dbc");
  expect(result.success).toBe(false);
  if (result.success) {
    return;
  }
  expect(result.error.issues[0]?.message).toBe("Must be a Workspace token (wrkspc_*)");
});

test("does not accept a Report Forecast token as a Cost Report token", () => {
  const reportForecastToken = "rprt_frcst_5a727210453f6dbc";

  expect(vantageToken("cost_report").safeParse(reportForecastToken).success).toBe(false);
  expect(vantageToken("report_forecast").safeParse(reportForecastToken).success).toBe(true);
});

test("builds a describe string with the token format", () => {
  expect(vantageToken("workspace").description).toBe("Workspace token (`wrkspc_*`).");
});

test("appends an optional description", () => {
  expect(
    vantageToken("workspace", {
      description: "Move the dashboard to a different workspace.",
    }).description
  ).toBe("Workspace token (`wrkspc_*`). Move the dashboard to a different workspace.");
});
