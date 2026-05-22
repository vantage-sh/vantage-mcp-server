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
Creates a new Billing Profile with the specified parameters. A billing profile contains billing, business, banking, and invoice adjustment information.
`.trim();

export default registerTool({
  name: "create-billing-profile",
  title: "Create Billing Profile",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    nickname: z.string().min(1).describe("The nickname of the Billing Profile."),
    billing_information_attributes: billingInformationAttributes,
    business_information_attributes: businessInformationAttributes,
    banking_information_attributes: bankingInformationAttributes,
    invoice_adjustment_attributes: invoiceAdjustmentAttributes,
  },
  async execute(args, ctx) {
    const res = await ctx.callVantageApi("/v2/billing_profiles", args, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
