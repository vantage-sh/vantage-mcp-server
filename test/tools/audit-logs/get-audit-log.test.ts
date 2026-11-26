import type { GetAuditLogResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/audit-logs/get-audit-log";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = { audit_log_token: "adt_lg_123" };
const endpoint = "/v2/audit_logs/adt_lg_123";
const entry: GetAuditLogResponse = {
  token: args.audit_log_token,
  object_type: "Report",
  object_token: "rprt_123",
  object_title: "Monthly costs",
  event: "record_updated",
  source: "console",
  created_at: "2026-11-01T12:00:00Z",
  changed_values: { title: ["Weekly costs", "Monthly costs"] },
  unchanged_values: { token: "rprt_123" },
};

testTool(
  tool,
  [
    { name: "accepts an audit log token", data: args },
    {
      name: "rejects the audited object's token",
      data: { audit_log_token: "rprt_123" },
      expectedIssues: ["Must be a Audit Log token (adt_lg_*)"],
    },
  ],
  [
    {
      name: "returns the entry with its field-level changes",
      apiCallHandler: requestsInOrder([{ endpoint, params: {}, method: "GET", result: { ok: true, data: entry } }]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual(entry);
      },
    },
    {
      name: "forwards a not-found error from the API",
      apiCallHandler: requestsInOrder([
        { endpoint, params: {}, method: "GET", result: { ok: false, errors: [{ message: "Audit log not found" }] } },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError(args);
        expect(error.exception).toEqual({ errors: [{ message: "Audit log not found" }] });
      },
    },
  ]
);
