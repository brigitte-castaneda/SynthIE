import { ClusterDef, ClusterId } from '@synthie/contracts';
import { Calculator, Hammer, Network, Users } from 'lucide-react';
import React from 'react';

export const CLUSTERS: ClusterDef[] = [
  {
    id: ClusterId.A,
    name: "Mathematical & Economic Core",
    role: "The Solver",
    description: "Handles quantitative foundations, ensuring mathematical and financial validity via OR and Engineering Economy.",
    domains: ["Operations Research", "Engineering Economy", "Information Engineering"],
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  {
    id: ClusterId.B,
    name: "Physical & Production Core",
    role: "The Builder",
    description: "Governs the tangible creation of value, materials, and physical environment optimization.",
    domains: ["Manufacturing", "Facilities Engineering", "Quality & Reliability"],
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    id: ClusterId.C,
    name: "Operational & Systemic Core",
    role: "The Orchestrator",
    description: "Manages flow of goods, product lifecycles, and system integration.",
    domains: ["Supply Chain", "Production Planning", "Product Design"],
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    id: ClusterId.D,
    name: "Human & Social Core",
    role: "The Steward",
    description: "Manages complexity, safety, human agency, and organizational context.",
    domains: ["Ergonomics", "Safety Engineering", "Management"],
    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
];

export const CLUSTER_ICONS: Record<ClusterId, React.ReactNode> = {
  [ClusterId.A]: <Calculator className="w-6 h-6" />,
  [ClusterId.B]: <Hammer className="w-6 h-6" />,
  [ClusterId.C]: <Network className="w-6 h-6" />,
  [ClusterId.D]: <Users className="w-6 h-6" />,
};