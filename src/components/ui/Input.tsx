import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-neutral-300 font-sans uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full px-3.5 py-2 bg-neutral-950/60 border ${
            error ? 'border-rose-500/70 focus:ring-rose-500/30' : 'border-neutral-800 focus:ring-amber-500/20'
          } rounded-md text-sm text-neutral-100 placeholder-neutral-500 font-sans focus:outline-none focus:border-amber-500/70 focus:ring-4 transition-all duration-200`}
          {...props}
        />
        {error && (
          <span className="text-xs text-rose-400 font-medium font-sans">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-neutral-300 font-sans uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-3.5 py-2 min-h-[100px] bg-neutral-950/60 border ${
            error ? 'border-rose-500/70 focus:ring-rose-500/30' : 'border-neutral-800 focus:ring-amber-500/20'
          } rounded-md text-sm text-neutral-100 placeholder-neutral-500 font-sans focus:outline-none focus:border-amber-500/70 focus:ring-4 transition-all duration-200`}
          {...props}
        />
        {error && (
          <span className="text-xs text-rose-400 font-medium font-sans">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-neutral-300 font-sans uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-3.5 py-2 bg-neutral-950/60 border ${
            error ? 'border-rose-500/70 focus:ring-rose-500/30' : 'border-neutral-800 focus:ring-amber-500/20'
          } rounded-md text-sm text-neutral-100 font-sans focus:outline-none focus:border-amber-500/70 focus:ring-4 transition-all duration-200 cursor-pointer`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-xs text-rose-400 font-medium font-sans">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className="flex items-center gap-2.5 cursor-pointer group py-1">
        <input
          ref={ref}
          type="checkbox"
          className="w-4.5 h-4.5 rounded text-amber-500 bg-neutral-950 border-neutral-800 focus:ring-amber-500/20 focus:ring-offset-neutral-950 border-2 cursor-pointer transition-colors duration-150"
          {...props}
        />
        <span className="text-sm text-neutral-300 group-hover:text-neutral-100 select-none transition-colors duration-150">
          {label}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
