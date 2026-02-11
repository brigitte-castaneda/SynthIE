import { ResearchAnalysis } from "../types";

/**
 * OLLAMA-COMPATIBLE VERSION OF GEMINI SERVICE
 * 
 * This file provides an alternative implementation for running SynthIE
 * with Ollama (local LLM) instead of Google Gemini.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install Ollama: https://ollama.com/download
 * 2. Download a model: ollama pull llama3.2
 * 3. Replace services/geminiService.ts with this file
 * 4. Restart the application: npm run dev
 * 
 * SUPPORTED MODELS:
 * - llama3.2 (Recommended, 16GB RAM)
 * - gemma2 (Lightweight, 8GB RAM)
 * - deepseek-r1 (Good for complex analysis, 16GB RAM)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'llama3.2'; // Change to 'gemma2' or 'deepseek-r1' as needed

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calls the Ollama API with a prompt
 */
async function callOllama(
    prompt: string,
    systemPrompt: string = SYSTEM_INSTRUCTION,
    temperature: number = 0.2
): Promise<string> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: `${systemPrompt}\n\nUser: ${prompt}`,
                stream: false,
                options: {
                    temperature,
                    num_predict: 4096, // Maximum tokens to generate
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("Ollama API Error:", error);
        throw new Error(`Failed to connect to Ollama. Make sure Ollama is running (ollama serve)`);
    }
}

/**
 * Extracts text content from base64-encoded files
 * 
 * LIMITATIONS:
 * - PDF parsing is basic (only extracts visible text)
 * - For best results, convert PDFs to TXT before uploading
 * 
 * ADVANCED: Install pdf-parse for better PDF support
 * npm install pdf-parse
 */
function extractTextFromBase64(fileBase64: string, mimeType: string): string {
    try {
        if (mimeType === 'text/plain') {
            // Decode base64 for TXT files
            const decoded = atob(fileBase64);
            return decoded;
        }

        if (mimeType === 'application/pdf') {
            // Basic PDF handling - recommend using TXT instead
            console.warn("PDF parsing is limited. For best results, convert to TXT.");

            // Attempt basic text extraction
            try {
                const decoded = atob(fileBase64);
                // Very basic extraction - just get readable text
                const textMatch = decoded.match(/[\x20-\x7E\s]+/g);
                if (textMatch) {
                    return textMatch.join(' ').substring(0, 50000);
                }
            } catch (e) {
                console.error("PDF extraction failed:", e);
            }

            return "[PDF content detected - Please convert to TXT for better analysis. Use online tools like pdftotext.com]";
        }

        return "[Unsupported file type]";
    } catch (error) {
        console.error("Text extraction error:", error);
        return "[Error extracting text from file]";
    }
}

/**
 * Extracts JSON from LLM response
 * Some models add extra text before/after JSON
 */
function extractJSON(response: string): any {
    // Try to find JSON block
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("JSON parse error:", error);
        throw new Error("Failed to parse JSON response from model");
    }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyzes a research draft using Ollama
 * 
 * @param fileBase64 - Base64-encoded file content
 * @param mimeType - MIME type (text/plain or application/pdf)
 * @param context - Optional context from user
 * @returns Structured analysis following ResearchAnalysis type
 */
export const analyzeDraft = async (
    fileBase64: string,
    mimeType: string,
    context?: string
): Promise<ResearchAnalysis> => {

    console.log(`[Ollama] Starting analysis with model: ${MODEL_NAME}`);

    // Extract text from file
    const documentText = extractTextFromBase64(fileBase64, mimeType);

    if (documentText.includes("[PDF content detected")) {
        alert("⚠️ PDF parsing is limited with Ollama. For best results, convert your PDF to TXT first.");
    }

    // Truncate to avoid token limits (adjust based on your model)
    const truncatedText = documentText.substring(0, 15000);

    const prompt = `
Analyze the following research draft in detail.

AUTHOR'S CONTEXT: "${context || 'None provided'}"

DOCUMENT CONTENT:
${truncatedText}

${truncatedText.length < documentText.length ? '\n[Note: Document was truncated due to length]' : ''}

INSTRUCTIONS:
1. Parse the document into logical sections (Abstract, Introduction, Methodology, Results, etc.)
2. Evaluate writing style (tone, clarity, grammar)
3. Evaluate content rigor using the 4 Clusters:
   - Cluster A (Math/Econ): Mathematical rigor, optimization, financial validity
   - Cluster B (Physical): Manufacturing realism, physics, material flow
   - Cluster C (Operational): Supply chain, production planning, system integration
   - Cluster D (Human/Social): Ergonomics, safety, ethics, management

4. Provide scores (0-100) for:
   - Overall quality
   - Each cluster (A, B, C, D)
   - Each section
   - Writing style components

5. Identify missing references, theories, or standards

CRITICAL: Return ONLY valid JSON in this EXACT format (no additional text):

{
  "title": "Title of the paper",
  "topicInference": "Brief description of what this paper is about",
  "overallScore": 75,
  "clusterScores": {
    "Cluster A": 70,
    "Cluster B": 80,
    "Cluster C": 75,
    "Cluster D": 70
  },
  "writingStyle": {
    "tone": "Academic",
    "clarityScore": 75,
    "grammarScore": 80,
    "voiceCritique": "The writing is generally clear but could be more concise."
  },
  "holisticFeedback": "Overall assessment of the paper's strengths and main areas for improvement",
  "sectionAnalysis": [
    {
      "title": "Abstract",
      "score": 70,
      "summary": "Brief summary of this section",
      "strengths": ["Clear objective", "Well-structured"],
      "weaknesses": ["Too long", "Missing key metrics"],
      "improvementAdvice": "Reduce to 250 words and add quantitative results"
    }
  ],
  "keyMissedReferences": ["Six Sigma methodology", "ISO 9001 standards", "Lean manufacturing principles"]
}

Return ONLY the JSON object, nothing else.
`;

    try {
        console.log("[Ollama] Sending request to model...");
        const response = await callOllama(prompt, SYSTEM_INSTRUCTION, 0.2);

        console.log("[Ollama] Received response, parsing JSON...");
        const analysis = extractJSON(response) as ResearchAnalysis;

        // Validate required fields
        if (!analysis.title || !analysis.overallScore || !analysis.clusterScores) {
            throw new Error("Invalid analysis structure returned by model");
        }

        console.log("[Ollama] Analysis complete!");
        return analysis;

    } catch (error) {
        console.error("Ollama Analysis Error:", error);

        // Provide helpful error messages
        if (error instanceof Error) {
            if (error.message.includes("Failed to connect")) {
                throw new Error(
                    "Cannot connect to Ollama. Please ensure:\n" +
                    "1. Ollama is installed (ollama.com)\n" +
                    "2. Ollama is running (run 'ollama serve' in terminal)\n" +
                    "3. Model is downloaded (run 'ollama pull llama3.2')"
                );
            }
        }

        throw error;
    }
};

