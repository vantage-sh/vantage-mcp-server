import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty, vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { folderType } from "./schemas";

const description = `
List Cost Report and Resource Report Folders, optionally filtered by Folder type. Folder tokens link to https://console.vantage.sh/go/<token>.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  q: nonempty().optional().describe("Search Folders by title."),
  workspace_token: vantageToken("workspace", {
    description: "Only return Folders in this Workspace.",
  }).optional(),
  type: folderType.optional().describe("Filter by Folder type."),
};

export default registerTool({
  name: "list-folders",
  title: "List Folders",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/folders", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      folders: response.data.folders,
      pagination: paginationData(response.data),
    };
  },
});
