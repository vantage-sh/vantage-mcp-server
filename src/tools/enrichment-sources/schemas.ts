import z from "zod";
import { vantageToken } from "../../utils/zod";

export const enrichmentSourceToken = vantageToken("enrichment_source", {
  description: "Use list-enrichment-sources to discover enrichment sources.",
});

export const page = z.number().int().min(1).default(1).describe("Page number, defaults to 1.");
