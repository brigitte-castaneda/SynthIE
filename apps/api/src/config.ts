import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';
import { loadEnvFiles } from './env';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
loadEnvFiles(repoRoot);

const EnvSchema = z
  .object({
    API_PORT: z.coerce.number().int().positive().default(8787),
    LLM_PROVIDER: z.enum(['gemini', 'ollama']).default('gemini'),
    LLM_MODEL: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    OLLAMA_BASE_URL: z.url().default('http://localhost:11434'),
    OLLAMA_NUM_CTX: z.coerce.number().int().positive().default(32768),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
    RATE_LIMIT_MAX: z.coerce.number().int().nonnegative().default(30),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(10 * 60_000),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY is required when LLM_PROVIDER=gemini',
      });
    }
  });

const DEFAULT_MODELS = { gemini: 'gemini-3-pro-preview', ollama: 'llama3.2' } as const;

export function loadConfig() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid API configuration:\n${issues}`);
  }
  const env = parsed.data;
  return {
    port: env.API_PORT,
    llm: {
      provider: env.LLM_PROVIDER,
      model: env.LLM_MODEL ?? DEFAULT_MODELS[env.LLM_PROVIDER],
      timeoutMs: env.LLM_TIMEOUT_MS,
      geminiApiKey: env.GEMINI_API_KEY,
      ollamaBaseUrl: env.OLLAMA_BASE_URL,
      ollamaNumCtx: env.OLLAMA_NUM_CTX,
    },
    rateLimit: { max: env.RATE_LIMIT_MAX, windowMs: env.RATE_LIMIT_WINDOW_MS },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
