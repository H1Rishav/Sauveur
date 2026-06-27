import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card.js';
import Badge from './ui/Badge.js';
import Button from './ui/Button.js';
import Modal from './ui/Modal.js';
import { Input, Textarea, Select, Checkbox } from './ui/Input.js';
import { Task } from '../types.js';
import { useToast } from './ui/Toast.js';
import { 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Mail, 
  FileText, 
  Calendar, 
  Info, 
  AlertOctagon 
} from 'lucide-react';

interface TasksPageProps {
  tasks: Task[];
  onAddTask: (taskData: any) => Promise<boolean>;
  onToggleMode: (taskId: number) => Promise<boolean>;
  onApproveTask: (taskId: number) => Promise<boolean>;
  isLoading: boolean;
}

export default function TasksPage({ tasks, onAddTask, onToggleMode, onApproveTask, isLoading }: TasksPageProps) {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'human_check' | 'completed'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [mode, setMode] = useState<'autopilot' | 'manual' | 'collaborative'>('autopilot');
  const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [needsMail, setNeedsMail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast("Task title is required.", "error");
      return;
    }
    if (needsMail && !recipientEmail.trim()) {
      toast("Recipient email is required for automated mailing.", "error");
      return;
    }

    setIsSubmitting(true);
    const success = await onAddTask({
      title,
      description,
      deadline,
      urgency,
      mode,
      importance,
      needs_mail: needsMail,
      recipient_email: needsMail ? recipientEmail : null
    });
    
    setIsSubmitting(false);
    if (success) {
      // Reset
      setTitle('');
      setDescription('');
      setDeadline('');
      setUrgency('medium');
      setMode('autopilot');
      setImportance('medium');
      setNeedsMail(false);
      setRecipientEmail('');
      setIsModalOpen(false);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'completed' && task.status !== 'human_check';
    if (filter === 'human_check') return task.status === 'human_check';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

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
          onClick={() => setIsModalOpen(true)}
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

      {/* Grid of Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                {/* Urgency Badge */}
                <div className="flex gap-1.5">
                  <Badge variant={
                    task.urgency === 'urgent' ? 'urgent' :
                    task.urgency === 'medium' ? 'warning' : 'calm'
                  }>
                    {task.urgency}
                  </Badge>
                  <Badge variant="neutral">
                    {task.importance} imp
                  </Badge>
                </div>
                
                {/* Status Badge */}
                <Badge variant={
                  task.status === 'completed' ? 'calm' :
                  task.status === 'human_check' ? 'urgent' : 'warning'
                }>
                  {task.status}
                </Badge>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-neutral-50 font-sans tracking-tight">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans pt-1">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Deadline & Mail */}
              <div className="flex flex-wrap gap-4 pt-4 text-xs font-mono text-neutral-400">
                {task.deadline && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                {task.needs_mail && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="truncate max-w-[180px]">{task.recipient_email}</span>
                  </div>
                )}
              </div>

              {/* Autopilot toggle row */}
              <div className="mt-4 pt-3.5 border-t border-neutral-800/40 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>Autonomous Autopilot</span>
                <button
                  onClick={() => onToggleMode(task.id)}
                  className="hover:text-amber-500 transition-colors"
                  title="Toggle autonomous delegation mode"
                >
                  {task.mode === 'autopilot' ? (
                    <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
                      <span>ENABLED</span>
                      <ToggleRight className="w-6 h-6 shrink-0" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <span>COLLABORATIVE</span>
                      <ToggleLeft className="w-6 h-6 shrink-0" />
                    </div>
                  )}
                </button>
              </div>

              {/* Artifacts if any */}
              {task.artifacts && task.artifacts.length > 0 && (
                <div className="mt-4 p-3 bg-neutral-950/60 border border-neutral-800/60 rounded">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">COMPILED ARTIFACTS</p>
                  <div className="space-y-1.5">
                    {task.artifacts.map((art) => (
                      <div key={art.id} className="flex items-center gap-2 text-xs font-sans text-neutral-200">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-medium underline truncate hover:text-amber-400 cursor-pointer">{art.file_ref}</span>
                        <span className="text-[9px] font-mono text-neutral-500">({art.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Special Human Check approval button */}
            {task.status === 'human_check' && (
              <div className="mt-5 p-4 bg-amber-500/5 border border-amber-500/20 rounded flex items-center justify-between gap-3 animate-pulse">
                <div className="flex gap-2 min-w-0">
                  <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-neutral-300 font-sans leading-snug">
                    <span className="font-semibold text-amber-400">Verifying Artifact.</span> The Strategist flagged this draft. Check, approve, and dispatch directly.
                  </p>
                </div>
                <Button 
                  variant="primary" 
                  size="sm"
                  className="font-semibold shrink-0"
                  onClick={() => onApproveTask(task.id)}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Approve & Dispatch
                </Button>
              </div>
            )}
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-neutral-800 rounded-lg">
            <Info className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400 font-sans">No pipeline tasks registered inside this view.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-amber-500 hover:underline mt-2 font-semibold"
            >
              Add first task
            </button>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Initialize New Pipeline Task"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Task Title"
            type="text"
            placeholder="e.g. Audit Standard pricing plans"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Detailed parameters (for LLM context)"
            placeholder="Specify context, required tables, desired margin multipliers, and historical guidelines for autonomous completion..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Deadline date"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />

            <Select
              label="Urgency"
              value={urgency}
              onChange={(e: any) => setUrgency(e.target.value)}
            >
              <option value="low" className="bg-neutral-900">Low Urgency</option>
              <option value="medium" className="bg-neutral-900">Medium Urgency</option>
              <option value="urgent" className="bg-neutral-900">Urgent Beacons</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Delegation Mode"
              value={mode}
              onChange={(e: any) => setMode(e.target.value)}
            >
              <option value="autopilot" className="bg-neutral-900">Autopilot (Auto-Complete)</option>
              <option value="collaborative" className="bg-neutral-900">Collaborative (Needs Check)</option>
              <option value="manual" className="bg-neutral-900">Manual Reminder Only</option>
            </Select>

            <Select
              label="Importance Threshold"
              value={importance}
              onChange={(e: any) => setImportance(e.target.value)}
            >
              <option value="low" className="bg-neutral-900">Low Importance</option>
              <option value="medium" className="bg-neutral-900">Medium Importance</option>
              <option value="high" className="bg-neutral-900">High (Board Critical)</option>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <Checkbox
              label="Needs Automated Mailing / Dispatch"
              checked={needsMail}
              onChange={(e) => setNeedsMail(e.target.checked)}
            />

            {needsMail && (
              <Input
                label="Recipient Email"
                type="email"
                placeholder="e.g. investor@zenithcorp.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              className="font-semibold"
              isLoading={isSubmitting}
            >
              Delegate Task
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
