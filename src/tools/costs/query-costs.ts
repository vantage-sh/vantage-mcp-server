import z from "zod";
import dateValidator from "../../utils/dateValidator";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

import { assertCostsSort, costsMetricSortNote, groupingSortArgs } from "./schemas";

const FINE_PAGE_LIMIT = 50;
const COARSE_PAGE_LIMIT = 100;
const RESPONSE_CHAR_BUDGET = 40_000;
const TRUNCATION_NOTE =
  "Results were truncated to stay within the response budget. Narrow the filter, drop resource_id, or raise date_bin.";

const description = `
Query for costs in a Vantage Account. These are independent of a cost reports.
Use Vantage VQL to structure a query.
Queries must be scoped to a Workspace. Use the get-myself tool to know about available workspaces, and the list-cost-integrations tool to know about available cost providers. If the user didn't tell you a workspace it is best to ask them than to guess it.
It's best to set a date range of 30 days unless the user specifically wants to query for a longer time period.

When a user asks for data from an account, use the "get-cost-provider-accounts" tool to match a name to an account. With that result, always use the account_id in the account_id parameter for this tool. 

Here is some more detailed info on using VQL:
All costs originate from a Cost Provider (generally a cloud company like AWS, Azure, Datadog) and then filter on a service that they provide (like EC2, S3, etc).
A cost provider is required on every VQL query.
VQL is always in parenthesis. Always use single quotes around names that are being queried.
To query on a cost provider, use this syntax: (costs.provider = '<provider name>'). The provider name must come from the list-cost-providers tool.
To query on a cost service, use this syntax: (costs.provider = '<provider name>' AND costs.service = '<service name>').
For AWS, costs.service must be a CUR identifier (e.g. 'AmazonEC2', 'AmazonVPC', 'AWSDirectConnect'). Resolve aliases from service values returned by a broad query-costs probe — not display names from list-cost-services.
If a query returns no rows, run one broad probe query first (provider only, date_bin=month, wide date range) to learn available months and service identifiers before retrying with a narrower filter.
For month-over-month comparisons, span both months in start_date/end_date with date_bin=month and settings_show_previous_period=true instead of separate queries per month.
Prefer one query-costs call with all needed groupings (e.g. service, account_id, tag:<key>) over multiple calls that only change groupings.
You can only filter against one cost provider at a time. If you want to query for costs from two providers, you need to use the OR operator. Example: ((costs.provider = 'aws') OR (costs.provider = 'azure'))
You can otherwise use the IN system to compare against a list of items, like this: (costs.provider = 'aws' AND costs.service IN ('AWSQueueService', 'AWSLambda'))
To filter within a cost provider, keep the cost provider part and add a AND section, example: (costs.provider = 'aws' AND costs.service = 'AmazonRDS')
Many costs have tags on them. A tag is a "name" and one or more values.
To find an AWS cost that has a tag of "environment" the value "production", use this syntax: (costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production')
You can also query for any value of the "environment" tag, like this: (costs.provider = 'aws' AND tags.name = 'environment')
Items without a tag can also be filtered, example: (costs.provider = 'aws' AND tags.name = NULL)
Parenthesis can be nested. Here we surround an OR clause to look for either of two values for a tag: (costs.provider = 'aws' AND tags.name = 'environment' AND (tags.value = 'dev' OR tags.value = 'staging'))
A user can have more than one provider account. They can filter on provider accounts if they supply you with the account id. Example: (costs.provider = 'aws' AND costs.account_id = '1000000717')
You can also combine top-level queries to find for two providers: ((costs.provider = 'datadog') OR (costs.provider = 'azure'))
Some cost providers operate in a specific region, you can filter using the costs.region field. Example: (costs.provider = 'aws' AND costs.region = 'us-east-1')
Note that when users want to query a Custom Provider, that has a special case. When doing a VQL query for custom provider, use the 'token' you get back from the 'list-cost-integrations' tool. Here is an example, where the token of the custom provider is "accss_crdntl_07171984": 
  (costs.provider = 'custom_provider:accss_crdntl_07171984')

The DateBin parameter controls the time granularity of returned results.
When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
records. If omitted, DateBin defaults to day.
resource_id or tag groupings with a day bin are one row per resource per day and will be truncated. Do not issue several resource-level query-costs calls in parallel.

Cost settings (credits, refunds, discounts, tax, amortization, etc.) default to the workspace's default report settings.
Only provide these parameters if you need to override those defaults.

Use settings_aggregate_by to choose the metric: cost (default), usage, or count.
When aggregate_by is count, the response includes total_count and counts (date-binned distinct Group By permutation counts for the full requested period).

When the user wants the most expensive, highest-cost, or top groupings, set sort_column to amount and sort_direction to desc. Page 1 is that ranking, not a date-ordered sample. For resource-level questions use sort_column=amount and date_bin=month, and filter to one account or region before asking for a daily series. For highest usage, set settings_aggregate_by to usage and sort_column to usage_amount.
`.trim();

