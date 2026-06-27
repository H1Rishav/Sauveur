import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal.tsx';
import { Input, Textarea, Select, Checkbox } from './ui/Input.tsx';
import Button from './ui/Button.tsx';
import { Task } from '../types.ts';
import { useToast } from './ui/Toast.tsx';
import VoiceMicButton from './VoiceMicButton.tsx';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => Promise<boolean>;
  task?: Task | null; // If passed, we are editing
}

export default function TaskFormModal({ isOpen, onClose, onSubmit, task }: TaskFormModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [needsMail, setNeedsMail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [requiresHumanCheck, setRequiresHumanCheck] = useState(false);
  
  // Custom mode selector string
  // Values: 'manual' | 'collaborative' | 'autopilot_mail'
  const [modeSelection, setModeSelection] = useState<'manual' | 'collaborative' | 'autopilot_mail'>('collaborative');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize/Reset form when task or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setDeadline(task.deadline ? task.deadline.substring(0, 16) : ''); // Format for datetime-local
        setImportance(task.importance || 'medium');
        setNeedsMail(task.needs_mail || false);
        setRecipientEmail(task.recipient_email || '');
        setRequiresHumanCheck(task.requires_human_check || false);
        
        // Map stored mode and needs_mail to custom mode selection
        if (task.mode === 'manual') {
          setModeSelection('manual');
        } else if (task.mode === 'autopilot' && task.needs_mail) {
          setModeSelection('autopilot_mail');
        } else {
          setModeSelection('collaborative');
        }
      } else {
        // Reset defaults
        setTitle('');
        setDescription('');
        setDeadline('');
        setImportance('medium');
        setNeedsMail(false);
        setRecipientEmail('');
        setRequiresHumanCheck(false);
        setModeSelection('collaborative');
      }
    }
  }, [isOpen, task]);

  // Handle Mode Selection Change and auto-sync other logical dependencies
  const handleModeChange = (val: 'manual' | 'collaborative' | 'autopilot_mail') => {
    setModeSelection(val);
    if (val === 'autopilot_mail') {
      setNeedsMail(true);
      setRequiresHumanCheck(false);
    } else if (val === 'collaborative') {
      setRequiresHumanCheck(true);
    } else {
      setNeedsMail(false);
      setRequiresHumanCheck(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 2) {
      toast("Task title must be at least 2 characters.", "error");
      return;
    }
    if (needsMail && (!recipientEmail.trim() || !recipientEmail.includes('@'))) {
      toast("Please provide a valid recipient email address for dispatches.", "error");
      return;
    }

    setIsSubmitting(true);

    // Map custom selections back to standard DB model
    let finalMode: 'manual' | 'collaborative' | 'autopilot' = 'collaborative';
    if (modeSelection === 'manual') finalMode = 'manual';
    if (modeSelection === 'autopilot_mail') finalMode = 'autopilot';

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      importance,
      mode: finalMode,
      needs_mail: needsMail ? 1 : 0,
      recipient_email: needsMail ? recipientEmail.trim() : null,
      requires_human_check: requiresHumanCheck ? 1 : 0,
      status: task ? task.status : 'pending' // Preserve status when editing
    };

    const success = await onSubmit(payload);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={task ? "Optimize Task Parameters" : "Delegate New Companion Task"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        <Input
          label="Task Title"
          type="text"
          placeholder="e.g. Draft zenith renewal contract"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-neutral-300 font-sans uppercase tracking-wider">
              Context Guidelines
            </label>
            <VoiceMicButton 
              onTranscriptReady={(text) => setDescription(prev => prev ? `${prev} ${text}` : text)}
              className="h-7 w-7 !p-1 text-xs"
              placeholder="Dictate task context by voice"
            />
          </div>
          <Textarea
            placeholder="Specify exact target margin metrics, context constraints, and files for the companion multi-agent system..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Deadline Date & Time"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <Select
            label="Importance Threshold"
            value={importance}
            onChange={(e: any) => setImportance(e.target.value)}
          >
            <option value="low" className="bg-neutral-900">Low Importance</option>
            <option value="medium" className="bg-neutral-900">Medium Importance</option>
            <option value="high" className="bg-neutral-900">High (Critical)</option>
          </Select>
        </div>

        {/* Mode Selector Option Cards */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-neutral-300 font-sans uppercase tracking-wider">
            Execution Mode Selector
          </label>
          <div className="grid grid-cols-1 gap-2">
            
            {/* Manual option */}
            <div 
              onClick={() => handleModeChange('manual')}
              className={`p-3 rounded border cursor-pointer transition-all duration-150 ${
                modeSelection === 'manual' 
                  ? 'border-amber-500 bg-amber-500/5 text-neutral-100' 
                  : 'border-neutral-800 bg-neutral-950/25 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold font-sans">Just remind me — I'll do it</span>
                <input 
                  type="radio" 
                  name="modeSel" 
                  checked={modeSelection === 'manual'} 
                  onChange={() => {}} 
                  className="accent-amber-500"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Acts as a passive checklist reminder with alerts on focus slot calendars. No active drafts created.
              </p>
            </div>

            {/* Collaborative option */}
            <div 
              onClick={() => handleModeChange('collaborative')}
              className={`p-3 rounded border cursor-pointer transition-all duration-150 ${
                modeSelection === 'collaborative' 
                  ? 'border-amber-500 bg-amber-500/5 text-neutral-100' 
                  : 'border-neutral-800 bg-neutral-950/25 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold font-sans">Agent does the work</span>
                <input 
                  type="radio" 
                  name="modeSel" 
                  checked={modeSelection === 'collaborative'} 
                  onChange={() => {}} 
                  className="accent-amber-500"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                The Doer builds email drafts, aggregates spreadsheet lists, and writes summaries in background threads.
              </p>
            </div>

            {/* Autopilot mail option */}
            <div 
              onClick={() => handleModeChange('autopilot_mail')}
              className={`p-3 rounded border cursor-pointer transition-all duration-150 ${
                modeSelection === 'autopilot_mail' 
                  ? 'border-amber-500 bg-amber-500/5 text-neutral-100' 
                  : 'border-neutral-800 bg-neutral-950/25 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold font-sans">Agent does the work AND mails it</span>
                <input 
                  type="radio" 
                  name="modeSel" 
                  checked={modeSelection === 'autopilot_mail'} 
                  onChange={() => {}} 
                  className="accent-amber-500"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Complete autopilot execution. The companion compiles information, certifies compliance, and emails recipients directly.
              </p>
            </div>

          </div>
        </div>

        {/* Extra Toggles Section */}
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <Checkbox
            label="Needs Automated Mailing / Dispatch?"
            checked={needsMail}
            onChange={(e) => {
              setNeedsMail(e.target.checked);
              if (!e.target.checked && modeSelection === 'autopilot_mail') {
                setModeSelection('collaborative');
              }
            }}
          />

          {needsMail && (
            <div className="space-y-1">
              <Input
                label="Recipient Email Address"
                type="email"
                placeholder="e.g. investor@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required={needsMail}
              />
              <p className="text-[10px] font-mono text-neutral-500 italic pl-1">
                Note: SAUVEUR sends this on your behalf from its own automated server mailbox.
              </p>
            </div>
          )}

          <Checkbox
            label="Requires my review before final submission? (Human Lock)"
            checked={requiresHumanCheck}
            onChange={(e) => {
              setRequiresHumanCheck(e.target.checked);
              if (e.target.checked && modeSelection === 'autopilot_mail') {
                setModeSelection('collaborative');
              }
            }}
          />
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <Button 
            type="button" 
            variant="outline" 
            size="md" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            size="md"
            className="font-semibold"
            isLoading={isSubmitting}
          >
            {task ? "Save Parameters" : "Delegate Task"}
          </Button>
        </div>

      </form>
    </Modal>
  );
}
