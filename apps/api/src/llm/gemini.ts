import { ApiError, GoogleGenAI, type Content, type GenerateContentResponse, type Part } from '@google/genai';
import { LlmError, toLlmError, type ChatRequest, type GenerateJsonRequest, type LlmMessage, type LlmProvider } from './types';

/** Gemini adapter. The only module that imports @google/genai. */
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, readonly model: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateJson(req: GenerateJsonRequest): Promise<string> {
    return this.call(req.signal, () =>
      this.client.models.generateContent({
        model: this.model,
        contents: toContents(req.messages),
        config: {
          systemInstruction: req.system,
          responseMimeType: 'application/json',
          responseJsonSchema: req.jsonSchema,
          temperature: req.temperature,
          abortSignal: req.signal,
        },
      }),
    );
  }

  async chat(req: ChatRequest): Promise<string> {
    return this.call(req.signal, () =>
      this.client.models.generateContent({
        model: this.model,
        contents: toContents(req.messages),
        config: {
          systemInstruction: req.system,
          temperature: req.temperature,
          abortSignal: req.signal,
        },
      }),
    );
  }

  private async call(signal: AbortSignal, run: () => Promise<GenerateContentResponse>): Promise<string> {
    let response: GenerateContentResponse;
    try {
      response = await run();
    } catch (error) {
      throw mapGeminiError(error, signal);
    }

    if (response.promptFeedback?.blockReason) {
      throw new LlmError('provider_blocked', `Gemini blocked the prompt (${response.promptFeedback.blockReason})`);
    }
    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
      throw new LlmError('provider_blocked', `Gemini stopped generation (${candidate.finishReason})`);
    }
    // Read text parts directly (skipping thought parts) instead of response.text.
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text)
      .join('');
    if (!text) throw new LlmError('provider_invalid_output', 'Gemini returned an empty response');
    return text;
  }
}

function toContents(messages: LlmMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role,
    parts: m.parts.map(
      (p): Part => (p.type === 'text' ? { text: p.text } : { inlineData: { mimeType: p.mimeType, data: p.data } }),
    ),
  }));
}

export function mapGeminiError(error: unknown, signal: AbortSignal): LlmError {
  if (error instanceof ApiError) {
    if (error.status === 429) return new LlmError('provider_rate_limited', 'Gemini rate limit or quota exceeded', { cause: error });
    // Gemini reports a bad key as 400 API_KEY_INVALID rather than 401/403.
    if (error.status === 401 || error.status === 403 || /API_KEY_INVALID|API key not valid/i.test(error.message)) {
      return new LlmError('provider_unavailable', 'The server is misconfigured: Gemini rejected its credentials', { cause: error });
    }
    if (error.status === 400) {
      return new LlmError('provider_unavailable', 'Gemini rejected the request (HTTP 400)', { cause: error });
    }
  }
  return toLlmError(error, signal, 'Gemini');
}