const args = {
  ...groupingSortArgs,
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  filter: z.string().describe("A VQL query to run against your vantage account"),
  start_date: dateValidator("Start date to filter costs by, format=YYYY-MM-DD").optional(),
  end_date: dateValidator("End date to filter costs by, format=YYYY-MM-DD").optional(),
  workspace_token: vantageToken("workspace"),
  date_bin: z
    .enum(["day", "week", "month"])
    .optional()
    .describe("Date binning for returned costs. Defaults to day if omitted. Allowed values: day, week, month."),
  settings_include_credits: z
    .boolean()
    .optional()
    .describe("Results will include credits. If not provided, the workspace's default report setting is used."),
  settings_include_refunds: z
    .boolean()
    .optional()
    .describe("Results will include refunds. If not provided, the workspace's default report setting is used."),
  settings_include_discounts: z
    .boolean()
    .optional()
    .describe("Results will include discounts. If not provided, the workspace's default report setting is used."),
  settings_include_tax: z
    .boolean()
    .optional()
    .describe("Results will include tax. If not provided, the workspace's default report setting is used."),
  settings_amortize: z
    .boolean()
    .optional()
    .describe("Results will amortize. If not provided, the workspace's default report setting is used."),
  settings_unallocated: z
    .boolean()
    .optional()
    .describe("Results will show unallocated costs. If not provided, the workspace's default report setting is used."),
  settings_aggregate_by: z
    .enum(["cost", "usage", "count"])
    .optional()
    .describe(
      "Results will aggregate by cost, usage, or count. If not provided, the workspace's default report setting is used."
    ),
  settings_show_previous_period: z
    .boolean()
    .optional()
    .describe(
      "Results will show previous period cost, usage, or count comparison. If not provided, the workspace's default report setting is used."
    ),
  groupings: z
    .array(z.string())
    .default(["provider", "service", "region"])
    .describe(
      "Group the results by specific field(s). Defaults to provider, service, region. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, usage_unit, tag:<tag_value>. Include every grouping you need in one call rather than issuing separate calls per grouping."
    ),
};

type DateBin = "day" | "week" | "month";

type CostUsage = {
  amount?: unknown;
  unit?: unknown;
};

type CostRow = {
  accrued_at?: string;
  amount?: string;
  currency?: string;
  usage?: CostUsage | null;
  usage_unit?: string | null;
  [key: string]: unknown;
};

type QueryCostsResult = {
  costs: CostRow[];
  total_cost: unknown;
  total_count?: unknown;
  counts?: unknown;
  notes: string;
  hint?: string;
  pagination: { nextPage: number; hasNextPage: boolean };
  truncated?: true;
  rows_returned?: number;
  rows_omitted?: number;
};

