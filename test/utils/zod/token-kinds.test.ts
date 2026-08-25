import { expect, test } from "vitest";
import { TOKEN_KINDS } from "../../../src/utils/zod";

test("prefixes match public API token examples", () => {
  expect(TOKEN_KINDS.access_grant.prefix).toBe("rsrc_accss_grnt");
  expect(TOKEN_KINDS.anomaly_notification.prefix).toBe("rprt_alrt");
  expect(TOKEN_KINDS.workspace.prefix).toBe("wrkspc");
  expect(TOKEN_KINDS.budget.prefix).toBe("bdgt");
  expect(TOKEN_KINDS.billing_rule.prefix).toBe("bllng_rule");
  expect(TOKEN_KINDS.recommendation.prefix).toBe("rcmmndtn");
  expect(TOKEN_KINDS.recommendation_view.prefix).toBe("rec_vw");
  expect(TOKEN_KINDS.canvas.prefix).toBe("cnvs");
  expect(TOKEN_KINDS.anomaly_alert.prefix).toBe("anmly_alrt");
  expect(TOKEN_KINDS.virtual_tag_config.prefix).toBe("vtag");
  expect(TOKEN_KINDS.virtual_tag_config_value.prefix).toBe("vtag_val");
  expect(TOKEN_KINDS.cost_report.prefix).toBe("rprt");
  expect(TOKEN_KINDS.report_forecast.prefix).toBe("rprt_frcst");
  expect(TOKEN_KINDS.scenario_model.prefix).toBe("frcst_mdl");
  expect(TOKEN_KINDS.saved_filter.prefix).toBe("svd_fltr");
});

test("does not expose internal-only token kinds", () => {
  expect(TOKEN_KINDS).not.toHaveProperty("autopilot_commitment");
  expect(TOKEN_KINDS).not.toHaveProperty("data_integrity_check");
  expect(TOKEN_KINDS).not.toHaveProperty("forecast_model");
  expect(TOKEN_KINDS).not.toHaveProperty("service_ticket");
});

test("every kind has a non-empty prefix and label", () => {
  for (const [kind, def] of Object.entries(TOKEN_KINDS)) {
    expect(def.prefix.length, kind).toBeGreaterThan(0);
    expect(def.label.length, kind).toBeGreaterThan(0);
  }
});

test("prefixes are unique", () => {
  const prefixes = Object.values(TOKEN_KINDS).map((def) => def.prefix);
  expect(new Set(prefixes).size).toBe(prefixes.length);
});
