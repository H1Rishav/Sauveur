import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.js';
import Badge from './ui/Badge.js';
import { AgentAction } from '../types.js';
import { Cpu, Compass, Sliders, ShieldCheck, Filter, RotateCcw } from 'lucide-react';

interface AgentActivityPageProps {
  actions: AgentAction[];
  onUndo?: (actionId: number) => any;
}

export default function AgentActivityPage({ actions, onUndo }: AgentActivityPageProps) {
  const [agentFilter, setAgentFilter] = useState<'all' | 'The Doer' | 'The Planner' | 'The Profiler' | 'The Strategist'>('all');

  const filteredActions = actions.filter((act) => {
    if (agentFilter === 'all') return true;
    return act.agent === agentFilter;
  });

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case 'The Doer': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'The Planner': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'The Profiler': return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
      case 'The Strategist': return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      default: return 'bg-neutral-800 border-neutral-700 text-neutral-300';
    }
  };

  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case 'The Doer': return <Cpu className="w-4 h-4" />;
      case 'The Planner': return <Compass className="w-4 h-4" />;
      case 'The Profiler': return <Sliders className="w-4 h-4" />;
      case 'The Strategist': return <ShieldCheck className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
            Agent Activity Logs
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Audit trailing trace of autonomous threads executing under Perceive→Reason→Act→Verify guidelines.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-900 pb-4">
        <span className="text-xs font-mono text-neutral-500 flex items-center gap-1.5 mr-2">
          <Filter className="w-3.5 h-3.5" />
          FILTER THREAD:
        </span>
        {(['all', 'The Doer', 'The Planner', 'The Profiler', 'The Strategist'] as const).map((agent) => (
          <button
            key={agent}
            onClick={() => setAgentFilter(agent)}
            className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium border transition-all duration-150 ${
              agentFilter === agent
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-semibold'
                : 'bg-transparent border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            {agent}
          </button>
        ))}
      </div>

      {/* Action timeline / cards */}
      <div className="space-y-6">
        {filteredActions.map((act) => (
          <Card key={act.id} className="relative overflow-hidden group">
            
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded border ${getAgentColor(act.agent)}`}>
                  {getAgentIcon(act.agent)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100 font-sans tracking-tight">
                    {act.agent}
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-500 tracking-tight">
                    INDEXED: {new Date(act.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                {onUndo && act.status === 'completed' && act.task_id && (
                  <button
                    onClick={() => onUndo(act.id)}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-neutral-400 hover:text-amber-500 border border-neutral-800 hover:border-amber-500/30 bg-neutral-950/40 rounded transition-all flex items-center gap-1 cursor-pointer"
                    title="Revert and Undo this autonomous action"
                  >
                    <RotateCcw className="w-3 h-3" />
                    UNDO
                  </button>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-500">STATUS:</span>
                  <Badge variant={act.status === 'completed' ? 'calm' : 'warning'}>
                    {act.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Main Action Line */}
            <div className="space-y-1 mb-5">
              <span className="text-[10px] font-mono text-amber-500/90 uppercase tracking-widest font-bold">CURRENT TASK OR THOUGHT</span>
              <p className="text-sm text-neutral-200 font-sans font-medium">{act.action}</p>
            </div>

            {/* PRAV Paradigm Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-neutral-800/40 pt-4 bg-neutral-950/20 -mx-6 -mb-6 p-6">
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-neutral-800 text-neutral-400 font-bold">P</span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">PERCEIVE</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{act.payload.perceive}</p>
              </div>

              <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-neutral-800/60 pt-3 md:pt-0 md:pl-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-neutral-800 text-neutral-400 font-bold">R</span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">REASON</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{act.payload.reason}</p>
              </div>

              <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-neutral-800/60 pt-3 md:pt-0 md:pl-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-neutral-800 text-neutral-400 font-bold">A</span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">ACT</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{act.payload.act}</p>
              </div>

              <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-neutral-800/60 pt-3 md:pt-0 md:pl-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-neutral-800 text-neutral-400 font-bold">V</span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">VERIFY</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{act.payload.verify}</p>
              </div>

            </div>

          </Card>
        ))}

        {filteredActions.length === 0 && (
          <div className="py-16 text-center border border-dashed border-neutral-800 rounded-lg">
            <p className="text-sm text-neutral-400 font-sans">No autonomous action traces matching the filter are available.</p>
          </div>
        )}
      </div>

    </div>
  );
}
