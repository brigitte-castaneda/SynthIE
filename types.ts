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

export interface SectionAnalysis {
  title: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string;
}

export interface WritingStyleAnalysis {
  tone: string;
  clarityScore: number;
  grammarScore: number;
  voiceCritique: string;
}

export interface ResearchAnalysis {
  title: string;
  topicInference: string;
  overallScore: number;
  clusterScores: Record<string, number>; // Scores for A, B, C, D
  writingStyle: WritingStyleAnalysis;
  holisticFeedback: string;
  sectionAnalysis: SectionAnalysis[];
  keyMissedReferences: string[]; // Topics or specific theories missed
}