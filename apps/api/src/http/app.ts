import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  ChatRequestSchema,
  ReviewRequestSchema,
  type ApiErrorBody,
  type ApiErrorCode,
} from '@synthie/contracts';
import type { ZodType } from 'zod';
import type { AppConfig } from '../config';
import { LlmError, type LlmProvider } from '../llm';
import { runChat } from '../services/chatService';
import { runReview } from '../services/reviewService';
import { RateLimiter } from './rateLimiter';

/** 10 MB file as base64 (~13.4 MB) plus JSON envelope, analysis, and history. */
const MAX_BODY_BYTES = 20 * 1024 * 1024;

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

const LLM_STATUS: Record<LlmError['code'], number> = {
  provider_timeout: 504,
  provider_rate_limited: 429,
  provider_blocked: 422,
  provider_invalid_output: 502,
  provider_unavailable: 502,
};

export interface Logger {
  info(message: string): void;
  error(message: string, ...detail: unknown[]): void;
}

const consoleLogger: Logger = { info: (m) => console.log(m), error: (m, ...d) => console.error(m, ...d) };

export function createApp(config: AppConfig, provider: LlmProvider, logger: Logger = consoleLogger) {
  const limiter = new RateLimiter(config.rateLimit.max, config.rateLimit.windowMs);

  /** Runs a model-backed operation with a deadline that also ends if the client disconnects. */
  async function withDeadline<T>(req: IncomingMessage, res: ServerResponse, run: (signal: AbortSignal) => Promise<T>) {
    const clientGone = new AbortController();
    const onClose = () => {
      if (!res.writableFinished) clientGone.abort();
    };
    res.on('close', onClose);
    try {
      return await run(AbortSignal.any([AbortSignal.timeout(config.llm.timeoutMs), clientGone.signal]));
    } finally {
      res.off('close', onClose);
    }
  }

  function enforceRateLimit(req: IncomingMessage) {
    const retryAfter = limiter.check(req.socket.remoteAddress ?? 'unknown');
    if (retryAfter !== null) {
      throw new HttpError(429, 'provider_rate_limited', 'Too many requests. Try again later.', {
        'retry-after': String(retryAfter),
      });
    }
  }

  const routes: Record<string, (req: IncomingMessage, res: ServerResponse) => Promise<unknown>> = {
    'GET /api/health': async () => ({ status: 'ok', provider: provider.name, model: provider.model }),

    'POST /api/reviews': async (req, res) => {
      const body = await readJson(req, ReviewRequestSchema);
      enforceRateLimit(req);
      return withDeadline(req, res, (signal) => runReview(provider, body, signal));
    },

    'POST /api/chat': async (req, res) => {
      const body = await readJson(req, ChatRequestSchema);
      enforceRateLimit(req);
      return withDeadline(req, res, (signal) => runChat(provider, body, signal));
    },
  };

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    const started = Date.now();
    const path = (req.url ?? '/').split('?')[0];
    const routeKey = `${req.method} ${path}`;
    let status = 200;
    try {
      const route = routes[routeKey];
      if (!route) throw new HttpError(404, 'not_found', `No route for ${routeKey}`);
      const result = await route(req, res);
      sendJson(res, 200, result);
    } catch (error) {
      const { httpStatus, body, headers } = toErrorResponse(error, logger);
      status = httpStatus;
      if (!res.headersSent && !res.destroyed) sendJson(res, httpStatus, body, headers);
    } finally {
      // Metadata only: never log document contents, prompts, or model output.
      logger.info(
        JSON.stringify({ at: new Date().toISOString(), route: routeKey, status, ms: Date.now() - started, provider: provider.name }),
      );
    }
  };
}

async function readJson<T>(req: IncomingMessage, schema: ZodType<T>): Promise<T> {
  const contentType = req.headers['content-type'] ?? '';
  // Requiring JSON forces a CORS preflight for cross-origin callers, which this
  // API never approves, so other sites cannot spend the server's key.
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'bad_request', 'Content-Type must be application/json');
  }
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large', 'Request body is too large');

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large', 'Request body is too large');
    chunks.push(chunk as Buffer);
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'bad_request', 'Body is not valid JSON');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new HttpError(400, 'bad_request', `Invalid request: ${detail}`);
  }
  return parsed.data;
}

function toErrorResponse(error: unknown, logger: Logger): { httpStatus: number; body: ApiErrorBody; headers?: Record<string, string> } {
  if (error instanceof HttpError) {
    return { httpStatus: error.status, body: { error: { code: error.code, message: error.message } }, headers: error.headers };
  }
  if (error instanceof LlmError) {
    logger.error(`[llm] ${error.code}: ${error.message}`, error.cause instanceof Error ? error.cause.message : '');
    return { httpStatus: LLM_STATUS[error.code], body: { error: { code: error.code, message: error.message } } };
  }
  logger.error('[api] unexpected error', error);
  return { httpStatus: 500, body: { error: { code: 'internal', message: 'Unexpected server error' } } };
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