export default registerTool({
  name: "query-costs",
  title: "Query Costs",
  description,
  compactOutput: true,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    assertCostsSort(args);

    // Build request params. Settings that are not explicitly provided are left out
    // so the API uses the workspace's default report settings.
    const requestParams: Record<string, unknown> = {};
    for (const key of Object.keys(args)) {
      const typedKey = key as keyof typeof args;
      if ((key === "sort_column" || key === "sort_direction") && args[typedKey] === undefined) continue;
      if (key.startsWith("settings_")) {
        const value = args[typedKey];
        if (value !== undefined) {
          const keyWithoutPrefix = key.slice("settings_".length);
          requestParams[`settings[${keyWithoutPrefix}]`] = value;
        }
      } else {
        requestParams[key] = args[typedKey];
      }
    }
    // /v2/costs expects groupings as a comma-joined string (coerce_with: CSV::parse_line),
    // not the bracket-suffix array format used by other endpoints.
    if (Array.isArray(requestParams.groupings)) {
      requestParams.groupings = (requestParams.groupings as string[]).join(",");
    }
    requestParams.limit = queryCostsPageLimit(args.groupings, args.date_bin);

    const response = await ctx.callVantageApi("/v2/costs", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }

    const totalCost = response.data.total_cost;
    const totalCurrency = totalCostCurrency(totalCost);
    const collapsed = shouldCollapseRows(args.sort_column, args.filter);
    const prepared = collapsed
      ? collapseCostRows(response.data.costs as CostRow[])
      : (response.data.costs as CostRow[]);
    const costs = prepared.map((row) => slimCostRow(row, totalCurrency, args.settings_aggregate_by));

    const hint =
      response.data.costs.length === 0
        ? "No cost rows matched this filter and date range. Widen the date range, verify costs.service identifiers from a broad probe query, and avoid retrying with only a different groupings parameter."
        : undefined;

    const notes = collapsed
      ? collapsedRankingNote(args.sort_column as "amount" | "usage_amount", args.sort_direction)
      : dateBinNotes(args.date_bin, args.sort_column, args.sort_direction);

    const result: QueryCostsResult = {
      costs,
      total_cost: totalCost,
      ...(response.data.total_count != null ? { total_count: response.data.total_count } : {}),
      ...(response.data.counts != null ? { counts: response.data.counts } : {}),
      notes,
      ...(hint ? { hint } : {}),
      pagination: paginationData(response.data),
    };

    return fitToCharBudget(result);
  },
});

function queryCostsPageLimit(groupings: readonly string[], dateBin: DateBin | undefined): number {
  const fineGrouping = groupings.some((grouping) => grouping === "resource_id" || grouping.startsWith("tag:"));
  if (fineGrouping || dateBin === undefined || dateBin === "day") return FINE_PAGE_LIMIT;
  return COARSE_PAGE_LIMIT;
}

function dateBinNotes(
  dateBin: DateBin | undefined,
  sortColumn: string | undefined,
  sortDirection: "asc" | "desc" | undefined
): string {
  let notes: string;
  switch (dateBin) {
    case "day":
      notes = "Costs records represent one day.";
      break;
    case "week":
      notes =
        "Costs records represent one week, the accrued_at field is the first day of the week. If your date range is less than one week, this record includes only data for that date range, not the full week.";
      break;
    case "month":
      notes =
        "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month.";
      break;
    default:
      notes = "Costs records represent one day.";
      break;
  }

  const ranking = costsMetricSortNote(sortColumn, sortDirection);
  if (ranking) notes = `${notes} ${ranking}`;
  return notes;
}

function collapsedRankingNote(
  sortColumn: "amount" | "usage_amount",
  sortDirection: "asc" | "desc" | undefined
): string {
  const direction = sortDirection ?? "asc";
  const metric = sortColumn === "usage_amount" ? "usage" : "cost";
  const order = direction === "desc" ? "highest total first" : "lowest total first";
  const ascHint =
    direction === "asc"
      ? ` This page starts with the lowest totals. For the ${sortColumn === "usage_amount" ? "highest usage" : "most expensive groupings"}, call again with sort_direction=desc.`
      : "";

  return `Results are ordered by each grouping's total ${metric} over the full requested period, ${order}. Each row is one grouping; amount and usage, when present, are the sum of the date bins on this page. Later pages continue this ranking.${ascHint}`;
}

function shouldCollapseRows(sortColumn: string | undefined, filter: string): boolean {
  if (sortColumn !== "amount" && sortColumn !== "usage_amount") return false;
  return !filterNamesSingleResourceId(filter);
}

function filterNamesSingleResourceId(filter: string): boolean {
  const equals = [...filter.matchAll(/costs\.resource_id\s*(?<![=!<>])=\s*'([^']*)'/gi)].map((match) => match[1]);
  const inLists = [...filter.matchAll(/costs\.resource_id\s+IN\s*\(([^)]*)\)/gi)];
  const inValues = inLists.flatMap((match) => [...match[1].matchAll(/'([^']*)'/g)].map((part) => part[1]));
  const mentions = filter.match(/costs\.resource_id/gi)?.length ?? 0;
  if (mentions === 0 || mentions !== equals.length + inLists.length) return false;
  return new Set([...equals, ...inValues]).size === 1;
}

function collapseCostRows(rows: CostRow[]): CostRow[] {
  const groups = new Map<string, CostRow[]>();
  const order: string[] = [];
  for (const row of rows) {
    const key = groupingKey(row);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
      order.push(key);
    }
  }

  return order.map((key) => {
    const group = groups.get(key) ?? [];
    if (group.length <= 1) return group[0] ?? {};
    return sumCostGroup(group);
  });
}

