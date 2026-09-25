import z from "zod";
import { nonempty } from "../../utils/zod";

export const title = nonempty().describe("Saved Filter title.");
export const filter = z.string().describe("VQL filter applied to Cost Reports; see the VQL resource for syntax.");
