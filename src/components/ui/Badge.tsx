import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'calm' | 'warning' | 'urgent' | 'info';
  className?: string;
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const styles = {
    neutral: "bg-neutral-800/80 text-neutral-300 border border-neutral-700/60",
    calm: "bg-emerald-950/40 text-emerald-300 border border-emerald-900/50",
    warning: "bg-amber-950/40 text-amber-300 border border-amber-900/50",
    urgent: "bg-rose-950/40 text-rose-300 border border-rose-900/50",
    info: "bg-sky-950/40 text-sky-300 border border-sky-900/50"
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
