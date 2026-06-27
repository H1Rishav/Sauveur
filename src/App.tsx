import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.js';
import AuthPage from './components/AuthPage.js';
import Layout from './components/Layout.js';
import Dashboard from './components/Dashboard.js';
import TasksPage from './components/TasksPage.js';
import AgentActivityPage from './components/AgentActivityPage.js';
import RewardsPage from './components/RewardsPage.js';
import SettingsPage from './components/SettingsPage.js';
import { ToastProvider, useToast } from './components/ui/Toast.js';
import { User, Task, AgentAction, RewardItem, HabitProfile } from './types.js';

function MainApp() {
  const { toast } = useToast();
  
  // Auth states
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authFormView, setAuthFormView] = useState<'landing' | 'login' | 'signup'>('landing');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // App core states
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'activity' | 'rewards' | 'settings'>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [ledger, setLedger] = useState<RewardItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [habitProfile, setHabitProfile] = useState<Partial<HabitProfile>>({});

  // Check authentication session on load
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch all app data when logged in
  const fetchAllData = async () => {
    if (!user) return;
    try {
      const [tasksRes, actionsRes, rewardsRes, settingsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/agent-activity'),
        fetch('/api/rewards'),
        fetch('/api/settings')
      ]);

      if (tasksRes.ok) {
        const d = await tasksRes.json();
        setTasks(d.tasks || []);
      }
      if (actionsRes.ok) {
        const d = await actionsRes.json();
        setActions(d.actions || []);
      }
      if (rewardsRes.ok) {
        const d = await rewardsRes.json();
        setLedger(d.ledger || []);
        setBalance(d.balance || 0);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setHabitProfile(d.profile || {});
      }
    } catch (err) {
      console.error("Error loading application data:", err);
      toast("Sync failed: could not fetch latest database states.", "error");
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, activeTab]);

  // Auth Submit Handlers
  const handleAuthSubmit = async (formData: any, type: 'login' | 'signup') => {
    setIsActionLoading(true);
    try {
      const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        toast(type === 'login' ? `Welcome back, ${data.user.name}.` : "Account created successfully.", "success");
        setAuthFormView('landing');
      } else {
        toast(data.error || "An authentication error occurred.", "error");
      }
    } catch (err) {
      console.error("Auth submit failed:", err);
      toast("Network connection error. Please try again.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Demo entry guest bypass
  const handleEnterDemo = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        toast("Entering sandbox with Demo Profile. Full database access unlocked.", "success");
        setAuthFormView('landing');
      } else {
        toast(data.error || "Could not spin up demo profile.", "error");
      }
    } catch (err) {
      console.error("Demo login fail:", err);
      toast("Database or session error.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        setActiveTab('home');
        toast("Session ended safely.", "success");
      }
    } catch (err) {
      console.error("Logout failed:", err);
      toast("Error terminating session.", "error");
    }
  };

  // Add Task Handler
  const handleAddTask = async (taskData: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Task delegated. The Planner has scheduled your blocks.`, "success");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Failed to delegate task.", "error");
        return false;
      }
    } catch (err) {
      console.error("Add task failed:", err);
      toast("Connection error saving task.", "error");
      return false;
    }
  };

  // Toggle Mode Handler
  const handleToggleMode = async (taskId: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/toggle-mode`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Autopilot delegation changed to ${data.mode}.`, "info");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Error updating mode.", "error");
        return false;
      }
    } catch (err) {
      console.error("Toggle mode failed:", err);
      toast("Connection error.", "error");
      return false;
    }
  };

  // Approve Human Check Handler
  const handleApproveTask = async (taskId: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast("Artifact verified, approved, and dispatched. Points credited.", "success");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Could not approve task.", "error");
        return false;
      }
    } catch (err) {
      console.error("Approve task failed:", err);
      toast("Connection error.", "error");
      return false;
    }
  };

  // Save Settings / Profile Handler
  const handleSaveSettings = async (settingsData: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Could not update settings.", "error");
        return false;
      }
    } catch (err) {
      console.error("Save settings failed:", err);
      toast("Connection error.", "error");
      return false;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center gap-4 text-neutral-100 font-sans">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        <span className="text-xs font-mono text-neutral-500 tracking-widest uppercase animate-pulse">
          SECURING SYNERGY MATRIX...
        </span>
      </div>
    );
  }

  // Auth pages logic
  if (!user) {
    if (authFormView === 'login' || authFormView === 'signup') {
      return (
        <AuthPage
          initialView={authFormView}
          onBack={() => setAuthFormView('landing')}
          onSubmit={handleAuthSubmit}
          onEnterDemo={handleEnterDemo}
          isLoading={isActionLoading}
        />
      );
    }
    return (
      <LandingPage
        onNavigate={(view) => setAuthFormView(view)}
        onEnterDemo={handleEnterDemo}
        isLoggingIn={isActionLoading}
      />
    );
  }

  // Authed App view mapping
  return (
    <Layout
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
    >
      {activeTab === 'home' && (
        <Dashboard
          tasks={tasks}
          actions={actions}
          rewardsBalance={balance}
          onChangeTab={setActiveTab}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksPage
          tasks={tasks}
          onAddTask={handleAddTask}
          onToggleMode={handleToggleMode}
          onApproveTask={handleApproveTask}
          isLoading={isActionLoading}
        />
      )}

      {activeTab === 'activity' && (
        <AgentActivityPage
          actions={actions}
        />
      )}

      {activeTab === 'rewards' && (
        <RewardsPage
          ledger={ledger}
          balance={balance}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          initialProfile={habitProfile}
          userName={user.name}
          userEmail={user.email}
          onSaveSettings={handleSaveSettings}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
