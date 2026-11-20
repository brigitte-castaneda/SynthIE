import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { b64, buildPdf, sampleAnalysis, startApi, startFakeOllama, testConfig, type FakeStep } from './helpers.ts';

const txtDoc = { name: 'paper.txt', mimeType: 'text/plain', data: b64('Our paper studies queueing in hospitals.') };

describe('API against a fake Ollama provider', () => {
  let fake: Awaited<ReturnType<typeof startFakeOllama>>;
  let api: Awaited<ReturnType<typeof startApi>>;

  before(async () => {
    fake = await startFakeOllama();
    api = await startApi(testConfig({ ollamaBaseUrl: fake.url }));
  });
  after(async () => {
    await api.close();
    await fake.close();
  });

  const queue = (...steps: FakeStep[]) => {
    fake.state.script = [...steps];
    fake.state.seen = [];
  };

  describe('POST /api/reviews', () => {
    test('returns a validated analysis after one repair attempt', async () => {
      queue('invalid', 'valid');
      const r = await api.request('/api/reviews', { document: txtDoc, context: 'Q1 journal' });
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.analysis, sampleAnalysis);
      assert.deepEqual(r.body.meta, { provider: 'ollama', model: 'fake-model', promptVersion: 'review.v1' });
      assert.equal(fake.state.seen.length, 2);
      assert.match(fake.state.seen[1].messages.at(-1).content, /rejected/);
    });

    test('sends system prompt, document text, JSON schema and options to Ollama', async () => {
      queue('valid');
      await api.request('/api/reviews', { document: txtDoc });
      const [req] = fake.state.seen;
      assert.equal(req.messages[0].role, 'system');
      assert.match(req.messages[0].content, /Grand Council/);
      assert.match(req.messages[1].content, /queueing in hospitals/);
      assert.ok(req.format.required.includes('clusterScores'));
      assert.equal(req.options.num_ctx, 8192);
      assert.equal(req.options.temperature, 0.2);
    });

    test('extracts PDF text server-side for providers without PDF input', async () => {
      queue('valid');
      const pdf = buildPdf('Lean Six Sigma reduces cycle time in assembly lines.');
      const r = await api.request('/api/reviews', {
        document: { name: 'p.pdf', mimeType: 'application/pdf', data: b64(pdf) },
      });
      assert.equal(r.status, 200);
      assert.match(fake.state.seen[0].messages[1].content, /Lean Six Sigma reduces cycle time/);
    });

    test('returns 502 provider_invalid_output when output never validates', async () => {
      queue('invalid', 'invalid');
      const r = await api.request('/api/reviews', { document: txtDoc });
      assert.equal(r.status, 502);
      assert.equal(r.body.error.code, 'provider_invalid_output');
    });
  });

  describe('POST /api/chat', () => {
    test('assembles context server-side, merges consecutive user turns, passes images', async () => {
      queue('chat');
      const r = await api.request('/api/chat', {
        analysis: sampleAnalysis,
        document: txtDoc,
        history: [{ role: 'user', text: 'first question (no reply came back)' }],
        message: {
          role: 'user',
          text: 'second question',
          attachments: [{ name: 'fig.png', mimeType: 'image/png', data: b64('PNGDATA') }],
        },
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.reply, 'Here is advice.');
      assert.equal(r.body.meta.promptVersion, 'chat.v1');

      const msgs = fake.state.seen[0].messages;
      assert.deepEqual(msgs.map((m: any) => m.role), ['system', 'user', 'assistant', 'user']);
      assert.match(msgs[1].content, /queueing in hospitals/);
      assert.match(msgs[1].content, /Test Paper/);
      assert.match(msgs[3].content, /first question[\s\S]*second question/);
      assert.deepEqual(msgs[3].images, [b64('PNGDATA')]);
    });

    test('rejects an analysis with out-of-range scores', async () => {
      const r = await api.request('/api/chat', {
        analysis: { ...sampleAnalysis, overallScore: 900 },
        document: txtDoc,
        history: [],
        message: { role: 'user', text: 'hi' },
      });
      assert.equal(r.status, 400);
    });
  });

  describe('request validation', () => {
    test('rejects unsupported MIME types', async () => {
      const r = await api.request('/api/reviews', { document: { mimeType: 'application/zip', data: b64('x') } });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, 'bad_request');
    });

    test('rejects non-JSON bodies (blocks cross-site form posts)', async () => {
      const r = await api.request('/api/reviews', 'document=x', 'application/x-www-form-urlencoded');
      assert.equal(r.status, 415);
    });

    test('rejects files over 10 MB', async () => {
      const r = await api.request('/api/reviews', { document: { ...txtDoc, data: 'A'.repeat(14_100_000) } });
      assert.equal(r.status, 400);
      assert.match(r.body.error.message, /10 MB/);
    });

    test('rejects bodies over 20 MB', async () => {
      const r = await api.request('/api/reviews', { document: { ...txtDoc, data: 'A'.repeat(21_000_000) } });
      assert.equal(r.status, 413);
    });

    test('returns 404 for unknown routes', async () => {
      const r = await api.request('/api/nope', {});
      assert.equal(r.status, 404);
    });
  });

  test('returns 504 provider_timeout when the provider misses the deadline', async () => {
    queue('slow');
    const r = await api.request('/api/reviews', { document: txtDoc });
    assert.equal(r.status, 504);
    assert.equal(r.body.error.code, 'provider_timeout');
  });
});

test('rate limit returns 429 with Retry-After once the window is used up', async () => {
  const fake = await startFakeOllama();
  const api = await startApi(testConfig({ ollamaBaseUrl: fake.url, rateLimitMax: 2 }));
  try {
    const statuses: number[] = [];
    let retryAfter: string | null = null;
    for (let i = 0; i < 3; i++) {
      const r = await api.request('/api/reviews', { document: txtDoc });
      statuses.push(r.status);
      retryAfter = r.headers.get('retry-after');
    }
    assert.deepEqual(statuses, [200, 200, 429]);
    assert.ok(Number(retryAfter) > 0);
  } finally {
    await api.close();
    await fake.close();
  }
});

test('returns 502 provider_unavailable when the provider is unreachable', async () => {
  const api = await startApi(testConfig({ ollamaBaseUrl: 'http://127.0.0.1:1' }));
  try {
    const r = await api.request('/api/reviews', { document: txtDoc });
    assert.equal(r.status, 502);
    assert.equal(r.body.error.code, 'provider_unavailable');
  } finally {
    await api.close();
  }
});
