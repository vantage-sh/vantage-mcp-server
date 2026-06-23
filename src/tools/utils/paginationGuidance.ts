export const PAGINATION_GUIDANCE =
  "Pagination: pass `page` starting at 1. Each response includes `pagination.hasNextPage` and `pagination.nextPage`; when hasNextPage is true, call again with `page` set to `nextPage`. Stop when hasNextPage is false.";

export const PAGINATION_LIMIT_GUIDANCE =
  "You can also pass `limit` to control page size when the tool supports it.";
