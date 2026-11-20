import type { ResearchAnalysis } from '@synthie/contracts';
import { html } from './html';

/**
 * Builds the downloadable, self-contained HTML report. All analysis fields are
 * model output and are escaped by the `html` tag; the CSP additionally blocks
 * scripts and external loads if the file is opened in a browser.
 */
export const generateHTMLReport = (analysis: ResearchAnalysis, generatedAt: Date = new Date()): string => {
  const date = generatedAt.toLocaleDateString();

  return html`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
      <title>SynthIE Analysis Report - ${analysis.title}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 2rem; background: #f8f9fa; }
        .container { background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 0.5rem; }
        h2 { color: #1e293b; margin-top: 2.5rem; border-left: 4px solid #3b82f6; padding-left: 1rem; }
        h3 { color: #334155; margin-top: 1.5rem; }
        h4 { color: #475569; margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        .header-meta { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
        .score-badge { display: inline-block; background: #0f172a; color: white; padding: 0.5rem 1.5rem; border-radius: 9999px; font-weight: bold; font-size: 1.25rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
        .card { background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .section { border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; background: white; }
        .tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; margin-right: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #c7d2fe; }
        ul { padding-left: 1.5rem; margin-top: 0.5rem; }
        li { margin-bottom: 0.25rem; }
        .bar-container { background: #e2e8f0; height: 8px; border-radius: 4px; margin-top: 0.75rem; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; }
        .footer { margin-top: 4rem; text-align: center; color: #94a3b8; font-size: 0.875rem; border-top: 1px solid #e2e8f0; padding-top: 2rem; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="flex-between">
          <div>
            <h1>SynthIE Analysis Report</h1>
            <div class="header-meta">Generated on ${date}</div>
          </div>
          <div style="text-align: center;">
            <div class="score-badge">${analysis.overallScore}/100</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">IE Gold Standard</div>
          </div>
        </div>
        
        <div style="background: #f1f5f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
          <p style="margin: 0; color: #475569; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Paper Title</p>
          <p style="margin: 0.25rem 0 1rem 0; font-size: 1.25rem; font-weight: 600; color: #0f172a;">${analysis.title}</p>
          <p style="margin: 0; color: #475569; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Topic Inference</p>
          <p style="margin: 0.25rem 0 0 0; color: #334155;">${analysis.topicInference}</p>
        </div>
        
        <h2>Executive Summary</h2>
        <p style="font-size: 1.1rem; color: #334155; line-height: 1.7;">${analysis.holisticFeedback}</p>
        
        <h2>Cluster Analysis</h2>
        <div class="grid">
          ${Object.entries(analysis.clusterScores).map(([key, value]) => {
            let color = '#3b82f6'; // blue
            if (key.includes('Cluster B')) color = '#10b981'; // emerald
            if (key.includes('Cluster C')) color = '#f59e0b'; // amber
            if (key.includes('Cluster D')) color = '#f43f5e'; // rose
            return html`
            <div class="card">
              <div class="flex-between">
                <strong>${key}</strong>
                <span style="font-weight: bold; color: ${color};">${value}%</span>
              </div>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${value}%; background-color: ${color};"></div>
              </div>
            </div>
          `})}
        </div>

        <h2>Writing Style</h2>
        <div class="grid">
          <div class="card">
            <h4>Tone</h4>
            <div style="font-size: 1.1rem; font-weight: 500;">${analysis.writingStyle.tone}</div>
          </div>
          <div class="card">
            <h4>Clarity</h4>
            <div style="font-size: 1.5rem; font-weight: bold;">${analysis.writingStyle.clarityScore}<span style="font-size: 1rem; color: #94a3b8; font-weight: normal;">/100</span></div>
          </div>
          <div class="card">
            <h4>Grammar</h4>
            <div style="font-size: 1.5rem; font-weight: bold;">${analysis.writingStyle.grammarScore}<span style="font-size: 1rem; color: #94a3b8; font-weight: normal;">/100</span></div>
          </div>
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: #fff; border-left: 4px solid #8b5cf6; font-style: italic; color: #4b5563;">
          "${analysis.writingStyle.voiceCritique}"
        </div>

        <h2>Section-by-Section Critique</h2>
        ${analysis.sectionAnalysis.map(section => html`
          <div class="section">
            <div class="flex-between" style="margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem;">
              <h3 style="margin: 0;">${section.title}</h3>
              <span style="background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 6px; font-weight: bold; color: #334155;">Score: ${section.score}</span>
            </div>
            <p style="color: #475569; margin-bottom: 1.5rem;">${section.summary}</p>
            
            <div class="grid" style="margin-bottom: 1.5rem;">
              <div>
                <h4 style="color: #059669;">Strengths</h4>
                <ul style="color: #334155;">${section.strengths.map(s => html`<li>${s}</li>`)}</ul>
              </div>
              <div>
                <h4 style="color: #e11d48;">Weaknesses</h4>
                <ul style="color: #334155;">${section.weaknesses.map(w => html`<li>${w}</li>`)}</ul>
              </div>
            </div>
            
            <div style="background: #eff6ff; padding: 1rem; border-radius: 6px; border: 1px solid #dbeafe;">
              <h4 style="color: #1d4ed8; margin-top: 0;">Improvement Strategy</h4>
              <p style="margin: 0; color: #1e40af;">${section.improvementAdvice}</p>
            </div>
          </div>
        `)}

        <h2>Missed Opportunities & References</h2>
        <div style="padding: 1.5rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
          ${analysis.keyMissedReferences.map(ref => html`<span class="tag">${ref}</span>`)}
        </div>

        <div class="footer">
          <p>Generated by <strong>SynthIE</strong> - Automated Editorial Board</p>
        </div>
      </div>
    </body>
    </html>
  `.toString();
};
