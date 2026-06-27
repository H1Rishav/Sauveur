import React, { useState } from 'react';
import { Task } from '../types.ts';
import TaskCard from './TaskCard.tsx';
import TaskFormModal from './TaskFormModal.tsx';
import Button from './ui/Button.tsx';
import { Plus, Info } from 'lucide-react';

interface TasksPageProps {
  tasks: Task[];
  onAddTask: (taskData: any) => Promise<boolean>;
  onUpdateTask: (taskId: number, taskData: any) => Promise<boolean>;
  onDeleteTask: (taskId: number) => Promise<boolean>;
  onToggleComplete: (taskId: number) => Promise<boolean>;
  onToggleMode: (taskId: number) => Promise<boolean>;
  onApproveTask: (taskId: number) => Promise<boolean>;
  onClearCompleted: () => Promise<boolean>;
  isLoading: boolean;
}

export default function TasksPage({ 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask, 
  onToggleComplete, 
  onToggleMode, 
  onApproveTask,
  onClearCompleted,
  isLoading 
}: TasksPageProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'human_check' | 'completed'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'completed' && task.status !== 'human_check';
    if (filter === 'human_check') return task.status === 'human_check';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const handleFormSubmit = async (taskData: any) => {
    if (editingTask) {
      return await onUpdateTask(editingTask.id, taskData);
    } else {
      return await onAddTask(taskData);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
            Pipeline Tasks
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Delegate, verify outputs, or trigger autopilot overrides.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
          className="font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Task
        </Button>
      </div>

      {/* Tabs / Filters */}
      <div className="flex border-b border-neutral-900 pb-px">
        <div className="flex gap-1.5 overflow-x-auto">
          {(['all', 'pending', 'human_check', 'completed'] as const).map((f) => {
            const count = f === 'all' ? tasks.length :
                          f === 'pending' ? tasks.filter(t => t.status !== 'completed' && t.status !== 'human_check').length :
                          f === 'human_check' ? tasks.filter(t => t.status === 'human_check').length :
                          tasks.filter(t => t.status === 'completed').length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-mono font-medium border-b-2 transition-all duration-150 capitalize shrink-0 ${
                  filter === f 
                    ? 'border-amber-500 text-amber-500 font-semibold' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {f.replace('_', ' ')} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filter === 'completed' && filteredTasks.length > 0 && (
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

      {/* Grid of Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={(t) => setEditingTask(t)}
            onDelete={onDeleteTask}
            onToggleComplete={onToggleComplete}
            onToggleMode={onToggleMode}
            onApproveTask={onApproveTask}
          />
        ))}

        {filteredTasks.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-neutral-800 rounded-lg bg-neutral-900/10">
            <Info className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400 font-sans">No pipeline tasks registered inside this view.</p>
            <button 
              onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
              className="text-xs text-amber-500 hover:underline mt-2 font-semibold"
            >
              Add first task
            </button>
          </div>
        )}
      </div>

      {/* Unified Create/Edit Task Modal */}
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
