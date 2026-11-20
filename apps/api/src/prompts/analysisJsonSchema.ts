/**
 * Provider-neutral JSON Schema for the review output, ported from the
 * original Gemini-specific `Schema` object. Sent to providers that support
 * constrained decoding; the zod schema in @synthie/contracts remains the
 * authoritative runtime check.
 */
const score = (description: string) => ({ type: 'number', minimum: 0, maximum: 100, description });
const stringArray = { type: 'array', items: { type: 'string' } };

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Title of the uploaded draft' },
    topicInference: { type: 'string', description: 'What is this paper actually about?' },
    overallScore: score('0-100 Overall quality score'),
    clusterScores: {
      type: 'object',
      properties: {
        'Cluster A': score('0-100 Score for Math/Econ rigor'),
        'Cluster B': score('0-100 Score for Physical realism'),
        'Cluster C': score('0-100 Score for Operational logic'),
        'Cluster D': score('0-100 Score for Human/Social factors'),
      },
      required: ['Cluster A', 'Cluster B', 'Cluster C', 'Cluster D'],
    },
    writingStyle: {
      type: 'object',
      properties: {
        tone: { type: 'string', description: "e.g., 'Academic', 'Casual', 'Too Technical'" },
        clarityScore: score('0-100'),
        grammarScore: score('0-100'),
        voiceCritique: { type: 'string', description: "Comment on the author's voice and flow" },
      },
      required: ['tone', 'clarityScore', 'grammarScore', 'voiceCritique'],
    },
    holisticFeedback: { type: 'string', description: "High-level summary of the paper's potential and main flaw" },
    sectionAnalysis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'e.g., Abstract, Methodology, Conclusion' },
          score: score('0-100 for this specific section'),
          summary: { type: 'string' },
          strengths: stringArray,
          weaknesses: stringArray,
          improvementAdvice: { type: 'string', description: 'Specific, actionable advice to improve this section' },
        },
        required: ['title', 'score', 'summary', 'strengths', 'weaknesses', 'improvementAdvice'],
      },
    },
    keyMissedReferences: {
      ...stringArray,
      description: 'Specific theories, algorithms, or standards the author failed to mention but should have.',
    },
  },
  required: [
    'title',
    'topicInference',
    'overallScore',
    'clusterScores',
    'writingStyle',
    'holisticFeedback',
    'sectionAnalysis',
    'keyMissedReferences',
  ],
} as const satisfies Record<string, unknown>;
