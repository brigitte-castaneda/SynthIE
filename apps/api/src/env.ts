import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Loads .env.local then .env from the repository root without overriding
 * variables already set in the process environment (real deployments should
 * inject secrets through the platform's secret manager instead of files).
 */
export function loadEnvFiles(rootDir: string): void {
  for (const name of ['.env.local', '.env']) {
    const file = resolve(rootDir, name);
    if (!existsSync(file)) continue;
    const parsed = parseEnv(readFileSync(file, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
