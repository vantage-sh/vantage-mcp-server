import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";
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

export const workspaceTokenForFilters = vantageToken("workspace", {
  description: "Required when provider or service is set or cleared.",
}).optional();

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

// Output schemas mirror the Vantage client response types.
export const scenarioModelPeriodResponseSchema = z.object({
  start_at: z.string().describe("The ISO 8601 start date of the period."),
  end_at: z.string().nullable().describe("The ISO 8601 end date of the period."),
  amount: z.string().describe("The period amount as a string to preserve decimal precision."),
  amount_type: z.enum(["dollar", "percent"]).describe("Whether the amount is in dollars or percent."),
});

export const scenarioModelResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("Title."),
  priority: z.number().nullable().describe("Priority."),
  workspace_token: z.string().nullable().describe("Workspace token."),
  provider: z.string().nullable().describe("Provider."),
  service: z.string().nullable().describe("Service."),
  periods: z.array(scenarioModelPeriodResponseSchema).describe("Periods."),
  created_by_token: z.string().nullable().describe("Created by token."),
  created_at: z.string().describe("Created at."),
  updated_at: z.string().describe("Updated at."),
});

export const listScenarioModelsResponseSchema = z.object({
  scenario_models: z.array(scenarioModelResponseSchema).describe("Scenario models."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const scenarioModelOutputSchema = scenarioModelResponseSchema.shape;

export const listScenarioModelsOutputSchema = listScenarioModelsResponseSchema.shape;
