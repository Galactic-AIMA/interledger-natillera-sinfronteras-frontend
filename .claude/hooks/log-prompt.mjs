#!/usr/bin/env node
// Hook UserPromptSubmit de Claude Code: guarda cada prompt literal en prompts/AAAA-MM-DD-<persona>.md.
// Exigido por la política de IA de la hackatón (https://interledger.org/hackathon/ai-policy/).
// Nunca bloquea el prompt: ante cualquier error sale con código 0.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

// Red de seguridad: tapa secretos conocidos antes de escribir (los prompts se publican).
const REDACTIONS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[LLAVE PRIVADA REDACTADA]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[AWS ACCESS KEY REDACTADA]"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, "[GOOGLE API KEY REDACTADA]"],
  [/\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}\b/g, "[JWT REDACTADO]"],
  [/\b(sk|pk|rk)[-_](live|test|ant|proj)?[-_]?[A-Za-z0-9_-]{20,}\b/g, "[API KEY REDACTADA]"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, "[TOKEN GITHUB REDACTADO]"],
  [/((?:aws_secret_access_key|secret|password|contraseña|token)\s*[:=]\s*)\S+/gi, "$1[REDACTADO]"],
];

export function redact(text) {
  return REDACTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

function persona(cwd) {
  if (process.env.NATILLERA_PERSONA) return slug(process.env.NATILLERA_PERSONA);
  try {
    const name = execSync("git config user.name", { cwd, encoding: "utf8" }).trim();
    return slug(name.split(/[\s-]+/)[0] || "anonimo");
  } catch {
    return "anonimo";
  }
}

function slug(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "anonimo";
}

// Fecha y hora de Colombia, que es donde corre la hackatón.
function bogotaNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function main() {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!prompt.trim()) return;

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const dir = join(root, "prompts");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const { date, time } = bogotaNow();
  const who = persona(root);
  const file = join(dir, `${date}-${who}.md`);
  if (!existsSync(file)) {
    appendFileSync(file, `# Prompts de ${who} · ${date}\n\nRegistro literal y automático (hook de Claude Code). Herramienta: Claude Code.\n`);
  }
  const session = String(input.session_id || "").slice(0, 8);
  appendFileSync(file, `\n## ${time} · sesión ${session}\n\n${redact(prompt).trimEnd()}\n`);
}

try {
  main();
} catch {
  // El registro nunca debe impedir trabajar.
}
process.exit(0);
