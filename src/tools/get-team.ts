import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific team with its token.
`.trim();

const args = {
	token: z.string().describe("The team token to retrieve"),
};

export default registerTool({
	name: "get-team",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/teams/${encodeURIComponent(args.token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
