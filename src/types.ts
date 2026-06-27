export interface User {
  id: number;
  name: string;
  email: string;
  isDemo: boolean;
}

export type TaskStatus = 'pending' | 'scheduled' | 'active' | 'completed' | 'human_check';
export type TaskUrgency = 'low' | 'medium' | 'urgent';
export type TaskMode = 'autopilot' | 'manual' | 'collaborative';
export type TaskImportance = 'low' | 'medium' | 'high';

export interface Artifact {
  id: number;
  task_id: number;
  type: 'email_draft' | 'pdf' | 'code_patch' | 'summary';
  file_ref: string;
  created_at: string;
}

export interface ScheduleBlock {
  id: number;
  task_id: number;
  date: string;
  planned_hours: number;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  status: TaskStatus;
  urgency: TaskUrgency;
  mode: TaskMode;
  requires_human_check: boolean;
  needs_mail: boolean;
  recipient_email: string | null;
  importance: TaskImportance;
  created_at: string;
  artifacts?: Artifact[];
  scheduleBlocks?: ScheduleBlock[];
}

export interface HabitProfile {
  focusHours: [number, number];
  pace: 'deliberate' | 'aggressive';
  riskTolerance: 'conservative' | 'aggressive';
  communication: 'editorial' | 'concise' | 'formal';
  workStyle: string;
}

export interface RewardItem {
  id: number;
  user_id: number;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

export interface AgentAction {
  id: number;
  user_id: number;
  agent: 'The Doer' | 'The Planner' | 'The Profiler' | 'The Strategist';
  action: string;
  status: 'perceiving' | 'reasoning' | 'acting' | 'verifying' | 'completed' | 'failed';
  payload: {
    phase: string;
    perceive: string;
    reason: string;
    act: string;
    verify: string;
  };
  created_at: string;
}
