import React, { useState, useEffect, useRef } from 'react';
import Badge from './ui/Badge.tsx';
import Button from './ui/Button.tsx';
import { Task } from '../types.ts';
import { 
  Calendar, 
  Mail, 
  FileText, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Edit, 
  Trash2, 
  AlertOctagon,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Sparkles,
  Loader2,
  File,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import VoiceMicButton from './VoiceMicButton.tsx';

// Deadline warning color-coding utility
export function getDeadlineWarning(deadlineStr: string | null): {
  colorClass: string;
  badgeVariant: 'calm' | 'warning' | 'urgent';
  text: string;
} {
  if (!deadlineStr) {
    return {
      colorClass: 'border-neutral-800 bg-neutral-900/40 text-neutral-400',
      badgeVariant: 'calm',
      text: 'No deadline'
    };
  }
  const deadlineDate = new Date(deadlineStr);
  if (isNaN(deadlineDate.getTime())) {
    return {
      colorClass: 'border-neutral-800 bg-neutral-900/40 text-neutral-400',
      badgeVariant: 'calm',
      text: 'No deadline'
    };
  }
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    // Overdue -> urgent red
    const absHours = Math.abs(diffHours);
    let overdueText = 'Overdue';
    if (absHours < 24) {
      overdueText = `Overdue by ${Math.floor(absHours)}h`;
    } else {
      overdueText = `Overdue by ${Math.floor(absHours / 24)}d`;
    }
    return {
      colorClass: 'border-rose-500/40 bg-rose-950/20 text-rose-300 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)]',
      badgeVariant: 'urgent',
      text: overdueText
    };
  }

  if (diffHours < 6) {
    // Urgent Under 6 hours -> urgent red
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const hours = Math.floor(diffHours);
    return {
      colorClass: 'border-rose-500/30 bg-rose-950/10 text-rose-300',
      badgeVariant: 'urgent',
      text: `Due in ${hours}h ${mins}m`
    };
  }

  if (diffHours < 24) {
    // Under 24 hours -> amber
    const hours = Math.floor(diffHours);
    return {
      colorClass: 'border-amber-500/30 bg-amber-950/10 text-amber-400',
      badgeVariant: 'warning',
      text: `Due in ${hours}h`
    };
  }

  if (diffHours < 72) {
    // Under 3 days -> amber
    const days = Math.floor(diffHours / 24);
    const hours = Math.floor(diffHours % 24);
    return {
      colorClass: 'border-amber-500/20 bg-neutral-900/50 text-neutral-300',
      badgeVariant: 'warning',
      text: `Due in ${days}d ${hours}h`
    };
  }

  // More than 3 days -> calm green
  const days = Math.floor(diffHours / 24);
  return {
    colorClass: 'border-emerald-500/25 bg-emerald-950/5 text-emerald-400',
    badgeVariant: 'calm',
    text: `Due in ${days}d`
  };
}

