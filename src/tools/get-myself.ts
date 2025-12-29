import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Get data that is available to the current auth token. 
This includes the list of Workspaces they have access to.

default_workspace_token: The token of the workspace that is set as the default workspace for the user and can be used for queries unless told otherwise.
`.trim();

const args = {};

export default registerTool({
	name: "get-myself",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(_, ctx) {
		const response = await ctx.callVantageApi("/me", {}, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
