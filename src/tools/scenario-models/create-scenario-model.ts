import type { CreateScenarioModelRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  nullablePriority,
  nullableProvider,
  nullableService,
  scenarioModelPeriod,
  validateProviderServiceWorkspace,
  workspaceTokenForFilters,
} from "./schemas";

const description = `
Create a ScenarioModel with optional periods and provider/service filters.
Assign created ScenarioModels to Cost Report forecasts with create-report-forecast or update-report-forecast.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled or the caller cannot create models.
`.trim();

export default registerTool({
  name: "create-scenario-model",
  title: "Create Scenario Model",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("Title for the new ScenarioModel."),
    priority: nullablePriority,
    provider: nullableProvider,
    service: nullableService,
    workspace_token: workspaceTokenForFilters,
    periods: z.array(scenarioModelPeriod).optional().describe("The periods for the ScenarioModel."),
  },
  async execute(args, ctx) {
    validateProviderServiceWorkspace(args);

    const response = await ctx.callVantageApi("/v2/scenario_models", args as CreateScenarioModelRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
