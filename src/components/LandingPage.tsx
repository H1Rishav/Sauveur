import React from 'react';
import Logo from './ui/Logo.js';
import Button from './ui/Button.js';
import { ShieldCheck, Cpu, Compass, Sliders, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'login' | 'signup' | 'demo') => void;
  onEnterDemo: () => void;
  isLoggingIn: boolean;
}

export default function LandingPage({ onNavigate, onEnterDemo, isLoggingIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-neutral-50">
      
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-neutral-900">
        <Logo />
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('login')}
            className="text-sm font-sans font-medium text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            Log In
          </button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigate('signup')}
          >
            Sign Up
          </Button>
        </div>
      </header>

      {/* Main Hero & Presentation */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto">
        {/* Beacon alert label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-full text-xs font-mono text-amber-500 mb-8 animate-pulse">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          THE AGE OF AUTONOMOUS ASSISTANCE
        </div>

        {/* Headline */}
        <h1 className="font-sans font-bold text-4xl sm:text-6xl tracking-tight text-neutral-50 mb-6 leading-[1.1]">
          The agent companion that <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
            completes and schedules
          </span> <br />
          your work for you.
        </h1>

        {/* Subhead */}
        <p className="font-sans text-neutral-400 text-base sm:text-lg max-w-2xl mb-12 leading-relaxed">
          SAUVEUR is a premium focus system operating behind a four-agent core. It continuously schedules, adapts, drafts, and dispatches files—intervening only when verification warrants a human check.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full mb-20">
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full sm:w-auto font-semibold"
            onClick={() => onNavigate('signup')}
          >
            Create your account
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full sm:w-auto border border-neutral-700/60"
            isLoading={isLoggingIn}
            onClick={onEnterDemo}
          >
            Try the demo profile
          </Button>
        </div>

        {/* 4 Agent Thesis Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full text-left pt-12 border-t border-neutral-900">
          
          <div className="p-5 bg-neutral-900/40 border border-neutral-900 rounded-lg">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-semibold text-sm text-neutral-100 mb-2">The Doer</h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Synthesizes reports, writes mock documents, and executes drafts based on historical patterns.
            </p>
          </div>

          <div className="p-5 bg-neutral-900/40 border border-neutral-900 rounded-lg">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-semibold text-sm text-neutral-100 mb-2">The Planner</h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Dynamically slots calendar blocks and spreads tasks evenly inside your biological energy limits.
            </p>
          </div>

          <div className="p-5 bg-neutral-900/40 border border-neutral-900 rounded-lg">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-semibold text-sm text-neutral-100 mb-2">The Profiler</h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Observes skips and habits, quietly adapting notification levels and core operational tempos.
            </p>
          </div>

          <div className="p-5 bg-neutral-900/40 border border-neutral-900 rounded-lg">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-semibold text-sm text-neutral-100 mb-2">The Strategist</h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Analyzes risk curves and prompts human overrides when confidence criteria falls below thresholds.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-8 text-center border-t border-neutral-900 text-neutral-500 text-xs font-mono">
        SAUVEUR FOCUS PLATFORM &copy; 2026 &bull; ALL RIGHTS RESERVED
      </footer>

    </div>
  );
}
