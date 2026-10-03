import z from "zod";

// Output schemas mirror the Vantage client response types.
export const costServiceResponseSchema = z.object({
  name: z.string().describe("The name of the CostService."),
  provider: z.string().describe("The key value of the CostProvider."),
});

export const listCostServicesResponseSchema = z.object({
  cost_services: z.array(costServiceResponseSchema).describe("Cost services."),
});

export const listCostServicesOutputSchema = listCostServicesResponseSchema.shape;