interface TaskCardProps {
  key?: any;
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => any;
  onToggleComplete: (taskId: number) => any;
  onToggleMode: (taskId: number) => any;
  onApproveTask: (taskId: number) => any;
  onMomentumStart?: (taskId: number) => any;
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onToggleMode,
  onApproveTask,
  onMomentumStart
}: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const deadlineInfo = getDeadlineWarning(task.deadline);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // The Doer Workspace States
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ filename: string; mimeType: string; base64: string } | null>(null);
  const [isSubmittingDoer, setIsSubmittingDoer] = useState(false);
  const [activeAction, setActiveAction] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email Draft Review States
  const [emailDraft, setEmailDraft] = useState<{
    recipient: string;
    subject: string;
    body: string;
    status: string;
  } | null>(null);
  const [isDraftEditing, setIsDraftEditing] = useState(false);
  const [editedRecipient, setEditedRecipient] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // Fetch email draft if review gate is active
  useEffect(() => {
    if (task.needs_mail && task.status === 'human_check') {
      const fetchDraft = async () => {
        try {
          const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const res = await fetch(`/api/tasks/${task.id}/email-draft`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.draft) {
              setEmailDraft(data.draft);
              setEditedRecipient(data.draft.recipient);
              setEditedSubject(data.draft.subject);
              setEditedBody(data.draft.body);
            }
          }
        } catch (err) {
          console.error("Failed to load email draft:", err);
        }
      };
      fetchDraft();
    } else {
      setEmailDraft(null);
    }
  }, [task.status, task.id, task.needs_mail]);

  // Poll agent actions while task is active (working)
  useEffect(() => {
    let interval: any;
    if (task.status === 'active') {
      const fetchStatus = async () => {
        try {
          const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const res = await fetch(`/api/tasks/${task.id}/actions`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.action) {
              setActiveAction(data.action);
            }
          }
        } catch (err) {
          console.error("Failed to poll agent actions:", err);
        }
      };

      fetchStatus();
      interval = setInterval(fetchStatus, 1500);
    } else {
      setActiveAction(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [task.status, task.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File exceeds maximum size of 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachedFile({
        filename: file.name,
        mimeType: file.type,
        base64
      });
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerDoer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDoer(true);

    try {
      const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/tasks/${task.id}/do`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instructions,
          file: attachedFile
        })
      });

      if (!res.ok) {
        throw new Error("Failed to trigger agent");
      }

      setInstructions('');
      setAttachedFile(null);
      setWorkspaceOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delegate task run to The Doer.");
    } finally {
      setIsSubmittingDoer(false);
    }
  };

  const handleDownloadArtifact = async (artifactId: number, filename: string) => {
    try {
      const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/artifacts/${artifactId}/download`, { headers });
      if (!res.ok) {
        throw new Error("Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Artifact download failed:", err);
      alert("Could not download compiled artifact.");
    }
  };

  return (
    <div 
      className={`relative p-5 rounded-lg border transition-all duration-300 flex flex-col justify-between h-full bg-neutral-900/60 hover:bg-neutral-900/90 hover:border-neutral-700/80 ${
        isCompleted 
          ? 'border-neutral-800 text-neutral-400 opacity-75' 
          : deadlineInfo.colorClass
      }`}
      id={`task-card-${task.id}`}
    >
      {isConfirmingDelete && (
        <div className="absolute inset-0 bg-neutral-950/95 border border-rose-500/50 rounded-lg p-5 flex flex-col justify-between z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold font-mono text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" /> Permanent Deletion
            </h4>
            <p className="text-sm text-neutral-200 font-sans font-medium">
              Delete this task?
            </p>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              This action cannot be undone. It is permanently expunged from all active queues and archive logs.
            </p>
          </div>
          <div className="flex gap-2.5 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 font-mono text-xs border-neutral-850 hover:bg-neutral-900"
              onClick={() => setIsConfirmingDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="flex-1 font-mono text-xs bg-rose-600 hover:bg-rose-500 text-neutral-50 border-none"
              onClick={async () => {
                await onDelete(task.id);
                setIsConfirmingDelete(false);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}

      <div>
        {/* Badges / Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={
              isCompleted ? 'calm' : deadlineInfo.badgeVariant
            }>
              {isCompleted ? 'Completed' : deadlineInfo.text}
            </Badge>
            <Badge variant={task.importance === 'high' ? 'urgent' : task.importance === 'medium' ? 'warning' : 'calm'}>
              {task.importance} imp
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded text-neutral-400 hover:text-amber-500 hover:bg-neutral-850 transition-all"
              title="Edit task parameters"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-neutral-850 transition-all"
              title="Delete task permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => onToggleComplete(task.id)}
              className={`p-0.5 rounded transition-all shrink-0 mt-0.5 ${
                isCompleted 
                  ? 'text-amber-500 hover:text-neutral-400' 
                  : 'text-neutral-500 hover:text-amber-500'
              }`}
              title={isCompleted ? "Mark incomplete" : "Mark complete"}
            >
              <CheckCircle className={`w-5 h-5 ${isCompleted ? 'fill-amber-500/20' : 'text-neutral-600'}`} />
            </button>
            <h3 className={`text-base font-semibold font-sans tracking-tight leading-snug ${
              isCompleted ? 'line-through text-neutral-500 font-medium' : 'text-neutral-50'
            }`}>
              {task.title}
            </h3>
          </div>
          {task.description && (
            <p className="text-xs text-neutral-400 leading-relaxed font-sans pl-7.5 pt-0.5 whitespace-pre-line">
              {task.description}
            </p>
          )}
        </div>

        {/* Info Rows */}
        <div className="flex flex-wrap gap-x-4 gap-y-2.5 pt-4 pl-7.5 text-xs font-mono text-neutral-400">
          {task.deadline && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>{new Date(task.deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          )}
          {task.needs_mail && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-neutral-500" />
              <span className="truncate max-w-[150px]" title={task.recipient_email || ''}>
                {task.recipient_email}
              </span>
            </div>
          )}
          {task.requires_human_check && (
            <div className="flex items-center gap-1.5 text-amber-500/80">
              <Clock className="w-3.5 h-3.5" />
              <span>Requires Review</span>
            </div>
          )}
        </div>

        {/* Autopilot toggle */}
        <div className="mt-4.5 pt-3 border-t border-neutral-800/50 pl-7.5 flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>Delegation Status</span>
          <button
            onClick={() => onToggleMode(task.id)}
            className="hover:text-amber-500 transition-colors"
            title="Toggle autonomous delegation mode"
          >
            {task.mode === 'autopilot' ? (
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <span>AUTOPILOT</span>
                <ToggleRight className="w-5 h-5 shrink-0" />
              </div>
            ) : task.mode === 'collaborative' ? (
              <div className="flex items-center gap-1 text-sky-400 font-semibold">
                <span>COLLABORATIVE</span>
                <ToggleRight className="w-5 h-5 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-1 text-neutral-400">
                <span>MANUAL REMINDER</span>
                <ToggleLeft className="w-5 h-5 shrink-0" />
              </div>
            )}
          </button>
        </div>

        {/* Momentum Mode paralysis breaker */}
        {!isCompleted && task.status !== 'active' && onMomentumStart && (
          <div className="mt-3 ml-7.5">
            <button
              type="button"
              onClick={() => onMomentumStart(task.id)}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gradient-to-r from-amber-950/40 to-neutral-900 border border-amber-500/20 hover:border-amber-500/50 rounded-md text-xs font-mono text-amber-500 hover:text-amber-400 font-semibold transition-all shadow-sm cursor-pointer"
              title="Activate Momentum Mode to auto-generate a 10-minute starter kit and break procrastination."
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse animate-duration-1000" />
              <span>START FIRST 10 MINUTES WITH ME</span>
            </button>
          </div>
        )}

        {/* "The Doer" Command Workspace Panel */}
        {!isCompleted && (task.mode === 'collaborative' || task.mode === 'autopilot') && task.status !== 'active' && (
          <div className="mt-3 ml-7.5">
            <button
              type="button"
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="flex items-center justify-between w-full px-3 py-2 bg-neutral-950/35 border border-neutral-850 hover:border-neutral-700/80 rounded-md text-xs font-mono text-neutral-300 hover:text-amber-500 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>COMMAND THE DOER</span>
              </div>
              {workspaceOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {workspaceOpen && (
              <form onSubmit={handleTriggerDoer} className="mt-2.5 p-3.5 bg-neutral-950/70 border border-neutral-850 rounded-md space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Instructions</label>
                    <VoiceMicButton 
                      onTranscriptReady={(text) => setInstructions(prev => prev ? `${prev} ${text}` : text)}
                      className="h-6 w-6 !p-1 text-[10px]"
                      placeholder="Dictate run requirements"
                    />
                  </div>
                  <textarea
                    placeholder="Describe what needs to be generated or analyzed (Word, notes, PDF, CSV, slides...)"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded text-xs text-neutral-200 placeholder-neutral-500 font-sans focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/10 min-h-[60px]"
                  />
                </div>

                {/* File Attachment Drag and Drop Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">File Attachments</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950/50 hover:bg-neutral-900/30 p-3 rounded text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mx-auto text-neutral-500 mb-1" />
                    <p className="text-[10px] text-neutral-400">Drag & drop or <span className="text-amber-500 underline">browse</span> files</p>
                    <p className="text-[8px] text-neutral-500 mt-0.5">Supports images, CSVs, PDFs, Docs (Max 10MB)</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept=".png,.jpg,.jpeg,.gif,.csv,.xlsx,.docx,.pdf,.txt,.json,.md,.pptx"
                    />
                  </div>

                  {attachedFile && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-mono text-neutral-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <File className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{attachedFile.filename}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setAttachedFile(null)}
                        className="text-rose-400 hover:text-rose-300 transition-colors font-sans text-xs font-bold pl-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full text-xs py-1.5 font-semibold text-neutral-950 font-mono"
                    isLoading={isSubmittingDoer}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Run The Doer Autonomous Job
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Polling Live Active Action Tracker Panel */}
        {task.status === 'active' && activeAction && (
          <div className="mt-4 ml-7.5 p-3.5 bg-neutral-950/80 border border-amber-500/10 rounded-lg space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest font-bold">The Doer is executing...</span>
              </div>
              <span className="text-[9px] font-mono text-neutral-500">{activeAction.payload?.phase || 'Queued'}</span>
            </div>

            {/* Perceive -> Reason -> Act -> Verify Stepper Grid */}
            <div className="grid grid-cols-4 gap-1 text-center text-[8px] font-mono text-neutral-500">
              <div className={`p-1.5 rounded transition-all border ${
                activeAction.status === 'perceiving' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold' 
                  : ['reasoning', 'acting', 'verifying', 'completed'].includes(activeAction.status)
                  ? 'text-emerald-400 border-emerald-500/10 font-semibold'
                  : 'bg-neutral-900 border-neutral-850'
              }`}>
                {['reasoning', 'acting', 'verifying', 'completed'].includes(activeAction.status) ? "✓ PERCEIVE" : "PERCEIVE"}
              </div>
              <div className={`p-1.5 rounded transition-all border ${
                activeAction.status === 'reasoning' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold' 
                  : ['acting', 'verifying', 'completed'].includes(activeAction.status)
                  ? 'text-emerald-400 border-emerald-500/10 font-semibold'
                  : 'bg-neutral-900 border-neutral-850'
              }`}>
                {['acting', 'verifying', 'completed'].includes(activeAction.status) ? "✓ REASON" : "REASON"}
              </div>
              <div className={`p-1.5 rounded transition-all border ${
                activeAction.status === 'acting' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold' 
                  : ['verifying', 'completed'].includes(activeAction.status)
                  ? 'text-emerald-400 border-emerald-500/10 font-semibold'
                  : 'bg-neutral-900 border-neutral-850'
              }`}>
                {['verifying', 'completed'].includes(activeAction.status) ? "✓ ACT" : "ACT"}
              </div>
              <div className={`p-1.5 rounded transition-all border ${
                activeAction.status === 'verifying' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold' 
                  : activeAction.status === 'completed'
                  ? 'text-emerald-400 border-emerald-500/10 font-semibold'
                  : 'bg-neutral-900 border-neutral-850'
              }`}>
                {activeAction.status === 'completed' ? "✓ VERIFY" : "VERIFY"}
              </div>
            </div>

            {/* Current log summary */}
            <div className="text-[10px] text-neutral-300 bg-neutral-900/40 p-2 rounded border border-neutral-850/50 leading-relaxed font-sans">
              {activeAction.status === 'perceiving' && activeAction.payload?.perceive}
              {activeAction.status === 'reasoning' && activeAction.payload?.reason}
              {activeAction.status === 'acting' && activeAction.payload?.act}
              {activeAction.status === 'verifying' && activeAction.payload?.verify}
              {activeAction.status === 'completed' && activeAction.payload?.verify}
            </div>
          </div>
        )}

        {/* Compiled Artifacts Segment */}
        {task.artifacts && task.artifacts.length > 0 && (
          <div className="mt-4 ml-7.5 p-3 bg-neutral-950/50 border border-neutral-850 rounded">
            <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>COMPILED ARTIFACTS</span>
            </p>
            <div className="space-y-1.5">
              {task.artifacts.map((art) => (
                <div key={art.id} className="flex items-center gap-2 text-xs font-sans text-neutral-200">
                  <FileText className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                  <span 
                    onClick={() => handleDownloadArtifact(art.id, art.file_ref)}
                    className="font-medium underline truncate hover:text-amber-400 cursor-pointer text-neutral-100 transition-colors"
                    title="Click to download artifact"
                  >
                    {art.file_ref}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500">({art.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The Planner Roadmap Summary */}
        {task.planner_roadmap && (
          <div className="mt-4 ml-7.5 p-3.5 bg-neutral-950/40 border border-neutral-850 rounded-lg space-y-1.5">
            <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>THE PLANNER ROADMAP</span>
            </p>
            <p className="text-xs font-sans text-neutral-300 leading-relaxed">
              {task.planner_roadmap}
            </p>
            {task.planner_impossible === 1 && (
              <div className="text-[9px] font-mono text-rose-400 bg-rose-500/5 border border-rose-500/20 px-2 py-1.5 rounded flex items-center gap-1.5 mt-2 animate-pulse">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="font-semibold uppercase tracking-wide">Bottleneck Warning: Mathematically Impossible Conflict</span>
              </div>
            )}
          </div>
        )}

        {/* The Email Draft Human Gate Review Console */}
        {emailDraft && task.status === 'human_check' && (
          <div className="mt-4 ml-7.5 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-3.5">
            <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  SAUVEUR Prepared Email Dispatch Draft
                </span>
              </div>
              <span className="text-[8px] font-mono text-neutral-500 px-1.5 py-0.5 bg-neutral-900 rounded uppercase">
                Awaiting Human Gate Review
              </span>
            </div>

            {isDraftEditing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-neutral-400 uppercase">To Recipient</label>
                  <input
                    type="email"
                    value={editedRecipient}
                    onChange={(e) => setEditedRecipient(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-neutral-400 uppercase">Subject</label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-neutral-400 uppercase">Body</label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none min-h-[100px] resize-y"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsDraftEditing(false)}
                    className="px-2.5 py-1 text-[10px] font-mono border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
                        const res = await fetch(`/api/tasks/${task.id}/email-draft/edit`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                          },
                          body: JSON.stringify({
                            recipient: editedRecipient,
                            subject: editedSubject,
                            body: editedBody
                          })
                        });
                        if (res.ok) {
                          setEmailDraft({
                            recipient: editedRecipient,
                            subject: editedSubject,
                            body: editedBody,
                            status: 'draft'
                          });
                          setIsDraftEditing(false);
                        } else {
                          const data = await res.json();
                          alert(data.error || "Failed to update draft.");
                        }
                      } catch (err) {
                        console.error("Save draft fail:", err);
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition-all"
                  >
                    Save Edits
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs font-sans">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block font-bold">Recipient:</span>
                  <span className="text-neutral-300 font-mono text-[11px]">{emailDraft.recipient}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block font-bold">Subject Line:</span>
                  <span className="text-neutral-200 font-semibold">{emailDraft.subject}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block font-bold">Message Body:</span>
                  <div className="bg-neutral-950/55 border border-neutral-850/65 rounded p-3 text-neutral-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                    {emailDraft.body}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/10">
                  <button
                    type="button"
                    onClick={() => setIsDraftEditing(true)}
                    className="px-3 py-1.5 text-[10px] font-mono border border-neutral-800 text-neutral-300 hover:text-amber-500 hover:border-amber-500/30 rounded flex items-center gap-1.5 transition-all"
                  >
                    <Edit className="w-3 h-3" />
                    Edit Email Draft
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to cancel and delete this email draft?")) return;
                      try {
                        const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
                        const res = await fetch(`/api/tasks/${task.id}/email-draft/cancel`, {
                          method: 'POST',
                          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                        });
                        if (res.ok) {
                          setEmailDraft(null);
                        }
                      } catch (err) {
                        console.error("Cancel draft error:", err);
                      }
                    }}
                    className="px-3 py-1.5 text-[10px] font-mono border border-neutral-800 text-rose-400 hover:bg-rose-950/15 rounded flex items-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-3 h-3" />
                    Discard Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Action Buttons for Incomplete Tasks */}
      {!isCompleted && task.status !== 'active' && task.status !== 'human_check' && (
        <div className="mt-4.5 pt-3 border-t border-neutral-800/40 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleComplete(task.id)}
            className="text-xs font-semibold py-1 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5 transition-all font-mono w-full sm:w-auto"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Mark Complete
          </Button>
        </div>
      )}

      {/* Special Verification & Approval Block */}
      {task.status === 'human_check' && (
        <div className="mt-5 ml-7.5 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex gap-2 min-w-0">
            <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-neutral-300 font-sans leading-snug">
              <span className="font-semibold text-amber-400">Action Required:</span> {task.needs_mail ? "Review and release the prepared email dispatch." : "Review and authorize final delivery signoff."}
            </p>
          </div>
          <Button 
            variant="primary" 
            size="sm"
            className="font-semibold shrink-0 w-full sm:w-auto mt-1 sm:mt-0 text-xs py-1"
            onClick={() => onApproveTask(task.id)}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Approve & Dispatch
          </Button>
        </div>
      )}
    </div>
  );
}
