#!/usr/bin/env node
// Fails the build if a provider credential or provider SDK ends up in the
// browser bundle. Checks known key formats and, when present, the literal
// values configured in the root .env files.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseEnv } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const distDir = join(root, 'apps/web/dist');
const SECRET_VARS = ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];
const PATTERNS = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Anthropic API key', re: /sk-ant-[0-9A-Za-z_-]{20,}/ },
  { name: 'OpenAI API key', re: /sk-(?:proj-)?[0-9A-Za-z_-]{32,}/ },
  { name: 'Gemini SDK endpoint', re: /generativelanguage\.googleapis\.com/ },
];

if (!existsSync(distDir)) {
  console.error(`check-bundle-secrets: ${distDir} not found; run the web build first.`);
  process.exit(1);
}

const literals = [];
for (const file of ['.env', '.env.local'].map((f) => join(root, f))) {
  if (!existsSync(file)) continue;
  const env = parseEnv(readFileSync(file, 'utf8'));
  for (const key of SECRET_VARS) if (env[key]?.length >= 8) literals.push({ key, value: env[key] });
}
for (const key of SECRET_VARS) if (process.env[key]?.length >= 8) literals.push({ key, value: process.env[key] });

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
};
walk(distDir);

const findings = [];
for (const file of files) {
  const text = readFileSync(file, 'latin1');
  for (const { name, re } of PATTERNS) if (re.test(text)) findings.push(`${name} in ${file}`);
  for (const { key, value } of literals) if (text.includes(value)) findings.push(`value of ${key} in ${file}`);
}

if (findings.length) {
  console.error('check-bundle-secrets: FAILED\n' + findings.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`check-bundle-secrets: OK (${files.length} files scanned, ${literals.length} configured secret values checked)`);
