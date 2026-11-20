import { extractText, getDocumentProxy } from 'unpdf';

const TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/x-tex']);

/**
 * Converts a file part to plain text for providers without native document
 * input. Returns null for types that cannot be converted (e.g. images).
 */
export async function fileToText(mimeType: string, base64: string, maxChars: number): Promise<string | null> {
  const bytes = Buffer.from(base64, 'base64');
  let text: string;
  if (TEXT_TYPES.has(mimeType)) {
    text = bytes.toString('utf8');
  } else if (mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } else {
    return null;
  }
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[... document truncated at ${maxChars} characters ...]`;
}
