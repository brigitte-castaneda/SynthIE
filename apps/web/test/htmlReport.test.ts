import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ResearchAnalysis } from '@synthie/contracts';
import { escapeHtml, html } from '../src/report/html.ts';
import { generateHTMLReport } from '../src/report/htmlReport.ts';

const PAYLOAD = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

const analysis = (text: string): ResearchAnalysis => ({
  title: text,
  topicInference: text,
  overallScore: 70,
  clusterScores: { 'Cluster A': 60, 'Cluster B': 70, 'Cluster C': 80, 'Cluster D': 50 },
  writingStyle: { tone: text, clarityScore: 70, grammarScore: 80, voiceCritique: text },
  holisticFeedback: text,
  sectionAnalysis: [
    { title: text, score: 70, summary: text, strengths: [text], weaknesses: [text], improvementAdvice: text },
  ],
  keyMissedReferences: [text],
});

test('escapeHtml escapes markup-significant characters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&\``), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&#96;');
});

test('html tag escapes values but keeps nested html fragments', () => {
  const items = ['<b>', 'ok'].map((s) => html`<li>${s}</li>`);
  assert.equal(html`<ul>${items}</ul>`.toString(), '<ul><li>&lt;b&gt;</li><li>ok</li></ul>');
  assert.equal(html`${null}${undefined}${false}${0}`.toString(), '0');
});

test('report escapes every model-controlled field', () => {
  const report = generateHTMLReport(analysis(PAYLOAD));
  assert.ok(!report.includes('<script>'), 'raw <script> leaked into report');
  assert.ok(!report.includes('<img'), 'raw <img> leaked into report');
  // title, topic, feedback, tone, critique, section title/summary/strength/weakness/advice, reference
  const escaped = escapeHtml(PAYLOAD);
  const occurrences = report.split(escaped).length - 1;
  assert.equal(occurrences, 12);
});

test('report forbids scripts via CSP and renders scores', () => {
  const report = generateHTMLReport(analysis('Plain title'));
  assert.match(report, /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"/);
  assert.match(report, /70\/100/);
  assert.match(report, /width: 80%/);
});
