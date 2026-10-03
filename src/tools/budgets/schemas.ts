import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { nonempty } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const budgetType = z.enum(["cost", "usage"]);

export const budgetUnit = nonempty();

export const budgetPeriod = z.object({
  start_at: dateValidator("The start date of the period."),
  end_at: dateValidator("The end date of the period.").optional(),
  amount: z.number().min(0).describe("The amount of the period."),
});

export const periodCadence = z.object({
  starts_at: dateValidator("The anchor date for budget period intervals (YYYY-MM-DD). Send null to clear.").nullable(),
  interval_count: z.number().int().min(1).optional().describe("The number of interval units per budget period."),
  interval_unit: z
    .enum(["day", "week", "month", "year"])
    .optional()
    .describe("The unit for budget period intervals. One of: day, week, month, year."),
});

// Output schemas mirror the Vantage client response types.
export const periodCadenceResponseSchema = z.object({
  starts_at: z
    .string()
    .nullable()
    .optional()
    .describe("The anchor date for budget period intervals. ISO 8601 date (YYYY-MM-DD)."),
  interval_count: z.number().describe("The number of interval units per budget period."),
  interval_unit: z.string().describe("The unit for budget period intervals. One of: day, week, month, year."),
});

export const budgetPeriodResponseSchema = z.object({
  start_at: z.string().describe("The start of the Budget Period, in ISO 8601 format."),
  end_at: z.string().describe("The end of the Budget Period, in ISO 8601 format."),
  amount: z.string().describe("The amount of the Budget Period as a string to ensure precision."),
});

export const budgetPerformanceResponseSchema = z.object({
  date: z.string().describe("The date of the Budget performance measurement, in ISO 8601 format."),
  actual: z
    .string()
    .describe(
      "Settled spend as a percent of the Budget amount for the month. For example, 114% means spend is 14% over the Budget."
    ),
  amount: z.string().describe("The amount of the Budget Period as a string to ensure precision."),
  type: z.enum(["cost", "usage"]).describe("The type of Budget. One of: cost, usage."),
  unit: z.string().nullable().optional().describe("The usage unit for usage Budget performance amounts."),
});

export const budgetResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  name: z.string().nullable().describe("The name of the Budget."),
  type: z.enum(["cost", "usage"]).describe("The type of Budget. One of: cost, usage."),
  unit: z.string().nullable().optional().describe("The usage unit for usage Budgets."),
  workspace_token: z.string().describe("The token for the Workspace the Budget is a part of."),
  user_token: z.string().nullable().optional().describe("The token for the User who created this Budget."),
  created_by_token: z.string().nullable().optional().describe("The token of the Creator of the Budget."),
  cost_report_token: z.string().nullable().optional().describe("The token of the Report associated with the Budget."),
  created_at: z.string().describe("The date and time, in UTC, the Budget was created. ISO 8601 Formatted."),
  budget_alert_tokens: z.array(z.string()).describe("The tokens of the BudgetAlerts associated with the Budget."),
  child_budget_tokens: z
    .array(z.string())
    .describe("The tokens of the child Budgets associated with the hierarchical Budget."),
  period_cadence: periodCadenceResponseSchema.describe("Period cadence."),
  periods: z.array(budgetPeriodResponseSchema).describe("The budget periods associated with the Budget."),
  performance: z
    .array(budgetPerformanceResponseSchema)
    .optional()
    .describe("The historical performance of the Budget."),
});

export const listBudgetsResponseSchema = z.object({
  budgets: z.array(budgetResponseSchema).describe("Budgets."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const budgetOutputSchema = budgetResponseSchema.shape;

export const listBudgetsOutputSchema = listBudgetsResponseSchema.shape;