// ============================================================================
// CHAT SESSION MANAGEMENT
// ============================================================================

/**
 * Creates a chat session for interactive Q&A
 * 
 * @param analysis - The analysis results
 * @param fileBase64 - Original document (base64)
 * @param mimeType - Document MIME type
 * @param restoredHistory - Optional chat history to restore
 * @returns Chat session object with sendMessage method
 */
export const createChatSession = async (
    analysis: ResearchAnalysis,
    fileBase64: string,
    mimeType: string,
    restoredHistory?: any[]
) => {
    console.log("[Ollama] Creating chat session...");

    const documentText = extractTextFromBase64(fileBase64, mimeType);
    const truncatedDoc = documentText.substring(0, 5000); // Smaller excerpt for chat context

    // Store conversation history
    const conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [];

    // Add restored history if provided
    if (restoredHistory && restoredHistory.length > 0) {
        restoredHistory.forEach((msg: any) => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                conversationHistory.push({
                    role: msg.role,
                    content: msg.parts?.[0]?.text || msg.content || ''
                });
            }
        });
    }

    return {
        /**
         * Sends a message to the chat session
         */
        sendMessage: async (userMessage: string) => {
            console.log(`[Ollama Chat] User: ${userMessage.substring(0, 50)}...`);

            // Build context-aware prompt
            let chatPrompt = `
You are the Grand Council of Industrial Engineering. You have analyzed a research paper and are now helping the author improve it.

PAPER EXCERPT (first 5000 chars):
${truncatedDoc}

ANALYSIS SUMMARY:
- Overall Score: ${analysis.overallScore}/100
- Title: ${analysis.title}
- Topic: ${analysis.topicInference}
- Cluster Scores: A=${analysis.clusterScores['Cluster A']}, B=${analysis.clusterScores['Cluster B']}, C=${analysis.clusterScores['Cluster C']}, D=${analysis.clusterScores['Cluster D']}
- Main Feedback: ${analysis.holisticFeedback}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER'S CURRENT QUESTION:
${userMessage}

INSTRUCTIONS:
- Provide specific, actionable advice
- Reference the analysis when relevant
- Be constructive but honest
- If asked about a specific section, refer to the section analysis
- If asked for examples, provide concrete suggestions
- Keep responses focused and practical

Your response:
`;

            try {
                const response = await callOllama(
                    chatPrompt,
                    SYSTEM_INSTRUCTION,
                    0.3 // Slightly higher temperature for more creative responses
                );

                // Add to conversation history
                conversationHistory.push({ role: 'user', content: userMessage });
                conversationHistory.push({ role: 'assistant', content: response });

                console.log(`[Ollama Chat] Response: ${response.substring(0, 50)}...`);

                // Return in format compatible with Gemini SDK
                return {
                    candidates: [{
                        content: {
                            parts: [{ text: response }]
                        }
                    }]
                };
            } catch (error) {
                console.error("[Ollama Chat] Error:", error);
                throw error;
            }
        },

        /**
         * Gets the current conversation history
         */
        getHistory: () => conversationHistory
    };
};

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if Ollama is running and accessible
 */
export const checkOllamaStatus = async (): Promise<boolean> => {
    try {
        const response = await fetch(OLLAMA_BASE_URL);
        return response.ok;
    } catch {
        return false;
    }
};

/**
 * List available models in Ollama
 */
export const listAvailableModels = async (): Promise<string[]> => {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch {
        return [];
    }
};
