import React from 'react';
import { Loader2, CheckCircle, Circle } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface SimulationStepProps {
  steps: Step[];
}

const SimulationStep: React.FC<SimulationStepProps> = ({ steps }) => {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {steps.map((step, index) => (
        <div 
          key={step.id} 
          className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-300 ${
            step.status === 'active' 
              ? 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10' 
              : step.status === 'completed'
              ? 'bg-slate-800/50 border-emerald-500/30'
              : 'bg-transparent border-transparent opacity-50'
          }`}
        >
          <div className="flex-shrink-0">
            {step.status === 'active' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
            {step.status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
            {step.status === 'pending' && <Circle className="w-5 h-5 text-slate-600" />}
          </div>
          
          <div className="flex-grow">
            <span className={`font-mono text-sm ${
              step.status === 'active' ? 'text-blue-100 font-bold' : 
              step.status === 'completed' ? 'text-emerald-100' : 'text-slate-500'
            }`}>
              {step.label}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div className={`h-full w-[2px] absolute left-[22px] -bottom-4 -z-10 ${
              step.status === 'completed' ? 'bg-emerald-500/30' : 'bg-slate-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default SimulationStep;