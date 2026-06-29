import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.js';
import AuthPage from './components/AuthPage.js';
import Layout from './components/Layout.js';
import Dashboard from './components/Dashboard.js';
import TasksPage from './components/TasksPage.js';
import CalendarPage from './components/CalendarPage.js';
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
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'calendar' | 'activity' | 'rewards' | 'settings'>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [ledger, setLedger] = useState<RewardItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [proactiveAlerts, setProactiveAlerts] = useState<any[]>([]);
  const [habitProfile, setHabitProfile] = useState<Partial<HabitProfile>>({});
  const [tick, setTick] = useState<number>(0);

  // Helper for authenticated fetch requests supporting both cookies and JWT Authorization headers
  const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = localStorage.getItem('sauveur_token');
    const headers = {
      ...(init?.headers || {}),
    } as any;
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    });
  };

  // Check authentication session on load
  const checkAuth = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('sauveur_token');
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
      const [tasksRes, actionsRes, rewardsRes, settingsRes, redemptionsRes, alertsRes] = await Promise.all([
        apiFetch('/api/tasks'),
        apiFetch('/api/agent-activity'),
        apiFetch('/api/rewards'),
        apiFetch('/api/settings'),
        apiFetch('/api/rewards/redemptions'),
        apiFetch('/api/proactive-alerts')
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
      if (redemptionsRes.ok) {
        const d = await redemptionsRes.json();
        setRedemptions(d.redemptions || []);
      }
      if (alertsRes.ok) {
        const d = await alertsRes.json();
        setProactiveAlerts(d.alerts || []);
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

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
      fetchAllData();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Auth Submit Handlers
  const handleAuthSubmit = async (formData: any, type: 'login' | 'signup') => {
    setIsActionLoading(true);
    try {
      const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('sauveur_token', data.token);
        }
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
      const res = await apiFetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('sauveur_token', data.token);
        }
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
      const res = await apiFetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('sauveur_token');
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
      const res = await apiFetch('/api/tasks', {
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
      const res = await apiFetch(`/api/tasks/${taskId}/toggle-mode`, { method: 'POST' });
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

  // Update Task Handler
  const handleUpdateTask = async (taskId: number, taskData: any): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast("Task updated successfully.", "success");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Failed to update task.", "error");
        return false;
      }
    } catch (err) {
      console.error("Update task failed:", err);
      toast("Connection error saving task edits.", "error");
      return false;
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast("Task deleted permanently.", "info");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Failed to delete task.", "error");
        return false;
      }
    } catch (err) {
      console.error("Delete task failed:", err);
      toast("Connection error deleting task.", "error");
      return false;
    }
  };

  // Toggle Task Completion Handler
  const handleToggleComplete = async (taskId: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/toggle-complete`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        const msg = data.status === 'completed' 
          ? "Task marked complete. +50 PTS ledger entry recorded." 
          : "Task reverted to pending.";
        toast(msg, "success");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Failed to toggle status.", "error");
        return false;
      }
    } catch (err) {
      console.error("Toggle complete failed:", err);
      toast("Connection error toggling completeness.", "error");
      return false;
    }
  };

  // Approve Human Check Handler
  const handleApproveTask = async (taskId: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/approve`, { method: 'POST' });
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
      const res = await apiFetch('/api/settings', {
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

  // Clear Completed History Handler
  const handleClearCompleted = async (): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/tasks/clear-completed', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast("Completed history cleared permanently.", "success");
        fetchAllData();
        return true;
      } else {
        toast(data.error || "Failed to clear completed history.", "error");
        return false;
      }
    } catch (err) {
      console.error("Clear completed failed:", err);
      toast("Connection error clearing history.", "error");
      return false;
    }
  };

  // Undo Agent Action Handler
  const handleUndoAction = async (actionId: number) => {
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/agent-activity/${actionId}/undo`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(data.message || "Action successfully undone.", "success");
        fetchAllData();
      } else {
        toast(data.error || "Failed to process undo request.", "error");
      }
    } catch (err) {
      console.error("Undo failed:", err);
      toast("Communication breakdown with undo engine.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Resolve Proactive Alert Handler
  const handleResolveAlert = async (alertId: number) => {
    try {
      const res = await apiFetch(`/api/proactive-alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        setProactiveAlerts(prev => prev.filter(a => a.id !== alertId));
        toast("Risk notification cleared.", "success");
      }
    } catch (err) {
      console.error("Resolve alert failed:", err);
    }
  };

  // Momentum Mode Jumpstart Handler
  const handleMomentumStart = async (taskId: number) => {
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/momentum-start`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(data.message || "Momentum starter file compiled! Break the blank page.", "success");
        fetchAllData();
      } else {
        toast(data.error || "Failed to initiate Momentum Mode.", "error");
      }
    } catch (err) {
      console.error("Momentum failed:", err);
      toast("Error communicating with momentum engine.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Redemptions Purchase Handler
  const handleRedeem = async (itemId: string) => {
    try {
      const res = await apiFetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Successfully redeemed ${data.itemName}!`, "success");
        fetchAllData();
        return data;
      } else {
        toast(data.error || "Failed to redeem item.", "error");
        return data;
      }
    } catch (err) {
      console.error("Redemption failed:", err);
      toast("Error processing transaction.", "error");
      return { error: "Network communication error." };
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
          proactiveAlerts={proactiveAlerts}
          onResolveAlert={handleResolveAlert}
          onMomentumStart={handleMomentumStart}
          onChangeTab={setActiveTab}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          onToggleMode={handleToggleMode}
          onApproveTask={handleApproveTask}
          onClearCompleted={handleClearCompleted}
          apiFetch={apiFetch}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksPage
          tasks={tasks}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          onToggleMode={handleToggleMode}
          onApproveTask={handleApproveTask}
          onClearCompleted={handleClearCompleted}
          onMomentumStart={handleMomentumStart}
          isLoading={isActionLoading}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarPage
          tasks={tasks}
          onRefresh={fetchAllData}
          apiFetch={apiFetch}
        />
      )}

      {activeTab === 'activity' && (
        <AgentActivityPage
          actions={actions}
          onUndo={handleUndoAction}
        />
      )}

      {activeTab === 'rewards' && (
        <RewardsPage
          ledger={ledger}
          balance={balance}
          redemptions={redemptions}
          onRedeem={handleRedeem}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          initialProfile={habitProfile}
          userName={user.name}
          userEmail={user.email}
          onSaveSettings={handleSaveSettings}
          onRefreshProfile={fetchAllData}
          apiFetch={apiFetch}
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
