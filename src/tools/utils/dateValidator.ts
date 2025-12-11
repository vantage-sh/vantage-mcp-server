import z from "zod";

const ERR_BAD_DATE = "Invalid date input, must be YYYY-MM-DD format and a reasonable date.";

function validDateInput(input: string): boolean {
	const MAX = "2030-01-01";
	const MIN = "2010-01-01";

	if (!input || input === "" || typeof input !== "string") {
		return false;
	}
	if (input < MIN || input > MAX) {
		return false;
	}
	const parseResult = Date.parse(input);
	if (
		Number.isNaN(parseResult) ||
		parseResult <= Date.parse(MIN) ||
		parseResult >= Date.parse(MAX)
	) {
		return false;
	}
	return true;
}

export default function dateValidator(description: string) {
	return z.string().refine(validDateInput, { message: ERR_BAD_DATE }).describe(description);
}
