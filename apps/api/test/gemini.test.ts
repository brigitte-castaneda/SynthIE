import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '@google/genai';
import { mapGeminiError } from '../src/llm/gemini.ts';

const signal = new AbortController().signal;
const apiError = (status: number, message: string) => new ApiError({ status, message });

test('invalid key (HTTP 400 API_KEY_INVALID) maps to a credentials error, not invalid output', () => {
  const err = mapGeminiError(apiError(400, '{"error":{"message":"API key not valid.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}'), signal);
  assert.equal(err.code, 'provider_unavailable');
  assert.match(err.message, /credentials/);
});

test('429 maps to provider_rate_limited', () => {
  assert.equal(mapGeminiError(apiError(429, 'quota'), signal).code, 'provider_rate_limited');
});

test('403 maps to a credentials error', () => {
  assert.match(mapGeminiError(apiError(403, 'denied'), signal).message, /credentials/);
});

test('timeout abort maps to provider_timeout', () => {
  const ctrl = new AbortController();
  ctrl.abort(new DOMException('timed out', 'TimeoutError'));
  assert.equal(mapGeminiError(new Error('aborted'), ctrl.signal).code, 'provider_timeout');
});
