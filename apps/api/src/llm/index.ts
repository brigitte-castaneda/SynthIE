import type { AppConfig } from '../config';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import type { LlmProvider } from './types';

export * from './types';

/** Selects the adapter from configuration; switching providers needs no code change. */
export function createProvider(llm: AppConfig['llm']): LlmProvider {
  switch (llm.provider) {
    case 'gemini':
      return new GeminiProvider(llm.geminiApiKey!, llm.model);
    case 'ollama':
      return new OllamaProvider(llm.ollamaBaseUrl, llm.model, llm.ollamaNumCtx);
  }
}