function groupingKey(row: CostRow): string {
  const identity: Record<string, unknown> = {};
  for (const key of Object.keys(row).sort()) {
    if (key === "accrued_at" || key === "amount" || key === "currency" || key === "usage") continue;
    identity[key] = row[key];
  }
  const unit = usageUnit(row);
  if (unit !== undefined) identity.usage_unit_metric = unit;
  return JSON.stringify(identity);
}

function sumCostGroup(group: CostRow[]): CostRow {
  const [first] = group;
  if (!first) return {};
  const summed: CostRow = {};
  for (const key of Object.keys(first)) {
    if (key === "accrued_at" || key === "amount" || key === "usage") continue;
    summed[key] = first[key];
  }
  if (group.every((row) => row.accrued_at === first.accrued_at) && first.accrued_at !== undefined) {
    summed.accrued_at = first.accrued_at;
  }
  summed.amount = sumDecimalStrings(group.map((row) => decimalString(row.amount)));

  const usageRows = group.filter((row) => usageAmount(row) !== undefined);
  const unit = usageUnit(usageRows[0] ?? {});
  if (usageRows.length > 0 && unit !== undefined) {
    summed.usage = {
      amount: sumDecimalStrings(usageRows.map((row) => usageAmount(row) ?? "0")),
      unit,
    };
  }
  return summed;
}

function slimCostRow(row: CostRow, totalCurrency: string | undefined, aggregateBy: string | undefined): CostRow {
  const next: CostRow = { ...row };
  if (totalCurrency) delete next.currency;
  if (aggregateBy === "usage" && typeof next.usage_unit === "string" && next.usage_unit === usageUnit(next)) {
    delete next.usage_unit;
  }
  return next;
}

function usageAmount(row: CostRow | undefined): string | undefined {
  const amount = row?.usage?.amount;
  if (typeof amount === "string" && amount.trim() !== "") return amount.trim();
  if (typeof amount === "number" && Number.isFinite(amount)) return String(amount);
  return undefined;
}

function usageUnit(row: CostRow | undefined): string | undefined {
  const unit = row?.usage?.unit;
  return typeof unit === "string" ? unit : undefined;
}

function totalCostCurrency(totalCost: unknown): string | undefined {
  if (!totalCost || typeof totalCost !== "object" || !("currency" in totalCost)) return undefined;
  const currency = totalCost.currency;
  return typeof currency === "string" && currency !== "" ? currency : undefined;
}

function decimalString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return "0";
}

function sumDecimalStrings(values: string[]): string {
  let scale = 0;
  const parts = values.map((value) => {
    const trimmed = value.trim();
    const negative = trimmed.startsWith("-");
    const unsigned = negative ? trimmed.slice(1) : trimmed.replace(/^\+/, "");
    const [whole = "0", frac = ""] = unsigned.split(".");
    scale = Math.max(scale, frac.length);
    return { negative, whole: whole || "0", frac };
  });

  let total = 0n;
  const factor = 10n ** BigInt(scale);
  for (const part of parts) {
    const minor = BigInt(part.whole) * factor + BigInt(part.frac.padEnd(scale, "0") || "0");
    total += part.negative ? -minor : minor;
  }

  const negative = total < 0n;
  const abs = negative ? -total : total;
  const sign = negative ? "-" : "";
  if (scale === 0) return `${sign}${abs.toString()}`;
  const whole = abs / factor;
  const frac = (abs % factor).toString().padStart(scale, "0");
  return `${sign}${whole.toString()}.${frac}`;
}

function fitToCharBudget(result: QueryCostsResult): QueryCostsResult {
  const costs = result.costs;
  const page = (rows: CostRow[], truncated: boolean): QueryCostsResult => {
    if (!truncated) return { ...result, costs: rows };
    return {
      ...result,
      costs: rows,
      truncated: true,
      rows_returned: rows.length,
      rows_omitted: costs.length - rows.length,
      notes: TRUNCATION_NOTE,
      pagination: { hasNextPage: false, nextPage: 0 },
    };
  };

  if (JSON.stringify(page(costs, false)).length <= RESPONSE_CHAR_BUDGET) return page(costs, false);

  let kept = costs.length;
  while (kept > 0 && JSON.stringify(page(costs.slice(0, kept), true)).length > RESPONSE_CHAR_BUDGET) {
    kept -= 1;
  }
  return page(costs.slice(0, kept), true);
}
