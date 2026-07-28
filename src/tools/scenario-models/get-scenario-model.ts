import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Get a specific ScenarioModel by token.
ScenarioModels define future-cost adjustments that can be assigned to Cost Report forecasts.
Use list-scenario-models to discover tokens. The token can also be used with update-scenario-model, delete-scenario-model, and report-forecast tools.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled.
`.trim();

const args = {
  scenario_model_token: z.string().min(1).describe("The ScenarioModel token to retrieve."),
};

export default registerTool({
  name: "get-scenario-model",
  title: "Get Scenario Model",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/scenario_models/${pathEncode(args.scenario_model_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
