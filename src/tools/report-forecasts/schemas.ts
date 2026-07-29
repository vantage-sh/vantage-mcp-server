import z from "zod";
import { vantageToken } from "../../utils/zod";

export const scenarioModelTokens = z
  .array(vantageToken("scenario_model"))
  .optional()
  .describe("ScenarioModel tokens to assign to the forecast. Use list-scenario-models to discover tokens.");

export const nullableBusinessMetricToken = vantageToken("business_metric", {
  description: "Send null to clear.",
})
  .nullable()
  .optional();

export const setAsDefault = z
  .boolean()
  .optional()
  .describe("When true, sets this ReportForecast as the default forecast for its Cost Report.");
