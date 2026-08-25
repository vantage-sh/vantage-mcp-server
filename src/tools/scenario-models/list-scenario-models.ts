import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List ScenarioModels available to the current Vantage API token.
ScenarioModels define future-cost adjustments (dollar or percent) that can be assigned to Cost Report forecasts via report-forecast tools.
Use page 1 when calling this tool for the first time. If the user asks for all ScenarioModels, keep calling with pagination.nextPage until pagination.hasNextPage is false.
The token of a ScenarioModel can be used with get-scenario-model, update-scenario-model, delete-scenario-model, and create-report-forecast / update-report-forecast.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
};

export default registerTool({
  name: "list-scenario-models",
  title: "List Scenario Models",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/scenario_models", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      scenario_models: response.data.scenario_models,
      pagination: paginationData(response.data),
    };
  },
});
