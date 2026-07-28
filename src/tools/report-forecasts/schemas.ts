import z from "zod";

export const scenarioModelTokens = z
  .array(z.string().min(1))
  .optional()
  .describe("ScenarioModel tokens to assign to the forecast. Use list-scenario-models to discover tokens.");

export const nullableBusinessMetricToken = z
  .string()
  .nullable()
  .optional()
  .describe(
    "Optional BusinessMetric token for the forecast. Use list-business-metrics to discover tokens. Send null to clear."
  );

export const setAsDefault = z
  .boolean()
  .optional()
  .describe("When true, sets this ReportForecast as the default forecast for its Cost Report.");
