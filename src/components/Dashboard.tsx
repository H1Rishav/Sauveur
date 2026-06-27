import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import Badge from './ui/Badge.tsx';
import Button from './ui/Button.tsx';
import { Task, AgentAction } from '../types.ts';
import TaskCard from './TaskCard.tsx';
import TaskFormModal from './TaskFormModal.tsx';
import { 
  CheckSquare, 
  Percent, 
  Sparkles, 
  Activity, 
  Cpu, 
  Compass, 
  Sliders, 
  ShieldAlert, 
  ArrowUpRight,
  Plus,
  Info,
  History,
  Play
} from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  actions: AgentAction[];
  rewardsBalance: number;
  onChangeTab: (tab: 'home' | 'tasks' | 'activity' | 'rewards' | 'settings') => void;
  onAddTask: (taskData: any) => Promise<boolean>;
  onUpdateTask: (taskId: number, taskData: any) => Promise<boolean>;
  onDeleteTask: (taskId: number) => Promise<boolean>;
  onToggleComplete: (taskId: number) => Promise<boolean>;
  onToggleMode: (taskId: number) => Promise<boolean>;
  onApproveTask: (taskId: number) => Promise<boolean>;
  onClearCompleted: () => Promise<boolean>;
}

export default function Dashboard({ 
  tasks, 
  actions, 
  rewardsBalance, 
  onChangeTab,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onToggleMode,
  onApproveTask,
  onClearCompleted
}: DashboardProps) {
  // Compute basic stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  
  // Autopilot rate calculation
  const autopilotTasks = tasks.filter(t => t.mode === 'autopilot').length;
  const autopilotRate = totalTasks > 0 ? Math.round((autopilotTasks / totalTasks) * 100) : 100;

  // Active or pending actions
  const activeAgentActionCount = actions.filter(a => ['perceiving', 'reasoning', 'acting', 'verifying'].includes(a.status)).length;

  // Task view states
  const [taskTab, setTaskTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sorting weight for urgency: high-priority deadlines sorted top
  const urgencyWeight = {
    urgent: 3,
    medium: 2,
    low: 1
  };

  // Filter & sort tasks
  const sortedIncompleteTasks = [...tasks]
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      // Prioritize urgent tasks
      const diff = (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
      if (diff !== 0) return diff;
      
      // Fallback: nearest deadline first
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const completedHistoryTasks = [...tasks]
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleFormSubmit = async (taskData: any) => {
    if (editingTask) {
      return await onUpdateTask(editingTask.id, taskData);
    } else {
      return await onAddTask(taskData);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Editorial Greetings */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
            Autonomous Command
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Review metrics, active agent cycles, and validated focus pipelines compiled for you.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
          className="font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Delegate Task
        </Button>
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
            <button onClick={() => setTaskTab('incomplete')} className="hover:text-amber-500 inline-flex items-center gap-0.5">
              Focus Queue
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
            <span>{autopilotTasks} of {totalTasks} automated</span>
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
            <span>Productivity tokens</span>
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
            <span>Multi-Agent matrix</span>
            <button onClick={() => onChangeTab('activity')} className="hover:text-amber-500 inline-flex items-center gap-0.5">
              Logs <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

      </div>

      {/* Visual Agent Core Hub */}
      <Card>
        <CardHeader>
          <CardTitle>Core Agent Matrix Status</CardTitle>
          <CardDescription>
            SAUVEUR utilizes four background agents working collaboratively on a Perceive → Reason → Act → Verify loop.
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
                Compiles document artifacts, edits spreadsheets, and prepares context dispatches.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                VERIFICATION LEVEL: 100%
              </div>
            </div>

            {/* The Planner */}
            <div className="p-4 bg-neutral-950/40 rounded border border-neutral-800/80 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-neutral-200">THE PLANNER</span>
                <Badge variant="warning" className="ml-auto">Active</Badge>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-3">
                Dynamically sequences calendar items, sets deadlines, and sequences workload.
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
                Evaluates workflow tempos and refines focus intervals to match habits.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-sky-400" />
                STYLE MATCH: DELIBERATE
              </div>
            </div>

            {/* The Strategist */}
            <div className="p-4 bg-neutral-950/40 rounded border border-neutral-800/80 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-neutral-200">THE STRATEGIST</span>
                <Badge variant="urgent" className="ml-auto">Securing</Badge>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-3">
                Audits document curves, risk patterns, and raises human verification overrides.
              </p>
              <div className="text-[9px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-rose-400" />
                CHECKPOINT: STABLE
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Main Core Section: Interactive Tasks Core Panel & Stream Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Task Core Command board */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-bold text-xl tracking-tight text-neutral-50">
                Pipeline Control Board
              </h2>
            </div>
            
            {/* View Toggles */}
            <div className="flex bg-neutral-950 p-1 rounded-md border border-neutral-850">
              <button
                onClick={() => setTaskTab('incomplete')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150 flex items-center gap-1.5 ${
                  taskTab === 'incomplete'
                    ? 'bg-amber-500 text-neutral-950 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Active Queue ({sortedIncompleteTasks.length})
              </button>
              <button
                onClick={() => setTaskTab('completed')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150 flex items-center gap-1.5 ${
                  taskTab === 'completed'
                    ? 'bg-amber-500 text-neutral-950 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Completed History ({completedHistoryTasks.length})
              </button>
            </div>
          </div>

          {taskTab === 'completed' && completedHistoryTasks.length > 0 && (
            <div className="flex justify-between items-center bg-neutral-900/30 px-4 py-2.5 rounded-md border border-neutral-850">
              <span className="text-xs text-neutral-400 font-mono">Archive preserves all automated outputs</span>
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans text-rose-400 font-medium">Clear Completed History?</span>
                  <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)} className="text-[10px] py-0.5 px-2">Cancel</Button>
                  <Button variant="primary" size="sm" onClick={() => { onClearCompleted(); setShowClearConfirm(false); }} className="bg-rose-600 hover:bg-rose-500 border-none text-[10px] py-0.5 px-2 text-white">Clear All</Button>
                </div>
              ) : (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowClearConfirm(true)} 
                  className="text-xs text-rose-400 border-rose-950 hover:border-rose-500/40 hover:bg-rose-950/20 px-2 py-1 h-auto"
                >
                  Clear History
                </Button>
              )}
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {taskTab === 'incomplete' ? (
              sortedIncompleteTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => setEditingTask(t)}
                  onDelete={onDeleteTask}
                  onToggleComplete={onToggleComplete}
                  onToggleMode={onToggleMode}
                  onApproveTask={onApproveTask}
                />
              ))
            ) : (
              completedHistoryTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => setEditingTask(t)}
                  onDelete={onDeleteTask}
                  onToggleComplete={onToggleComplete}
                  onToggleMode={onToggleMode}
                  onApproveTask={onApproveTask}
                />
              ))
            )}

            {/* Empty States */}
            {taskTab === 'incomplete' && sortedIncompleteTasks.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-neutral-800/80 rounded-lg bg-neutral-900/10">
                <Info className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-400 font-sans font-medium">No pending tasks found in your pipeline queue.</p>
                <p className="text-xs text-neutral-500 font-sans mt-1">All elements are currently optimized and fully addressed.</p>
                <button 
                  onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
                  className="text-xs text-amber-500 hover:underline mt-3 font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Allocate task to companion
                </button>
              </div>
            )}

            {taskTab === 'completed' && completedHistoryTasks.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-neutral-800/80 rounded-lg bg-neutral-900/10">
                <History className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-400 font-sans font-medium">Completed Archive is currently empty.</p>
                <p className="text-xs text-neutral-500 font-sans mt-1">Checkmark tasks in your focus pipeline to populate this list.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Minor Column: Agent Action logs */}
        <div className="space-y-5">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Autonomous Activity Stream</CardTitle>
                <CardDescription>Latest system verifications and agent cognitive trace logs.</CardDescription>
              </div>
              <button 
                onClick={() => onChangeTab('activity')}
                className="text-xs font-mono text-amber-500 hover:underline"
              >
                All Logs
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.slice(0, 4).map((act) => (
                <div key={act.id} className="p-3.5 bg-neutral-950/40 border border-neutral-800/40 rounded space-y-2 text-xs">
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
                  <p className="font-sans text-neutral-300 text-xs leading-relaxed">{act.action}</p>
                  
                  {/* Perceive Reason Act Verify logs */}
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-neutral-850 pt-2 text-neutral-400">
                    <div>
                      <span className="text-amber-500/80 font-semibold uppercase">P:</span> {act.payload.perceive}
                    </div>
                    <div>
                      <span className="text-amber-500/80 font-semibold uppercase">R:</span> {act.payload.reason}
                    </div>
                    <div>
                      <span className="text-amber-500/80 font-semibold uppercase">A:</span> {act.payload.act}
                    </div>
                    <div>
                      <span className="text-amber-500/80 font-semibold uppercase">V:</span> {act.payload.verify}
                    </div>
                  </div>
                </div>
              ))}
              {actions.length === 0 && (
                <p className="text-center text-neutral-500 py-10 font-mono text-xs">No active agent threads recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Unified Task Creation/Editing Form modal */}
      <TaskFormModal
        isOpen={isFormOpen || !!editingTask}
        task={editingTask}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
      />

    </div>
  );
}
