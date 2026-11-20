import type { ChatRequest, ChatResponse, ChatTurn } from '@synthie/contracts';
import type { LlmMessage, LlmPart, LlmProvider } from '../llm';
import {
  CHAT_CONTEXT_ACK,
  CHAT_CONTEXT_INTRO,
  CHAT_PROMPT_VERSION,
  CHAT_SYSTEM_INSTRUCTION,
  chatAnalysisContext,
} from '../prompts/chat';

/**
 * Assembles the model context on the server: system prompt, the paper plus
 * its analysis, prior turns, and the new message. The browser never builds
 * provider-specific history.
 */
export async function runChat(provider: LlmProvider, req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
  const context: LlmMessage[] = [
    {
      role: 'user',
      parts: [
        { type: 'text', text: CHAT_CONTEXT_INTRO },
        { type: 'file', mimeType: req.document.mimeType, data: req.document.data, name: req.document.name },
        { type: 'text', text: chatAnalysisContext(JSON.stringify(req.analysis)) },
      ],
    },
    { role: 'model', parts: [{ type: 'text', text: CHAT_CONTEXT_ACK }] },
  ];

  const turns = [...req.history, req.message].map(toLlmMessage);
  const reply = await provider.chat({
    system: CHAT_SYSTEM_INSTRUCTION,
    messages: mergeConsecutiveRoles([...context, ...turns]),
    signal,
  });

  return { reply, meta: { provider: provider.name, model: provider.model, promptVersion: CHAT_PROMPT_VERSION } };
}

function toLlmMessage(turn: ChatTurn): LlmMessage {
  const parts: LlmPart[] = [];
  if (turn.text) parts.push({ type: 'text', text: turn.text });
  for (const a of turn.attachments ?? []) parts.push({ type: 'file', mimeType: a.mimeType, data: a.data, name: a.name });
  return { role: turn.role, parts };
}

/**
 * A failed request can leave two user turns in a row in client history;
 * providers expect alternating roles, so adjacent same-role turns are merged.
 */
function mergeConsecutiveRoles(messages: LlmMessage[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (const m of messages) {
    if (m.parts.length === 0) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.parts = [...prev.parts, ...m.parts];
    else out.push({ role: m.role, parts: [...m.parts] });
  }
  return out;
}
