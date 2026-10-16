#!/usr/bin/env node
// Cruza los archivos tocados por commits asistidos por IA (trailer Co-Authored-By: Claude)
// contra lo declarado en AI_USAGE.md. Uso: node scripts/ai-usage-check.mjs
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

// En un repo sin commits `git log` falla: se trata como cero commits.
let aiCommits = [];
try {
  aiCommits = run('git log --format=%H --grep="Co-Authored-By: Claude" -i').split("\n").filter(Boolean);
} catch {
  aiCommits = [];
}

const aiFiles = new Set();
for (const sha of aiCommits) {
  run(`git show --name-only --format= ${sha}`).split("\n").filter(Boolean).forEach((f) => aiFiles.add(f));
}

const usage = existsSync("AI_USAGE.md") ? readFileSync("AI_USAGE.md", "utf8") : "";
// Un archivo cuenta como declarado si aparece su ruta o alguna de sus carpetas (ej. `app/`).
const declared = (file) => {
  const parts = file.split("/");
  return parts.some((_, i) => usage.includes(parts.slice(0, i + 1).join("/") + (i < parts.length - 1 ? "/" : "")));
};

const ignored = (f) => f.startsWith("prompts/") || f === "AI_USAGE.md" || f.endsWith("package-lock.json");
const missing = [...aiFiles].filter((f) => existsSync(f) && !ignored(f) && !declared(f)).sort();

const promptFiles = existsSync("prompts") ? readdirSync("prompts").filter((f) => f.endsWith(".md")) : [];
const sections = ["Tools Used", "Where and How We Used AI", "What We Did Ourselves", "Prompt Log"];
const missingSections = sections.filter((s) => !usage.includes(s));

console.log(`Commits asistidos por IA: ${aiCommits.length}`);
console.log(`Archivos tocados por esos commits: ${aiFiles.size}`);
console.log(`Archivos de prompts: ${promptFiles.length}`);
if (missingSections.length) console.log(`\nFaltan secciones en AI_USAGE.md: ${missingSections.join(", ")}`);
if (missing.length) {
  console.log("\nArchivos asistidos que AI_USAGE.md no menciona (ni su carpeta):");
  missing.forEach((f) => console.log(`  - ${f}`));
}
const ok = !missing.length && !missingSections.length && promptFiles.length > 0;
console.log(ok ? "\nOK: AI_USAGE.md cubre todo." : "\nRevisar antes de entregar.");
process.exit(ok ? 0 : 1);
