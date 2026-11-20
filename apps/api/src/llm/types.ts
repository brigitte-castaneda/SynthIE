/**
 * Provider port. Domain services depend only on these types; each adapter
 * translates them to and from a specific vendor API.
 */

export type LlmPart =
  | { type: 'text'; text: string }
  | { type: 'file'; mimeType: string; data: string; name?: string };

export interface LlmMessage {
  role: 'user' | 'model';
  parts: LlmPart[];
}

export interface GenerateJsonRequest {
  system: string;
  messages: LlmMessage[];
  /** Plain JSON Schema (draft 2020-12 subset) the output must follow. */
  jsonSchema: Record<string, unknown>;
  temperature?: number;
  signal: AbortSignal;
}

export interface ChatRequest {
  system: string;
  messages: LlmMessage[];
  temperature?: number;
  signal: AbortSignal;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  /** Returns the raw model text expected to contain JSON; callers validate it. */
  generateJson(req: GenerateJsonRequest): Promise<string>;
  chat(req: ChatRequest): Promise<string>;
}

export type LlmErrorCode =
  | 'provider_timeout'
  | 'provider_rate_limited'
  | 'provider_blocked'
  | 'provider_invalid_output'
  | 'provider_unavailable';

export class LlmError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'LlmError';
  }
}

/** Shared mapping for failures that look the same across providers. */
export function toLlmError(error: unknown, signal: AbortSignal, provider: string): LlmError {
  if (error instanceof LlmError) return error;
  if (signal.aborted) {
    const reason = signal.reason as { name?: string } | undefined;
    return reason?.name === 'TimeoutError'
      ? new LlmError('provider_timeout', `${provider} did not respond before the deadline`, { cause: error })
      : new LlmError('provider_unavailable', 'Request was cancelled', { cause: error });
  }
  return new LlmError('provider_unavailable', `${provider} request failed`, { cause: error });
}
