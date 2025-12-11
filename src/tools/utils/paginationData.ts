function getPageFromUrl(nextPageUrl: string) {
	const url = new URL(nextPageUrl);
	const page = url.searchParams.get("page");
	if (page) {
		return Number.parseInt(page, 10);
	}
	return 0;
}

const NO_NEXT_PAGE = {
	nextPage: 0,
	hasNextPage: false,
};

type Data =
	| {
			links?: { next?: string | null } | null;
	  }
	| undefined;

export default function paginationData(apiResponseData: Data) {
	const nextPageLink = apiResponseData?.links?.next;
	if (!nextPageLink) {
		return NO_NEXT_PAGE;
	}
	const page = getPageFromUrl(nextPageLink);
	if (page === 0) {
		return NO_NEXT_PAGE;
	}
	return {
		nextPage: page,
		hasNextPage: true,
	};
}
