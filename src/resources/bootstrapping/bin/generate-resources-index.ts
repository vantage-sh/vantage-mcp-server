import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import generateIndex from "../utils/generateIndex";

const indexPath = resolve(__dirname, "../../index.ts");
const indexContent = generateIndex(dirname(indexPath));
writeFileSync(indexPath, indexContent);
console.log(`Generated ${indexPath}`);
