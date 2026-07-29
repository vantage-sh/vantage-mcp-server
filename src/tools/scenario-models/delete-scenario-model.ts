import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Delete a ScenarioModel by token. This action is irreversible and regenerates forecasts that referenced the model.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled or the caller cannot delete the model.
`.trim();

export default registerTool({
  name: "delete-scenario-model",
  title: "Delete Scenario Model",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    scenario_model_token: vantageToken("scenario_model"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/scenario_models/${pathEncode(args.scenario_model_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.scenario_model_token };
  },
});
