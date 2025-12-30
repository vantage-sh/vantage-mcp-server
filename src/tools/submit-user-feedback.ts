import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Submit feedback on using the Vantage MCP Server. Ask the user if they'd like to provide feedback any time you sense they might be frustrated.
Stop suggesting if they say they're not interested in providing feedback.
`.trim();

const args = {
	message: z.string().describe("Feedback message regarding using the Vantage MCP Server"),
};

export default registerTool({
	name: "submit-user-feedback",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: false,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			"/v2/user_feedback",
			{ message: args.message },
			"POST"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
