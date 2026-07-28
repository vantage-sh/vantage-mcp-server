import z from "zod";
import dateValidator from "../../utils/dateValidator";
import MCPUserError from "../structure/MCPUserError";

export const amountType = z.enum(["dollar", "percent"]).describe("Whether the amount is in dollars or percent.");

export const scenarioModelPeriod = z.object({
  start_at: dateValidator("The start date of the period. Must be YYYY-MM-DD."),
  end_at: dateValidator("The end date of the period. Must be YYYY-MM-DD. Send null to clear.").nullable().optional(),
  amount: z.number().finite().describe("The period amount as a decimal number."),
  amount_type: amountType,
});

export const nullablePriority = z
  .number()
  .int()
  .nullable()
  .optional()
  .describe("Priority used when applying scenario models. Send null to clear.");

export const nullableProvider = z
  .string()
  .nullable()
  .optional()
  .describe(
    "Optional provider filter. Use list-cost-providers to discover values. Requires workspace_token when set or cleared. Send null to clear."
  );

export const nullableService = z
  .string()
  .nullable()
  .optional()
  .describe(
    "Optional service filter. Use list-cost-services to discover values. Requires workspace_token when set or cleared. Send null to clear."
  );

export const workspaceTokenForFilters = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Workspace token required when provider or service is set or cleared. Use get-myself to discover workspaces."
  );

export function validateProviderServiceWorkspace(args: {
  provider?: string | null;
  service?: string | null;
  workspace_token?: string;
}) {
  if ((args.provider !== undefined || args.service !== undefined) && !args.workspace_token) {
    throw new MCPUserError({
      errors: [{ message: "workspace_token is required when provider or service is set" }],
    });
  }
}
