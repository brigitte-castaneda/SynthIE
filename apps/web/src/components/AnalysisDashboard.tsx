import React, { useRef } from 'react';
import { ResearchAnalysis, ClusterId, DocumentInput } from '@synthie/contracts';
import { AlertCircle, CheckCircle, TrendingUp, BookOpen, PenTool, Brain, ChevronDown, ChevronUp, MessageSquare, Download, ArrowRight } from 'lucide-react';
import ChatInterface, { ChatInterfaceRef } from './ChatInterface';
import { generateHTMLReport } from '../report/htmlReport';

interface AnalysisDashboardProps {
  analysis: ResearchAnalysis;
  draft: DocumentInput;
}

const ScoreBadge: React.FC<{ score: number, size?: 'sm' | 'lg' }> = ({ score, size = 'sm' }) => {
  let color = 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
  if (score < 70) color = 'text-amber-500 border-amber-500/20 bg-amber-500/10';
  if (score < 50) color = 'text-rose-500 border-rose-500/20 bg-rose-500/10';

  return (
    <div className={`
      font-mono font-bold rounded-full flex items-center justify-center border
      ${color}
      ${size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-12 h-12 text-lg'}
    `}>
      {score}
    </div>
  );
};

const ProgressBar: React.FC<{ value: number, colorClass: string }> = ({ value, colorClass }) => (
  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
    <div 
      className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
      style={{ width: `${value}%` }}
    />
  </div>
);

