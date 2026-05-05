import z from "zod/v4";

export const billingInformationAttributes = z
  .object({
    token: z.string().optional().describe("The token of the billing information record."),
    company_name: z.string().optional().describe("The company name for billing."),
    country_code: z.string().optional().describe("The country code for billing address."),
    address_line_1: z.string().optional().describe("The first line of the billing address."),
    address_line_2: z.string().optional().describe("The second line of the billing address."),
    city: z.string().optional().describe("The city for the billing address."),
    state: z.string().optional().describe("The state for the billing address."),
    postal_code: z.string().optional().describe("The postal code for the billing address."),
    billing_email: z.array(z.string()).optional().describe("The billing email addresses."),
  })
  .optional()
  .describe("Billing information attributes for the billing profile.");

export const businessInformationAttributes = z
  .object({
    token: z.string().optional().describe("The token of the business information record."),
    metadata: z
      .object({
        custom_fields: z
          .array(
            z.object({
              name: z.string().optional().describe("The name of the custom field."),
              value: z.string().optional().describe("The value of the custom field."),
            })
          )
          .optional()
          .describe("Custom fields for the business information."),
      })
      .optional()
      .describe("Metadata for the business information."),
  })
  .optional()
  .describe("Business information attributes for the billing profile.");

export const bankingInformationAttributes = z
  .object({
    token: z.string().optional().describe("The token of the banking information record."),
    bank_name: z.string().optional().describe("The name of the bank."),
    beneficiary_name: z.string().optional().describe("The name of the beneficiary."),
    tax_id: z.string().optional().describe("The tax ID."),
    secure_data: z
      .object({
        account_number: z.string().optional().describe("The bank account number."),
        routing_number: z.string().optional().describe("The routing number."),
        iban: z.string().optional().describe("The IBAN."),
        swift_bic: z.string().optional().describe("The SWIFT/BIC code."),
      })
      .optional()
      .describe("Secure banking data."),
  })
  .optional()
  .describe("Banking information attributes for the billing profile.");

export const invoiceAdjustmentAttributes = z
  .object({
    token: z.string().optional().describe("The token of the invoice adjustment record."),
    adjustment_items: z
      .array(
        z.object({
          name: z.string().describe("The name of the adjustment item."),
          adjustment_type: z.enum(["charge", "credit", "discount"]).optional().describe("The type of adjustment."),
          calculation_type: z.enum(["fixed", "percentage"]).describe("The calculation type for the adjustment."),
          amount: z.number().describe("The amount of the adjustment."),
        })
      )
      .optional()
      .describe("The adjustment items for the invoice."),
  })
  .optional()
  .describe("Invoice adjustment attributes for the billing profile.");
