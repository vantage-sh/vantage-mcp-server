import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  bankingInformationAttributes,
  billingInformationAttributes,
  businessInformationAttributes,
  invoiceAdjustmentAttributes,
} from "./schemas";

const description = `
Updates an existing Billing Profile. You can update the nickname, billing information, business information, banking information, or invoice adjustments.
`.trim();

export default registerTool({
  name: "update-billing-profile",
  title: "Update Billing Profile",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    billing_profile_token: z.string().describe("The token of the Billing Profile to update."),
    nickname: z.string().min(1).optional().describe("The updated nickname of the Billing Profile."),
    billing_information_attributes: billingInformationAttributes,
    business_information_attributes: businessInformationAttributes,
    banking_information_attributes: bankingInformationAttributes,
    invoice_adjustment_attributes: invoiceAdjustmentAttributes,
  },
  async execute(args, ctx) {
    const { billing_profile_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/billing_profiles/${pathEncode(billing_profile_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
