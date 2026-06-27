import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.js';
import Badge from './ui/Badge.js';
import Button from './ui/Button.js';
import { Task, AgentAction } from '../types.js';
import { 
  CheckSquare, 
  Percent, 
  Sparkles, 
  Activity, 
  Cpu, 
  Compass, 
  Sliders, 
  ShieldAlert, 
  ArrowUpRight 
} from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  actions: AgentAction[];
  rewardsBalance: number;
  onChangeTab: (tab: 'home' | 'tasks' | 'activity' | 'rewards' | 'settings') => void;
}

export default function Dashboard({ tasks, actions, rewardsBalance, onChangeTab }: DashboardProps) {
  // Compute basic stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  
  // Autopilot rate calculation
  const autopilotTasks = tasks.filter(t => t.mode === 'autopilot').length;
  const autopilotRate = totalTasks > 0 ? Math.round((autopilotTasks / totalTasks) * 100) : 100;

  // Active or pending actions
  const activeAgentActionCount = actions.filter(a => ['perceiving', 'reasoning', 'acting', 'verifying'].includes(a.status)).length;

  return (
    <div className="space-y-8">
      
      {/* Editorial Greetings */}
      <div>
        <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
          Autonomous Command
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review metrics, active agent cycles, and validated artifacts compiled for you.
        </p>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Card className="hover:border-neutral-700 transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">ACTIVE / PENDING TASKS</span>
              <p className="text-3xl font-sans font-bold text-neutral-100">{pendingTasks}</p>
            </div>
            <div className="p-2 bg-neutral-950/60 rounded border border-neutral-800">
              <CheckSquare className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{completedTasks} completed to date</span>
            <button onClick={() => onChangeTab('tasks')} className="hover:text-amber-500 inline-flex items-center gap-0.5">
              View <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        <Card className="hover:border-neutral-700 transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">AUTOPILOT ALLOCATION</span>
              <p className="text-3xl font-sans font-bold text-neutral-100">{autopilotRate}%</p>
            </div>
            <div className="p-2 bg-neutral-950/60 rounded border border-neutral-800">
              <Percent className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{autopilotTasks} of {totalTasks} tasks automated</span>
            <button onClick={() => onChangeTab('settings')} className="hover:text-amber-500 inline-flex items-center gap-0.5">
              Configure <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        <Card className="hover:border-neutral-700 transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">REWARDS BALANCE</span>
              <p className="text-3xl font-sans font-bold text-neutral-100">{rewardsBalance} <span className="text-xs font-mono text-neutral-500">PTS</span></p>
            </div>
            <div className="p-2 bg-neutral-950/60 rounded border border-neutral-800">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>Welcome points credited</span>
            <button onClick={() => onChangeTab('rewards')} className="hover:text-amber-500 inline-flex items-center gap-0.5">
              Ledger <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        <Card className="hover:border-neutral-700 transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">ACTIVE AGENT THREADS</span>
              <p className="text-3xl font-sans font-bold text-neutral-100">{activeAgentActionCount || "4"}</p>
            </div>
            <div className="p-2 bg-neutral-950/60 rounded border border-neutral-800">
              <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>Perceive→Reason→Act→Verify</span>
            <button onClick={() => onChangeTab('activity')} className="hover:text-amber-500 inline-flex items-center gap-0.5">
              Logs <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

      </div>

      {/* Visual Agent Core Hub */}
      <Card>
        <CardHeader>
          <CardTitle>Core Core Agent Status</CardTitle>
          <CardDescription>
            SAUVEUR utilizes four specific server agents running background threads across the core system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            
            {/* The Doer */}
            <div className="p-4 bg-neutral-950/40 rounded border border-neutral-800/80 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-neutral-200">THE DOER</span>
                <Badge variant="calm" className="ml-auto">Active</Badge>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-3">
                Compiles documents, modifies CSV entries, and prepares custom drafts based on historical trends.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                VERIFICATION PRECISION: 100%
              </div>
            </div>

            {/* The Planner */}
            <div className="p-4 bg-neutral-950/40 rounded border border-neutral-800/80 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span className="text-xs font-semibold text-neutral-200">THE PLANNER</span>
                <Badge variant="warning" className="ml-auto">Active</Badge>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-3">
                Dynamically sequences calendar items, aligns deadlines, and fits workload inside natural energy zones.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                ALIGNMENT INDEX: OPTIMAL
              </div>
            </div>

            {/* The Profiler */}
            <div className="p-4 bg-neutral-950/40 rounded border border-neutral-800/80 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-neutral-200">THE PROFILER</span>
                <Badge variant="info" className="ml-auto">Active</Badge>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-3">
                Observes behavioral friction, adjusts focus hours starting parameters, and dials down distraction triggers.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-sky-400" />
                STYLE MATCH RATE: Deliberate
              </div>
            </div>

            {/* The Strategist */}
            <div className="p-4 bg-neutral-950/40 rounded border border-neutral-800/80 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-neutral-200">THE STRATEGIST</span>
                <Badge variant="urgent" className="ml-auto">Monitoring</Badge>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-3">
                Calculates risk metrics, detects pricing or timing anomalies, and triggers human checkpoint flags.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-rose-400" />
                CHECKPOINT CRITERIA: SECURE
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Two column visual split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest Agent Action Blocks */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Autonomous Activity Stream</CardTitle>
                <CardDescription>Latest task completions, background alignments, and verifications.</CardDescription>
              </div>
              <button 
                onClick={() => onChangeTab('activity')}
                className="text-xs font-mono text-amber-500 hover:underline"
              >
                View full logs
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.slice(0, 3).map((act) => (
                <div key={act.id} className="p-4 bg-neutral-950/40 rounded border border-neutral-800/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-neutral-200 text-xs flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        act.agent === 'The Doer' ? 'bg-emerald-400' :
                        act.agent === 'The Planner' ? 'bg-amber-400' :
                        act.agent === 'The Profiler' ? 'bg-sky-400' : 'bg-rose-400'
                      }`} />
                      {act.agent}
                    </span>
                    <span className="text-neutral-500 font-normal">
                      {new Date(act.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-sans text-neutral-300 text-sm leading-relaxed">{act.action}</p>
                  
                  {/* Perceive Reason Act Verify */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-neutral-800/40 pt-2 text-neutral-400">
                    <div>
                      <span className="text-[9px] text-amber-500/80 uppercase font-semibold">Perceive:</span> {act.payload.perceive}
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-500/80 uppercase font-semibold">Reason:</span> {act.payload.reason}
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-500/80 uppercase font-semibold">Act:</span> {act.payload.act}
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-500/80 uppercase font-semibold">Verify:</span> {act.payload.verify}
                    </div>
                  </div>
                </div>
              ))}
              {actions.length === 0 && (
                <p className="text-center text-neutral-500 py-8 font-mono text-xs">No active threads registered yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Task Board Summary */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle>Core Pipeline Tasks</CardTitle>
              <CardDescription>Overview of upcoming deadlines requiring verification.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3.5">
              {tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="p-3 bg-neutral-950/20 border border-neutral-900 rounded flex items-center justify-between text-xs hover:border-neutral-800 transition-colors">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-semibold text-neutral-200 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        {task.mode}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">•</span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Badge variant={
                      task.status === 'completed' ? 'calm' :
                      task.status === 'human_check' ? 'urgent' : 'warning'
                    }>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-center text-neutral-500 py-8 font-mono text-xs">No tasks in core pipeline.</p>
              )}
            </CardContent>
            <div className="p-6 border-t border-neutral-800/40">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs font-semibold"
                onClick={() => onChangeTab('tasks')}
              >
                Go to Task board
              </Button>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
}
