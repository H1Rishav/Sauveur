import React from 'react';
import Logo from './ui/Logo.js';
import { User } from '../types.js';
import { 
  Home, 
  CheckSquare, 
  Activity, 
  Award, 
  Settings, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'tasks' | 'activity' | 'rewards' | 'settings';
  onChangeTab: (tab: 'home' | 'tasks' | 'activity' | 'rewards' | 'settings') => void;
  user: User;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, onChangeTab, user, onLogout }: LayoutProps) {
  const menuItems = [
    { id: 'home', label: 'Home / Dashboard', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'activity', label: 'Agent Activity', icon: Activity },
    { id: 'rewards', label: 'Rewards Ledger', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row font-sans selection:bg-amber-500/30 selection:text-neutral-50">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 shrink-0 bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col justify-between">
        
        {/* Top brand */}
        <div className="p-6 border-b border-neutral-800/80">
          <Logo />
        </div>

        {/* Menu list */}
        <nav className="flex-1 p-4 space-y-1.5 py-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded text-sm font-sans font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-500' : 'text-neutral-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Identity section */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/40">
          <div className="flex items-center gap-3 px-3 py-2 bg-neutral-950/40 rounded-lg border border-neutral-800/60 mb-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700/50 shrink-0">
              <UserIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-200 truncate leading-snug">
                {user.name}
              </p>
              <p className="text-[10px] font-mono text-neutral-400 truncate tracking-tight">
                {user.email}
              </p>
            </div>
            {user.isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase font-semibold">
                Demo
              </span>
            )}
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-950/40 hover:bg-rose-950/20 text-xs font-mono font-medium text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-950/60 rounded transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            TERMINATE SESSION
          </button>
        </div>

      </aside>

      {/* Main container area */}
      <main className="flex-1 min-w-0 bg-neutral-950 flex flex-col">
        {/* Top informational header */}
        <header className="px-8 py-5 border-b border-neutral-900/60 bg-neutral-900/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              SAUVEUR SECURE NETWORK ONLINE
            </span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500">
            LOC: UTC-07:00 &bull; SESSION ID: {user.isDemo ? 'DEMO_BYPASS' : 'SECURE_SSL'}
          </div>
        </header>

        {/* Content body wrapper */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}
