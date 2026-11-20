import React, { useState, useRef, useEffect } from 'react';
import { reviewDraft } from './api/client';
import { ClusterId, ResearchAnalysis, DocumentInput } from '@synthie/contracts';
import ClusterVisualizer from './components/ClusterVisualizer';
import AnalysisDashboard from './components/AnalysisDashboard';
import SimulationStep from './components/SimulationStep';
import { BrainCircuit, RotateCcw, Sparkles, Upload, FileText, X, SearchCheck } from 'lucide-react';

function App() {
  const [context, setContext] = useState('');
  const [file, setFile] = useState<{name: string, data: string, type: DocumentInput['mimeType']} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null);
  const [activeClusters, setActiveClusters] = useState<ClusterId[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
   
  // Animation/Simulation State
  const [simStep, setSimStep] = useState(0);

  const steps = [
    { id: '1', label: 'Orchestrator: Parsing Structure', status: simStep === 0 && isGenerating ? 'active' : simStep > 0 ? 'completed' : 'pending' },
    { id: '2', label: 'Review Board: Calculating Metrics', status: simStep === 1 && isGenerating ? 'active' : simStep > 1 ? 'completed' : 'pending' },
    { id: '3', label: 'Clusters: Evaluating Rigor', status: simStep === 2 && isGenerating ? 'active' : simStep > 2 ? 'completed' : 'pending' },
    { id: '4', label: 'Editor: Generating Feedback', status: simStep === 3 && isGenerating ? 'active' : simStep > 3 ? 'completed' : 'pending' },
  ] as const;

  // Scroll to top when analysis is ready
  useEffect(() => {
    if (analysis) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [analysis]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/plain') {
        alert("Please upload a PDF or TXT file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const base64Data = base64String.split(',')[1];
        setFile({
          name: selectedFile.name,
          data: base64Data,
          type: selectedFile.type as DocumentInput['mimeType']
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!file) return;

    setIsGenerating(true);
    setAnalysis(null);
    setSimStep(0);
    setActiveClusters([]);

    try {
      const apiCallPromise = reviewDraft({
        document: { name: file.name, mimeType: file.type, data: file.data },
        context: context || undefined,
      });

      // Simulation Timeline
      setTimeout(() => setSimStep(1), 1500);
       
      setTimeout(() => {
        setSimStep(2);
        // During metrics calculation, we visualize logical processing
      }, 3500);

      setTimeout(() => {
        setSimStep(3);
        // Activate all clusters for rigor check
        setActiveClusters([ClusterId.A, ClusterId.B, ClusterId.C, ClusterId.D]);
      }, 6000);

      setTimeout(() => setSimStep(3), 8500);

      const { analysis: data } = await apiCallPromise;
      setAnalysis(data);
      // Scrolling handled by useEffect
    } catch (error) {
      console.error(error);
      const reason = error instanceof Error ? `\n\n${error.message}` : '';
      alert(`Failed to analyze draft. Please try again.${reason}`);
    } finally {
      setIsGenerating(false);
      setSimStep(4);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setContext('');
    clearFile();
    setSimStep(0);
    setActiveClusters([]);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">SynthIE</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Research Analyst</p>
            </div>
          </div>
          {analysis && (
            <button 
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> New Analysis
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!analysis ? (
          <div className="flex flex-col items-center">
            
            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Automated Editorial Board
              </h2>
              <p className="text-slate-400 text-lg">
                Upload your draft. Receive a rigorous, section-by-section critique 
                and a holistic quality score based on the IE Gold Standard.
              </p>
            </div>

            {/* Input Form */}
            <div className="w-full max-w-2xl bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-16 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
               
              <div className="space-y-6 relative z-10">
                
                {/* File Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Upload Draft (PDF or TXT)
                  </label>
                   
                  {!file ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all
                        ${isGenerating ? 'border-slate-700 opacity-50 cursor-not-allowed' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-800'}
                      `}
                    >
                      <Upload className="w-10 h-10 text-slate-500 mb-4" />
                      <p className="text-slate-300 font-medium">Click to upload document</p>
                      <p className="text-xs text-slate-500 mt-2">Maximum file size: 10MB</p>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.txt"
                        disabled={isGenerating}
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                          <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">Ready for review</p>
                        </div>
                      </div>
                      {!isGenerating && (
                        <button 
                          onClick={clearFile}
                          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Context */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Review Context (Optional)
                  </label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="E.g., Evaluate this for a Q1 Manufacturing Journal. Be strict about methodology."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 resize-none"
                    disabled={isGenerating}
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!file || isGenerating}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                    ${!file || isGenerating 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-pulse" /> Reviewing...
                    </>
                  ) : (
                    <>
                      <SearchCheck className="w-5 h-5" /> Start Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visualization Area */}
            {isGenerating ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-mono text-blue-400 mb-2">Analysis in Progress</h3>
                  <p className="text-slate-500 text-sm">The Editorial Board is scoring your draft...</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-1">
                    <SimulationStep steps={steps as any} /> 
                  </div>
                  <div className="lg:col-span-2">
                    <ClusterVisualizer activeClusters={activeClusters} isProcessing={true} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="text-center mb-6">
                  <p className="text-slate-500 text-sm uppercase tracking-widest font-mono">Evaluation Criteria (The 4 Pillars)</p>
                </div>
                <ClusterVisualizer />
              </div>
            )}

          </div>
        ) : (
          file && (
            <AnalysisDashboard 
              analysis={analysis} 
              draft={{ name: file.name, mimeType: file.type, data: file.data }} 
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20 py-8 text-center text-slate-500 text-sm">
        <p>&copy; 2026 SynthIE. Editorial Board AI. Developed by Brigitte Castaneda and Jaime Polanco</p>
      </footer>
    </div>
  );
}

export default App;