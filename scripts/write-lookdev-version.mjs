import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionSrc = readFileSync(join(root, "src/game/version.ts"), "utf8");
const release = versionSrc.match(/LOOKDEV_RELEASE = "([^"]+)"/)?.[1] ?? "dev";
let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
} catch {
  /* sandbox without git */
}
const builtAt = new Date().toISOString();
const payload = { builtAt, viewer: "Кристина", release, commit };
writeFileSync(join(root, "public/lookdev.json"), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[lookdev] ${release} ${commit} ${builtAt}`);
