import { readFile, writeFile, copyFile, mkdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = process.argv.slice(2);
const vault = args[args.indexOf("--vault") + 1];
if (!args.includes("--vault") || !vault) throw new Error("Usage: node install.mjs --vault <vault-path>");
const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(path.resolve(vault), ".obsidian/plugins/lean-terminal");
const existing = JSON.parse(await readFile(path.join(target, "manifest.json"), "utf8"));
if (existing.id !== "lean-terminal" || !["1.4.0", "1.5.0", "1.5.1", "2.0.0"].includes(existing.version)) {
  throw new Error("Install a compatible Lean Terminal version (1.4.0, 1.5.0, 1.5.1 or 2.0.0) and its native binaries first. Unknown versions are not replaced.");
}
if (!(await stat(path.join(target, "node_modules/node-pty/lib/index.js"))).isFile()) throw new Error("Install Lean Terminal native binaries first.");
const files = ["main.js", "manifest.json", "styles.css"];
const payload = Object.fromEntries(await Promise.all(files.map(async name => [name, await readFile(path.join(root, name))])));
if (JSON.parse(payload["manifest.json"].toString()).version !== "2.0.0") throw new Error("Unexpected hotfix version.");
const backup = path.join(path.resolve(vault), ".obsidian/plugin-backups/lean-terminal", randomUUID());
await mkdir(backup, { recursive: true });
for (const name of files) await copyFile(path.join(target, name), path.join(backup, name));
await writeFile(path.join(backup, "destination.json"), JSON.stringify({ target }, null, 2));
for (const name of files) await writeFile(path.join(target, name), payload[name]);
console.log(`Installed in ${target}`);
console.log(`Backup: ${backup}`);
console.log("Reopen Obsidian. Settings and native binaries were preserved.");
