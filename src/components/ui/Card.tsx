import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`mb-4 flex flex-col gap-1 border-b border-neutral-800/60 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: CardProps) {
  return (
    <h3 className={`font-sans font-semibold text-lg text-neutral-50 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }: CardProps) {
  return (
    <p className={`text-xs text-neutral-400 font-sans tracking-wide leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`text-sm text-neutral-300 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`mt-6 pt-4 border-t border-neutral-800/40 flex items-center justify-end gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
