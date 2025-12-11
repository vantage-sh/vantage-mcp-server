import { expect, test } from "vitest";
import paginationData from "./paginationData";

test("no object", () => {
	expect(paginationData({})).toEqual({
		hasNextPage: false,
		nextPage: 0,
	});
});

test("empty links object", () => {
	expect(paginationData({ links: {} })).toEqual({
		hasNextPage: false,
		nextPage: 0,
	});
});

test("has next page", () => {
	expect(
		paginationData({
			links: {
				next: "https://example.com?page=9000",
			},
		})
	).toEqual({
		hasNextPage: true,
		nextPage: 9000,
	});
});
