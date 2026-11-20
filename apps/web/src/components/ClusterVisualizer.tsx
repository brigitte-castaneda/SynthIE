import React from 'react';
import { CLUSTERS, CLUSTER_ICONS } from '../constants';
import { ClusterId } from '@synthie/contracts';

interface ClusterVisualizerProps {
  activeClusters?: ClusterId[];
  isProcessing?: boolean;
}

const ClusterVisualizer: React.FC<ClusterVisualizerProps> = ({ activeClusters = [], isProcessing = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto mb-8">
      {CLUSTERS.map((cluster) => {
        const isActive = activeClusters.includes(cluster.id);
        const isDimmed = activeClusters.length > 0 && !isActive;

        return (
          <div
            key={cluster.id}
            className={`
              relative overflow-hidden rounded-xl border p-5 transition-all duration-500
              ${isActive 
                ? `${cluster.color} border-opacity-100 shadow-[0_0_30px_rgba(0,0,0,0.3)] scale-[1.02]` 
                : 'border-slate-700 bg-slate-800/50 text-slate-400'
              }
              ${isDimmed ? 'opacity-40 blur-[1px]' : 'opacity-100'}
            `}
          >
            {/* Active Indicator Pulse */}
            {isActive && isProcessing && (
              <div className="absolute top-0 right-0 p-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
                </span>
              </div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-slate-700'}`}>
                  {CLUSTER_ICONS[cluster.id]}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-none">{cluster.name}</h3>
                  <span className="text-xs font-mono uppercase tracking-wider opacity-70">{cluster.role}</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm mb-4 leading-relaxed opacity-90 min-h-[40px]">
              {cluster.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {cluster.domains.map((domain) => (
                <span 
                  key={domain} 
                  className={`text-[10px] px-2 py-1 rounded border ${
                    isActive 
                      ? 'border-current bg-white/5' 
                      : 'border-slate-600 bg-slate-700'
                  }`}
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClusterVisualizer;