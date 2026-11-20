import {
  ApiErrorBodySchema,
  ChatResponseSchema,
  ReviewResponseSchema,
  type ApiErrorCode,
  type ChatRequest,
  type ChatResponse,
  type ReviewRequest,
  type ReviewResponse,
} from '@synthie/contracts';
import type { ZodType } from 'zod';

/**
 * The browser's only route to model capabilities. No provider SDK, prompt, or
 * credential exists on this side of the boundary.
 */
export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'network',
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function postJson<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError('network', 'Could not reach the SynthIE server. Is the API running?');
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorBodySchema.safeParse(json);
    if (parsed.success) throw new ApiClientError(parsed.data.error.code, parsed.data.error.message, res.status);
    throw new ApiClientError('internal', `Server returned HTTP ${res.status}`, res.status);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiClientError('internal', 'Server response did not match the expected format');
  return parsed.data;
}

export const reviewDraft = (req: ReviewRequest): Promise<ReviewResponse> =>
  postJson('/api/reviews', req, ReviewResponseSchema);

export const sendChat = (req: ChatRequest): Promise<ChatResponse> => postJson('/api/chat', req, ChatResponseSchema);
