import z from "zod";
import { costProvidersSchema } from "./costProviderSchema";

export const tagListQueryFields = {
  providers: costProvidersSchema
    .optional()
    .describe("Scope results to one or more cost providers (e.g. aws, azure, gcp)."),
  search_query: z.string().optional().describe("Filter tag keys or values by a search string."),
  sort_direction: z.enum(["asc", "desc"]).optional().describe("Sort direction for results. Defaults to asc."),
};
