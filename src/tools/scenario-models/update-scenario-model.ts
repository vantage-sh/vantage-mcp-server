import { pathEncode, type UpdateScenarioModelRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
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
Update an existing ScenarioModel. Providing periods replaces the full period set.
Use null for priority, provider, service, or period end_at to clear those values.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled or the caller cannot update the model.
`.trim();

export default registerTool({
  name: "update-scenario-model",
  title: "Update Scenario Model",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    scenario_model_token: vantageToken("scenario_model"),
    title: z.string().min(1).optional().describe("Updated title for the ScenarioModel."),
    priority: nullablePriority,
    provider: nullableProvider,
    service: nullableService,
    workspace_token: workspaceTokenForFilters,
    periods: z
      .array(scenarioModelPeriod)
      .optional()
      .describe("Replaces all periods on the ScenarioModel when provided."),
  },
  async execute(args, ctx) {
    const { scenario_model_token, ...body } = args;

    if (
      body.title === undefined &&
      body.priority === undefined &&
      body.provider === undefined &&
      body.service === undefined &&
      body.periods === undefined
    ) {
      throw new MCPUserError({
        errors: [
          {
            message: "At least one of title, priority, provider, service, or periods must be provided",
          },
        ],
      });
    }

    validateProviderServiceWorkspace(body);

    const response = await ctx.callVantageApi(
      `/v2/scenario_models/${pathEncode(scenario_model_token)}`,
      body as UpdateScenarioModelRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
