import type { GetCostsResponse } from "@vantage-sh/vantage-client";
import paginationData from "../../utils/paginationData";
import MCPUserError from "../structure/MCPUserError";

const MAX_RESPONSE_CHARS = 40_000;

type CostSummary = Pick<GetCostsResponse, "total_cost" | "counts" | "total_count"> & { notes: string; hint?: string };

export default function paginateCostRows(
  response: GetCostsResponse,
  summary: CostSummary,
  page: number,
  offset: number
) {
  if (offset > 0 && offset >= response.costs.length) {
    throw new MCPUserError({ errors: [{ message: "The row offset is outside this page. Restart the query." }] });
  }

  const costs = response.costs.slice(offset);
  const fullPage = { ...summary, costs, pagination: paginationData(response) };
  if (JSON.stringify(fullPage).length <= MAX_RESPONSE_CHARS) return fullPage;

  // Reserve room for the continuation before adding rows. The last possible offset
  // has at least as many digits as any offset returned for this page.
  const pagination = { hasNextPage: true, nextPage: page, nextRowOffset: response.costs.length };
  let length = JSON.stringify({ ...summary, costs: [], pagination }).length;
  let included = 0;
  for (const row of costs) {
    length += JSON.stringify(row).length + (included ? 1 : 0);
    if (length > MAX_RESPONSE_CHARS) break;
    included++;
  }
  if (included === 0) {
    throw new MCPUserError({
      errors: [
        { message: "The cost response exceeds the size limit. Narrow the date range or request fewer groupings." },
      ],
    });
  }
  return {
    ...summary,
    costs: costs.slice(0, included),
    pagination: { ...pagination, nextRowOffset: offset + included },
  };
}
