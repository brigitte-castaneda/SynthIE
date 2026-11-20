import { z } from 'zod';

export enum ClusterId {
  A = 'Cluster A',
  B = 'Cluster B',
  C = 'Cluster C',
  D = 'Cluster D',
}

export interface ClusterDef {
  id: ClusterId;
  name: string;
  role: string;
  description: string;
  domains: string[];
  color: string;
}

const score = z.number().min(0).max(100);

export const SectionAnalysisSchema = z.object({
  title: z.string().min(1),
  score,
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvementAdvice: z.string(),
});

export const WritingStyleAnalysisSchema = z.object({
  tone: z.string(),
  clarityScore: score,
  grammarScore: score,
  voiceCritique: z.string(),
});

export const ResearchAnalysisSchema = z.object({
  title: z.string().min(1),
  topicInference: z.string(),
  overallScore: score,
  clusterScores: z.object({
    [ClusterId.A]: score,
    [ClusterId.B]: score,
    [ClusterId.C]: score,
    [ClusterId.D]: score,
  }),
  writingStyle: WritingStyleAnalysisSchema,
  holisticFeedback: z.string(),
  sectionAnalysis: z.array(SectionAnalysisSchema).min(1),
  keyMissedReferences: z.array(z.string()),
});

export type SectionAnalysis = z.infer<typeof SectionAnalysisSchema>;
export type WritingStyleAnalysis = z.infer<typeof WritingStyleAnalysisSchema>;
export type ResearchAnalysis = z.infer<typeof ResearchAnalysisSchema>;
