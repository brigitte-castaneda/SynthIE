import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ResearchAnalysis } from '@synthie/contracts';
import type { AppConfig } from '../src/config.ts';
import { createApp } from '../src/http/app.ts';
import { createProvider } from '../src/llm/index.ts';

export const sampleAnalysis: ResearchAnalysis = {
  title: 'Test Paper',
  topicInference: 'Lean',
  overallScore: 70,
  clusterScores: { 'Cluster A': 60, 'Cluster B': 70, 'Cluster C': 80, 'Cluster D': 50 },
  writingStyle: { tone: 'Academic', clarityScore: 70, grammarScore: 80, voiceCritique: 'ok' },
  holisticFeedback: 'fine',
  sectionAnalysis: [
    { title: 'Intro', score: 70, summary: 's', strengths: ['a'], weaknesses: ['b'], improvementAdvice: 'c' },
  ],
  keyMissedReferences: ["Little's Law"],
};

export type FakeStep = 'invalid' | 'valid' | 'chat' | 'slow';

/** Fake Ollama /api/chat that replies according to a queued script and records requests. */
export async function startFakeOllama() {
  const state = { script: [] as FakeStep[], seen: [] as any[] };
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    state.seen.push(JSON.parse(body));
    const step = state.script.shift() ?? 'valid';
    if (step === 'slow') await new Promise((r) => setTimeout(r, 1500));
    const content =
      step === 'invalid'
        ? '{"title": "oops"}'
        : step === 'chat'
          ? 'Here is advice.'
          : 'Sure:\n```json\n' + JSON.stringify(sampleAnalysis) + '\n```';
    if (!res.destroyed) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: { content } }));
    }
  });
  const url = await listen(server);
  return { state, url, close: () => close(server) };
}

export function testConfig(overrides: { ollamaBaseUrl: string; rateLimitMax?: number; timeoutMs?: number }): AppConfig {
  return {
    port: 0,
    llm: {
      provider: 'ollama',
      model: 'fake-model',
      timeoutMs: overrides.timeoutMs ?? 1000,
      geminiApiKey: undefined,
      ollamaBaseUrl: overrides.ollamaBaseUrl,
      ollamaNumCtx: 8192,
    },
    rateLimit: { max: overrides.rateLimitMax ?? 1000, windowMs: 60_000 },
  };
}

export async function startApi(config: AppConfig) {
  const silent = { info() {}, error() {} };
  const server = createServer(createApp(config, createProvider(config.llm), silent));
  const base = await listen(server);
  const request = async (path: string, body: unknown, contentType = 'application/json') => {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: res.status, headers: res.headers, body: (await res.json()) as any };
  };
  return { request, close: () => close(server) };
}

export const b64 = (s: string | Uint8Array) => Buffer.from(s).toString('base64');

/** Builds a minimal one-page PDF whose text layer contains `text`. */
export function buildPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)),
  );
}

function close(server: Server): Promise<void> {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}
