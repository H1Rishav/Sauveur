import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Download, 
  Shuffle, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  Mic,
  MicOff
} from 'lucide-react';
import { Task } from '../types.js';

interface CalendarPageProps {
  tasks: Task[];
  onRefresh: () => void;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

interface ScheduleBlock {
  id: number;
  task_id: number;
  date: string;
  planned_hours: number;
  task_title: string;
  urgency: string;
  task_status: string;
  importance: string;
  planner_impossible: number;
}

export default function CalendarPage({ tasks, onRefresh, apiFetch }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );
  
  // Reshuffling states
  const [reshuffleTaskId, setReshuffleTaskId] = useState<number | null>(null);
  const [constraintsText, setConstraintsText] = useState<string>('');
  const [isReshuffling, setIsReshuffling] = useState<boolean>(false);
  const [reshuffleStatus, setReshuffleStatus] = useState<{
    success?: boolean;
    impossible?: boolean;
    message?: string;
  } | null>(null);

  // Speech Recognition integration
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize Web Speech API if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setConstraintsText(prev => (prev ? prev + ' ' + resultText : resultText));
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleToggleSpeech = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser environment. Please type your constraints.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
    }
  };

  // Fetch schedule blocks
  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data.blocks || []);
      }
    } catch (err) {
      console.error("Failed to load schedule blocks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [tasks]);

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Group blocks by date
  const blocksByDate = scheduleBlocks.reduce((acc, block) => {
    const dStr = block.date;
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(block);
    return acc;
  }, {} as Record<string, ScheduleBlock[]>);

  // Find deadlines
  const deadlinesByDate = tasks.reduce((acc, t) => {
    if (t.deadline) {
      const dStr = t.deadline.split('T')[0];
      if (!acc[dStr]) acc[dStr] = [];
      acc[dStr].push(t);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  // Perform dynamic reschedule
  const handleReshuffleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reshuffleTaskId || !constraintsText.trim()) return;

    setIsReshuffling(true);
    setReshuffleStatus(null);

    try {
      const res = await apiFetch(`/api/tasks/${reshuffleTaskId}/reshuffle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ constraints: constraintsText })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReshuffleStatus({
          success: true,
          impossible: data.impossible,
          message: data.impossible 
            ? `Warning: ${data.impossibleReason}`
            : `Schedule reshuffled successfully! ${data.roadmap}`
        });
        setConstraintsText('');
        // Reload all data
        fetchSchedule();
        onRefresh();
      } else {
        setReshuffleStatus({
          success: false,
          message: data.error || "Failed to reshuffle schedule."
        });
      }
    } catch (err) {
      console.error("Reshuffle error:", err);
      setReshuffleStatus({
        success: false,
        message: "Network error requesting reschedule."
      });
    } finally {
      setIsReshuffling(false);
    }
  };

  // Helper to trigger standard .ics file download
  const downloadICS = (taskId: number, title: string) => {
    const token = localStorage.getItem('sauveur_token');
    const url = `/api/tasks/${taskId}/ics` + (token ? `?auth=${token}` : '');
    
    // Create temporary link element for authentic download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sauveur_task_${taskId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render calendar cells
  const cells = [];
  // Empty slots for previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(<div key={`empty-${i}`} className="h-24 bg-neutral-900/10 border border-neutral-900/50 opacity-20" />);
  }

  // Active days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    // Standard format YYYY-MM-DD
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dateBlocks = blocksByDate[dateStr] || [];
    const dateDeadlines = deadlinesByDate[dateStr] || [];
    const isSelected = selectedDateStr === dateStr;
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    // Total workload on this day
    const totalHours = dateBlocks.reduce((total, b) => total + b.planned_hours, 0);

    // Impossible schedules highlight
    const hasImpossibleConflict = dateBlocks.some(b => b.planner_impossible === 1);

    cells.push(
      <button
        key={`day-${day}`}
        onClick={() => {
          setSelectedDateStr(dateStr);
          // Set first scheduled task with a deadline for potential reshuffling default
          if (dateBlocks.length > 0) {
            setReshuffleTaskId(dateBlocks[0].task_id);
          } else if (dateDeadlines.length > 0) {
            setReshuffleTaskId(dateDeadlines[0].id);
          } else {
            setReshuffleTaskId(null);
          }
          setReshuffleStatus(null);
        }}
        className={`h-28 p-2 border border-neutral-900 flex flex-col justify-between items-start transition-all duration-200 text-left relative overflow-hidden group ${
          isSelected 
            ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30' 
            : isToday
            ? 'bg-neutral-900/40 border-neutral-800'
            : 'bg-neutral-900/10 hover:bg-neutral-900/30 border-neutral-900/60'
        }`}
      >
        <div className="flex justify-between items-center w-full">
          <span className={`text-xs font-mono font-medium ${
            isToday 
              ? 'text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20' 
              : 'text-neutral-400 group-hover:text-neutral-200'
          }`}>
            {day}
          </span>
          {totalHours > 0 && (
            <span className="text-[10px] font-mono font-semibold bg-neutral-850 px-1.5 py-0.5 rounded text-amber-500 border border-amber-500/10 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {totalHours.toFixed(1)}h
            </span>
          )}
        </div>

        {/* Content indicators inside cell */}
        <div className="w-full space-y-1 mt-1 flex-1 flex flex-col justify-end">
          {hasImpossibleConflict && (
            <div className="text-[8px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded px-1 py-0.5 flex items-center gap-0.5 truncate uppercase">
              <AlertTriangle className="w-2 h-2 shrink-0 animate-pulse text-rose-500" />
              Conflict!
            </div>
          )}

          {dateDeadlines.map(task => (
            <div 
              key={`dl-${task.id}`} 
              className="text-[9px] font-sans bg-rose-950/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-950/60 truncate uppercase font-semibold tracking-wider flex items-center gap-1"
            >
              <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
              DL: {task.title}
            </div>
          ))}

          {dateBlocks.slice(0, 2).map(block => (
            <div 
              key={`block-${block.id}`} 
              className={`text-[9px] font-sans truncate px-1.5 py-0.5 rounded border ${
                block.planner_impossible 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : block.urgency === 'immediate'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
            >
              {block.task_title}
            </div>
          ))}
          
          {dateBlocks.length > 2 && (
            <div className="text-[8px] font-mono text-neutral-500 text-right pr-1">
              +{dateBlocks.length - 2} more
            </div>
          )}
        </div>
      </button>
    );
  }

  // Selected Date details
  const selectedDateBlocks = selectedDateStr ? (blocksByDate[selectedDateStr] || []) : [];
  const selectedDateDeadlines = selectedDateStr ? (deadlinesByDate[selectedDateStr] || []) : [];

  // Get tasks that can be reshuffled (tasks with deadlines that are in progress)
  const schedulableTasks = tasks.filter(t => t.deadline && t.status !== 'completed');

  return (
    <div className="space-y-8" id="calendar-view">
      {/* Visual intro line */}
      <div className="border-b border-neutral-900 pb-5">
        <h1 className="text-2xl font-sans font-medium tracking-tight text-neutral-100 flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-amber-500" />
          The Planner &bull; Schedule Roadmaps
        </h1>
        <p className="text-xs font-mono text-neutral-400 mt-1 max-w-xl">
          SAUVEUR distributes daily hour budgets dynamically to guarantee execution before absolute deadlines. Indicates bottlenecks and re-allocates on voice command.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Grid Calendar Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-neutral-900/30 border border-neutral-900 p-4 rounded-lg">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-100 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-sans font-semibold tracking-wide text-amber-500 uppercase">
              {monthNames[month]} {year}
            </h2>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-100 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-neutral-900/10 border border-neutral-900 rounded-lg p-3">
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-[10px] font-mono text-neutral-500 uppercase py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Days */}
            {isLoading ? (
              <div className="h-80 flex flex-col justify-center items-center gap-3 text-neutral-500 text-xs font-mono">
                <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full" />
                ALIGNING GRAPH MATRIX...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells}
              </div>
            )}
          </div>
          
          {/* Calendar Color Codes */}
          <div className="flex flex-wrap items-center gap-5 text-[10px] font-mono text-neutral-500 pl-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500" />
              Deadline
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/30" />
              Immediate Priority Block
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-neutral-850 border border-neutral-700" />
              Standard Paced Work
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/10 border border-rose-500/40 animate-pulse" />
              Mathematically Impossible Overload
            </div>
          </div>
        </div>

        {/* Sidebar Date Detail & Reshuffle Panel */}
        <div className="space-y-6">
          
          {/* Daily Schedule Blocks details */}
          <div className="bg-neutral-900/30 border border-neutral-900 rounded-lg p-6 space-y-5">
            <div className="border-b border-neutral-850 pb-3">
              <h3 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
                Daily Focus Schedule
              </h3>
              <p className="text-sm font-sans font-bold text-neutral-100 mt-1">
                {selectedDateStr ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select a date'}
              </p>
            </div>

            {selectedDateDeadlines.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-mono text-rose-400 uppercase font-bold tracking-wider">
                  ⚠️ Absolute Deadlines
                </h4>
                {selectedDateDeadlines.map(task => (
                  <div key={task.id} className="bg-rose-950/15 border border-rose-950 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-sans font-bold text-rose-300 uppercase tracking-wide">
                        {task.title}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        Importance: {task.importance.toUpperCase()} &bull; Mode: {task.mode}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadICS(task.id, task.title)}
                      className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 hover:text-white transition-all flex items-center gap-1 text-[10px] font-mono"
                      title="Download .ics import"
                    >
                      <Download className="w-3 h-3" />
                      .ICS
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedDateBlocks.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-neutral-500 border border-dashed border-neutral-850 rounded-lg">
                No active work hours budgeted.
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                  Task Allocations ({selectedDateBlocks.reduce((acc, b) => acc + b.planned_hours, 0).toFixed(1)} hrs total)
                </h4>
                
                {selectedDateBlocks.map(block => (
                  <div 
                    key={block.id} 
                    className={`border rounded-lg p-4 space-y-3 transition-all ${
                      block.planner_impossible
                        ? 'bg-rose-950/10 border-rose-500/30'
                        : 'bg-neutral-900/55 border-neutral-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-xs font-sans font-bold text-neutral-200">
                          {block.task_title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${
                            block.urgency === 'immediate' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-[10px] font-mono text-neutral-400 uppercase">
                            Urgency: {block.urgency}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-neutral-950/60 border border-neutral-800 px-2 py-1 rounded text-right shrink-0">
                        <span className="text-[10px] font-mono text-amber-500 font-bold block">
                          {block.planned_hours.toFixed(1)} HRS
                        </span>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase block mt-0.5">
                          Allocated
                        </span>
                      </div>
                    </div>

                    {block.planner_impossible === 1 && (
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded p-2.5 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <p className="text-[10px] font-mono text-rose-400 font-bold uppercase">
                            Mathematically Impossible Overload
                          </p>
                          <p className="text-[9px] font-sans text-rose-300 mt-0.5 leading-normal">
                            Planner flagged this schedule. Proximity of deadlines and constraints exceeded max cognitive budget limit (12 hrs/day). Run a dynamic reshuffle.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-neutral-850/60 pt-2.5">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        Ref Code: #T{block.task_id}
                      </span>
                      <button
                        onClick={() => downloadICS(block.task_id, block.task_title)}
                        className="text-[10px] font-mono text-neutral-400 hover:text-amber-500 transition-colors flex items-center gap-1 py-1 px-2 rounded hover:bg-neutral-900/60 border border-transparent hover:border-neutral-800"
                      >
                        <Download className="w-3 h-3" />
                        Download .ics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Reshuffle panel */}
          <div className="bg-neutral-900/30 border border-neutral-900 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
                Dynamic Schedule Reshuffle
              </h3>
              <p className="text-[11px] font-sans text-neutral-400 mt-1">
                Tell SAUVEUR which days you are unavailable, and the scheduler agent will dynamically recompute hours to free days.
              </p>
            </div>

            {schedulableTasks.length === 0 ? (
              <div className="py-4 text-center text-xs font-mono text-neutral-500 border border-neutral-850 rounded-lg">
                No active tasks with deadlines to reshuffle.
              </div>
            ) : (
              <form onSubmit={handleReshuffleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                    Target Task Roadmap
                  </label>
                  <select
                    value={reshuffleTaskId || ''}
                    onChange={(e) => {
                      setReshuffleTaskId(Number(e.target.value));
                      setReshuffleStatus(null);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded px-3 py-2 text-xs font-sans text-neutral-200 outline-none transition-all"
                  >
                    <option value="" disabled>Select task to replan</option>
                    {schedulableTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} (DL: {t.deadline?.split('T')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                      Unavailability / Constraints
                    </label>
                    <span className="text-[9px] font-mono text-neutral-500">
                      Supports Text or Speech
                    </span>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={constraintsText}
                      onChange={(e) => setConstraintsText(e.target.value)}
                      placeholder="e.g., 'I am busy on Tuesday', 'I have an event day 2', 'Only 1 hour maximum limit on Monday'"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded pl-3 pr-10 py-2.5 text-xs font-sans text-neutral-200 outline-none transition-all resize-none h-20"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleToggleSpeech}
                      className={`absolute right-2.5 bottom-2.5 p-1.5 rounded border transition-all ${
                        isListening 
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                      }`}
                      title={isListening ? "Listening... click to stop" : "Record unavailability voice command"}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isReshuffling || !reshuffleTaskId || !constraintsText.trim()}
                  className="w-full bg-neutral-950 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 border border-neutral-800 hover:border-amber-500/30 rounded py-2 text-xs font-mono font-medium tracking-wider transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent disabled:text-neutral-500 disabled:border-neutral-800 uppercase"
                >
                  <Shuffle className={`w-3.5 h-3.5 ${isReshuffling ? 'animate-spin' : ''}`} />
                  {isReshuffling ? 'RECOMPUTING TIMELINE...' : 'EXECUTE RESHUFFLE'}
                </button>

                {reshuffleStatus && (
                  <div className={`p-3 rounded-lg border text-xs font-sans leading-normal ${
                    reshuffleStatus.success 
                      ? reshuffleStatus.impossible
                        ? 'bg-amber-500/5 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                  }`}>
                    <div className="flex gap-2">
                      {reshuffleStatus.success ? (
                        reshuffleStatus.impossible ? (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 shrink-0" />
                        )
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      )}
                      <div>
                        <p className="font-bold uppercase text-[9px] font-mono tracking-wider">
                          {reshuffleStatus.success 
                            ? reshuffleStatus.impossible 
                              ? 'Schedule Block Warning' 
                              : 'Reshuffled Successfully'
                            : 'Computation Failed'}
                        </p>
                        <p className="mt-0.5 text-[11px] font-sans">
                          {reshuffleStatus.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
