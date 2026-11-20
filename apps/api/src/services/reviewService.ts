import { ResearchAnalysisSchema, type ReviewRequest, type ReviewResponse } from '@synthie/contracts';
import { LlmError, type LlmMessage, type LlmProvider } from '../llm';
import { ANALYSIS_JSON_SCHEMA } from '../prompts/analysisJsonSchema';
import { REVIEW_PROMPT_VERSION, REVIEW_SYSTEM_INSTRUCTION, REVIEW_TEMPERATURE, reviewUserPrompt } from '../prompts/review';

/** Number of extra attempts after an output fails validation. */
const MAX_REPAIR_ATTEMPTS = 1;

export async function runReview(provider: LlmProvider, req: ReviewRequest, signal: AbortSignal): Promise<ReviewResponse> {
  const messages: LlmMessage[] = [
    {
      role: 'user',
      parts: [
        { type: 'file', mimeType: req.document.mimeType, data: req.document.data, name: req.document.name },
        { type: 'text', text: reviewUserPrompt(req.context) },
      ],
    },
  ];

  let lastProblem = '';
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const attemptMessages: LlmMessage[] =
      attempt === 0
        ? messages
        : [
            ...messages,
            {
              role: 'user',
              parts: [
                {
                  type: 'text',
                  text: `Your previous answer was rejected: ${lastProblem}\nReturn only a single JSON object that satisfies the required schema.`,
                },
              ],
            },
          ];

    const raw = await provider.generateJson({
      system: REVIEW_SYSTEM_INSTRUCTION,
      messages: attemptMessages,
      jsonSchema: ANALYSIS_JSON_SCHEMA,
      temperature: REVIEW_TEMPERATURE,
      signal,
    });

    const parsed = parseJsonObject(raw);
    if (!parsed.ok) {
      lastProblem = parsed.problem;
      continue;
    }
    const validated = ResearchAnalysisSchema.safeParse(parsed.value);
    if (validated.success) {
      return {
        analysis: validated.data,
        meta: { provider: provider.name, model: provider.model, promptVersion: REVIEW_PROMPT_VERSION },
      };
    }
    lastProblem = validated.error.issues
      .slice(0, 10)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
  }

  throw new LlmError('provider_invalid_output', `Model output failed validation: ${lastProblem}`);
}

/** Parses JSON, tolerating prose or code fences around a single object. */
function parseJsonObject(raw: string): { ok: true; value: unknown } | { ok: false; problem: string } {
  const candidates = [raw.trim()];
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) candidates.push(raw.slice(start, end + 1));
  for (const c of candidates) {
    try {
      return { ok: true, value: JSON.parse(c) };
    } catch {
      // try next candidate
    }
  }
  return { ok: false, problem: 'the response was not valid JSON' };
}
