import { fileToText } from './documentText';
import { LlmError, toLlmError, type ChatRequest, type GenerateJsonRequest, type LlmMessage, type LlmProvider } from './types';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

/**
 * Ollama adapter (local models). Ollama has no native PDF input, so documents
 * are converted to text server-side; images are passed through for
 * multimodal models.
 */
export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    readonly model: string,
    private readonly numCtx: number,
  ) {}

  /** Rough budget: ~4 chars per token, leaving room for prompts and output. */
  private get maxDocumentChars(): number {
    return Math.max(4_000, Math.floor(this.numCtx * 4 * 0.6));
  }

  generateJson(req: GenerateJsonRequest): Promise<string> {
    return this.post(req.signal, req.system, req.messages, { format: req.jsonSchema, temperature: req.temperature });
  }

  chat(req: ChatRequest): Promise<string> {
    return this.post(req.signal, req.system, req.messages, { temperature: req.temperature });
  }

  private async post(
    signal: AbortSignal,
    system: string,
    messages: LlmMessage[],
    opts: { format?: Record<string, unknown>; temperature?: number },
  ): Promise<string> {
    const body = {
      model: this.model,
      stream: false,
      messages: [{ role: 'system', content: system }, ...(await this.toOllamaMessages(messages))],
      ...(opts.format ? { format: opts.format } : {}),
      options: {
        num_ctx: this.numCtx,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      throw toLlmError(error, signal, 'Ollama');
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (res.status === 404) {
        throw new LlmError('provider_unavailable', `Ollama model "${this.model}" not found (run: ollama pull ${this.model})`);
      }
      throw new LlmError('provider_unavailable', `Ollama returned HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const text = data.message?.content ?? '';
    if (!text) throw new LlmError('provider_invalid_output', 'Ollama returned an empty response');
    return text;
  }

  private async toOllamaMessages(messages: LlmMessage[]): Promise<OllamaMessage[]> {
    const out: OllamaMessage[] = [];
    for (const m of messages) {
      const textChunks: string[] = [];
      const images: string[] = [];
      for (const part of m.parts) {
        if (part.type === 'text') {
          textChunks.push(part.text);
        } else if (part.mimeType.startsWith('image/')) {
          images.push(part.data);
        } else {
          const text = await fileToText(part.mimeType, part.data, this.maxDocumentChars);
          const label = part.name ? `Attached file "${part.name}"` : 'Attached document';
          textChunks.push(
            text === null
              ? `[${label} (${part.mimeType}) could not be converted to text]`
              : `--- ${label} ---\n${text}\n--- end of file ---`,
          );
        }
      }
      out.push({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: textChunks.join('\n\n'),
        ...(images.length ? { images } : {}),
      });
    }
    return out;
  }
}
