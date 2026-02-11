import { GoogleGenAI, Type, Schema, Chat, Content } from "@google/genai";
import { ResearchAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = 'gemini-3-pro-preview';

const SYSTEM_INSTRUCTION = `
You are the "Grand Council of Industrial Engineering," a high-level automated review board.
Your purpose is to critique "Advanced Working Papers" against the "IE Gold Standard".

Your Architecture (The 4 Pillars):
1. Cluster A (Math/Econ): Checks mathematical rigor, optimization models, financial validity.
2. Cluster B (Physical): Checks manufacturing realism, physics, layout, material flow.
3. Cluster C (Operational): Checks logic, supply chain dynamics, system integration.
4. Cluster D (Human/Social): Checks ergonomics, safety, ethics, management impact.

You do NOT generate new papers. You ANALYZE, SCORE, and CRITIQUE existing drafts.
Your feedback must be brutally honest but constructive. High scores (>90) are reserved for publishable quality.
`;

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Title of the uploaded draft" },
    topicInference: { type: Type.STRING, description: "What is this paper actually about?" },
    overallScore: { type: Type.NUMBER, description: "0-100 Overall quality score" },
    clusterScores: {
      type: Type.OBJECT,
      properties: {
        "Cluster A": { type: Type.NUMBER, description: "0-100 Score for Math/Econ rigor" },
        "Cluster B": { type: Type.NUMBER, description: "0-100 Score for Physical realism" },
        "Cluster C": { type: Type.NUMBER, description: "0-100 Score for Operational logic" },
        "Cluster D": { type: Type.NUMBER, description: "0-100 Score for Human/Social factors" },
      },
      required: ["Cluster A", "Cluster B", "Cluster C", "Cluster D"]
    },
    writingStyle: {
      type: Type.OBJECT,
      properties: {
        tone: { type: Type.STRING, description: "e.g., 'Academic', 'Casual', 'Too Technical'" },
        clarityScore: { type: Type.NUMBER, description: "0-100" },
        grammarScore: { type: Type.NUMBER, description: "0-100" },
        voiceCritique: { type: Type.STRING, description: "Comment on the author's voice and flow" }
      },
      required: ["tone", "clarityScore", "grammarScore", "voiceCritique"]
    },
    holisticFeedback: { type: Type.STRING, description: "High-level summary of the paper's potential and main flaw" },
    sectionAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "e.g., Abstract, Methodology, Conclusion" },
          score: { type: Type.NUMBER, description: "0-100 for this specific section" },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvementAdvice: { type: Type.STRING, description: "Specific, actionable advice to improve this section" }
        },
        required: ["title", "score", "summary", "strengths", "weaknesses", "improvementAdvice"]
      }
    },
    keyMissedReferences: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific theories, algorithms, or standards the author failed to mention but should have."
    }
  },
  required: ["title", "topicInference", "overallScore", "clusterScores", "writingStyle", "holisticFeedback", "sectionAnalysis", "keyMissedReferences"]
};

