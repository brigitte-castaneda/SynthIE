import { z } from 'zod';
import { ResearchAnalysisSchema } from './analysis';

/**
 * Wire contracts between apps/web and apps/api. These types are
 * provider-neutral: no Gemini, Ollama, or other SDK shapes cross this line.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_FILE_BYTES / 3) * 4;

export const DOCUMENT_MIME_TYPES = ['application/pdf', 'text/plain'] as const;
export const ATTACHMENT_MIME_TYPES = [
  ...DOCUMENT_MIME_TYPES,
  'text/markdown',
  'text/x-tex',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

const base64 = z
  .string()
  .min(1)
  .max(MAX_BASE64_CHARS, 'File exceeds the 10 MB limit')
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Expected base64 data');

export const DocumentInputSchema = z.object({
  name: z.string().max(255).optional(),
  mimeType: z.enum(DOCUMENT_MIME_TYPES),
  data: base64,
});

export const AttachmentSchema = z.object({
  name: z.string().max(255),
  mimeType: z.enum(ATTACHMENT_MIME_TYPES),
  data: base64,
});

export const ChatTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().max(50_000),
  attachments: z.array(AttachmentSchema).max(5).optional(),
});

/** POST /api/reviews */
export const ReviewRequestSchema = z.object({
  document: DocumentInputSchema,
  context: z.string().max(5_000).optional(),
});

export const RunMetadataSchema = z.object({
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
});

export const ReviewResponseSchema = z.object({
  analysis: ResearchAnalysisSchema,
  meta: RunMetadataSchema,
});

/**
 * POST /api/chat
 * Stateless until conversations are persisted server-side (Phase 7): the
 * client sends prior turns and the server assembles the model context.
 */
export const ChatRequestSchema = z.object({
  analysis: ResearchAnalysisSchema,
  document: DocumentInputSchema,
  history: z.array(ChatTurnSchema).max(200),
  message: ChatTurnSchema.extend({ role: z.literal('user') }),
});

export const ChatResponseSchema = z.object({
  reply: z.string(),
  meta: RunMetadataSchema,
});

export const API_ERROR_CODES = [
  'bad_request',
  'payload_too_large',
  'not_found',
  'provider_timeout',
  'provider_rate_limited',
  'provider_blocked',
  'provider_invalid_output',
  'provider_unavailable',
  'internal',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
});

export type DocumentInput = z.infer<typeof DocumentInputSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type ChatTurn = z.infer<typeof ChatTurnSchema>;
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type RunMetadata = z.infer<typeof RunMetadataSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