const SectionCard: React.FC<{ 
  section: ResearchAnalysis['sectionAnalysis'][0],
  onDiscuss: (text: string) => void
}> = ({ section, onDiscuss }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border border-slate-700 rounded-xl bg-slate-800/30 overflow-hidden transition-all hover:bg-slate-800/50">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <ScoreBadge score={section.score} />
          <div>
            <h3 className="font-bold text-lg text-slate-200">{section.title}</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{section.summary}</p>
          </div>
        </div>
        <div className="text-slate-500 group-hover:text-white transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-6 pt-2 border-t border-slate-700/50 space-y-4 animate-in slide-in-from-top-2 duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-lg">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400 mb-2">
                <CheckCircle className="w-3 h-3" /> Strengths
              </h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                {section.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-rose-900/10 border border-rose-500/20 p-3 rounded-lg">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-rose-400 mb-2">
                <AlertCircle className="w-3 h-3" /> Weaknesses
              </h4>
              <ul className="text-sm text-slate-300 space-y-2">
                {section.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 items-start group/item">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 flex-shrink-0"></span>
                    <span className="flex-1">{w}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscuss(`I need to fix this weakness in the ${section.title}: "${w}". What do you recommend?`);
                      }}
                      className="opacity-0 group-hover/item:opacity-100 p-1 text-rose-400 hover:bg-rose-500/20 rounded transition-all"
                      title="Discuss this issue"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg relative group/strategy">
            <h4 className="flex items-center gap-2 text-sm font-bold text-blue-300 mb-2">
              <TrendingUp className="w-4 h-4" /> Improvement Strategy
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">{section.improvementAdvice}</p>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDiscuss(`Regarding the improvement strategy for the ${section.title}: "${section.improvementAdvice}". Can you give me a concrete example or rewrite?`);
              }}
              className="absolute top-4 right-4 opacity-0 group-hover/strategy:opacity-100 flex items-center gap-1 text-xs text-blue-400 hover:text-white bg-blue-500/20 hover:bg-blue-600 px-2 py-1 rounded transition-all"
            >
              Discuss <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis, draft }) => {
  const chatRef = useRef<ChatInterfaceRef>(null);

  const handleDiscuss = (text: string) => {
    chatRef.current?.prefillMessage(text);
    // Scroll to chat
    const chatElement = document.getElementById('chat-section');
    chatElement?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleDownload = () => {
    const htmlContent = generateHTMLReport(analysis);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SynthIE-Analysis-${analysis.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Level Summary Card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl relative">
        
        {/* Download Button */}
        <button 
          onClick={handleDownload}
          className="absolute top-6 right-6 p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-slate-600 hover:border-slate-500"
          title="Download Report as HTML"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download Report</span>
        </button>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Overall Score */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-900/50 rounded-xl border border-slate-700 w-full md:w-auto min-w-[200px]">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Overall Quality</span>
            <ScoreBadge score={analysis.overallScore} size="lg" />
            <span className="text-slate-500 text-xs mt-3 text-center px-2">
              Based on IE Gold Standard
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-6 w-full">
            <div className="pr-32"> {/* Padding right to avoid overlap with download button on mobile/tablet */}
              <h1 className="text-2xl font-bold text-white leading-tight">{analysis.title}</h1>
              <p className="text-blue-400 font-mono text-sm mt-1">{analysis.topicInference}</p>
            </div>
            
            <p className="text-slate-300 leading-relaxed">
              {analysis.holisticFeedback}
            </p>

            {/* Cluster Radar Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Math & Econ Rigor</span>
                  <span>{analysis.clusterScores[ClusterId.A]}%</span>
                </div>
                <ProgressBar value={analysis.clusterScores[ClusterId.A]} colorClass="bg-blue-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Physical Realism</span>
                  <span>{analysis.clusterScores[ClusterId.B]}%</span>
                </div>
                <ProgressBar value={analysis.clusterScores[ClusterId.B]} colorClass="bg-emerald-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Operational Logic</span>
                  <span>{analysis.clusterScores[ClusterId.C]}%</span>
                </div>
                <ProgressBar value={analysis.clusterScores[ClusterId.C]} colorClass="bg-amber-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Human/Social Factors</span>
                  <span>{analysis.clusterScores[ClusterId.D]}%</span>
                </div>
                <ProgressBar value={analysis.clusterScores[ClusterId.D]} colorClass="bg-rose-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Writing Style & Missed Refs */}
        <div className="space-y-6">
          
          {/* Writing Style */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <PenTool className="w-5 h-5 text-purple-400" /> Writing Style
            </h3>
            
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400 text-sm">Tone</span>
                <span className="text-slate-200 font-mono text-sm bg-slate-700 px-2 py-0.5 rounded">{analysis.writingStyle.tone}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400 text-sm">Clarity</span>
                <span className={`font-bold ${analysis.writingStyle.clarityScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {analysis.writingStyle.clarityScore}/100
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400 text-sm">Grammar</span>
                <span className={`font-bold ${analysis.writingStyle.grammarScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {analysis.writingStyle.grammarScore}/100
                </span>
              </div>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="text-xs text-slate-400 italic">"{analysis.writingStyle.voiceCritique}"</p>
            </div>
          </div>

          {/* Missed References */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Missed Opportunities
            </h3>
            <p className="text-xs text-slate-400 mb-3">You should consider integrating:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.keyMissedReferences.map((ref, i) => (
                <button 
                  key={i} 
                  onClick={() => handleDiscuss(`I want to know more about "${ref}" and how to integrate it into my paper.`)}
                  className="text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded hover:bg-indigo-800/50 hover:border-indigo-400 transition-colors"
                >
                  {ref}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Section Analysis */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-2">
            <Brain className="w-6 h-6 text-blue-400" /> Section-by-Section Critique
          </h3>
          <p className="text-slate-400 text-sm mb-4">Detailed breakdown of content, rigor, and flow.</p>

          <div className="space-y-3">
            {analysis.sectionAnalysis.map((section, idx) => (
              <SectionCard key={idx} section={section} onDiscuss={handleDiscuss} />
            ))}
          </div>
        </div>
      </div>

      {/* Chat Interface Section */}
      <div id="chat-section" className="mt-12 pt-8 border-t border-slate-800">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" /> 
          Interactive Editor
        </h2>
        <p className="text-slate-400 mb-6">
          Discuss the feedback with the Editorial Board. Upload revised sections or charts for analysis.
        </p>
        <ChatInterface 
          ref={chatRef} 
          analysis={analysis} 
          draft={draft} 
        />
      </div>

    </div>
  );
};

export default AnalysisDashboard;