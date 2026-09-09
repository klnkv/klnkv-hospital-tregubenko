import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const builtAt = new Date().toISOString();
writeFileSync(
  join(root, "public/lookdev.json"),
  `${JSON.stringify({ builtAt, viewer: "Кристина" }, null, 2)}\n`,
);
console.log(`[lookdev] ${builtAt}`);