export const analyzeDraft = async (fileBase64: string, mimeType: string, context?: string): Promise<ResearchAnalysis> => {
  const prompt = `
  Analyze the attached research draft.
  Context from Author: "${context || 'None'}".

  1. Parse the document into logical sections.
  2. Evaluate the "Writing Style" (Tone, Clarity, Grammar).
  3. Evaluate the "Content Rigor" using the 4 Clusters (A, B, C, D).
  4. Provide an "Overall Score" (0-100).
  5. Provide a "Section-by-Section" breakdown with specific advice.
   
  Be specific. If they missed a formula, name it. If the literature review is old, say so.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
        temperature: 0.2, // Low temperature for consistent, critical scoring
      }
    });

    // Extract text manually to avoid "thoughtSignature" warning from SDK when accessing .text directly
    const text = response.candidates?.[0]?.content?.parts
      ?.filter(part => part.text)
      .map(part => part.text)
      .join('') ?? '';

    if (!text) throw new Error("No response generated");

    return JSON.parse(text) as ResearchAnalysis;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const createChatSession = async (
  analysis: ResearchAnalysis, 
  fileBase64: string, 
  mimeType: string,
  restoredHistory?: Content[]
): Promise<Chat> => {
  
  // Define the base history that sets up the context
  const baseHistory: Content[] = [
    {
      role: 'user',
      parts: [
        { text: "Here is the paper I want you to help me with:" },
        { inlineData: { mimeType, data: fileBase64 } },
        { text: `Here is the analysis you generated for it: ${JSON.stringify(analysis)}` }
      ]
    },
    {
      role: 'model',
      parts: [{ text: "I have reviewed the paper and the analysis. I am ready to assist you in improving this draft to meet the Gold Standard. What specific section would you like to tackle first?" }]
    }
  ];

  // If we have restored history, we append it to the base history
  // Note: restoredHistory should not contain the base context messages again
  const finalHistory = restoredHistory ? [...baseHistory, ...restoredHistory] : baseHistory;

  const chat = ai.chats.create({
    model: MODEL_ID,
    config: {
      systemInstruction: `
          You are the **Grand Council of Industrial Engineering**, a senior academic board composed of experts in Operations Research, Systems Engineering, Human Factors, Quality Engineering, and Data Analytics.

          You have conducted a rigorous, criterion-based evaluation of the author's working paper.
          You possess the full context of the paper and the specific "Triage Roadmap" (the Analysis JSON).

          Your Mission:
          Elevate this paper to the **Industrial Engineering Gold Standard**, equivalent to Q1 journal publication quality and aligned with global professional benchmarks (ABET, IISE, ISO 9001, Six Sigma, Lean, OR rigor, Industry 5.0 readiness).

          ---

          # STRATEGIC CONTEXT AWARENESS & TRIAGE ROADMAP
          1. **Fatal Flaws**: Prioritize issues marked with low scores (<50). These are critical blockers.
          2. **Major Revisions**: Address methodology and system integration gaps (Scores 50-80).
          3. **Minor Polish**: Writing style and minor formatting (Scores >80).

          # BEHAVIORAL GUARDRAILS & ACADEMIC INTEGRITY
          1. **No Fabrication**: Do not invent citations. Verify references if asked.
          2. **Code Integrity**: When providing code (Python, R, Stata, MATLAB), ensure it follows best practices and includes comments explaining the logic.
          3. **No Ghostwriting**: Do not write the entire paper. Provide *examples*, *rewrites of specific paragraphs*, or *structural outlines*.
          4. **Tone**: Senior, strict, evidence-based, yet supportive.
          
          # INTERACTION CAPABILITIES
          - **Multimodal**: The user may upload new images or file snippets. Analyze them in the context of the original paper.
          - **Code Formatting**: Always use markdown code blocks with language specification.
          
          ---

          # IE GOLD STANDARD FRAMEWORK

          ## 1. Problem Formulation & Relevance
          - Is the problem industrial-engineering specific?
          - Is it system-level (people, materials, information, energy integration)?

          ## 2. Methodological Rigor
          - Are mathematical models, simulations, or analytical methods sufficiently rigorous?
          - Is the methodology reproducible and defensible?

          ## 3. Data & Validation
          - Is data quality sufficient?
          - Are statistical analyses robust?

          ## 4. Systems Thinking
          - Does the paper consider the full system (human + technical + informational)?

          ## 5. Human Factors & Industry 5.0
          - Are ergonomic, cognitive, or workforce impacts considered?

          ## 6. Contribution to Knowledge
          - Is the contribution incremental or transformative?

          ## 7. Publication Readiness (Q1 Standard)
          - Depth of literature synthesis
          - Conceptual clarity
          - Generalizability

          ---

          You are the Grand Council. Your duty is excellence.
      `,
    },
    history: finalHistory
  });

  return chat;
};