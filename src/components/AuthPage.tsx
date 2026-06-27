import React, { useState } from 'react';
import Logo from './ui/Logo.js';
import { Input } from './ui/Input.js';
import Button from './ui/Button.js';
import { ArrowLeft, KeyRound, UserPlus } from 'lucide-react';

interface AuthPageProps {
  initialView: 'login' | 'signup';
  onBack: () => void;
  onSubmit: (data: any, type: 'login' | 'signup') => void;
  onEnterDemo: () => void;
  isLoading: boolean;
}

export default function AuthPage({ initialView, onBack, onSubmit, onEnterDemo, isLoading }: AuthPageProps) {
  const [view, setView] = useState<'login' | 'signup'>(initialView);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Signup State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupErrors, setSignupErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateLogin = () => {
    const errors: { email?: string; password?: string } = {};
    if (!loginEmail.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      errors.email = "Please specify a valid email address.";
    }
    if (!loginPassword) {
      errors.password = "Password is required.";
    }
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignup = () => {
    const errors: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};
    
    if (!signupName.trim()) {
      errors.name = "Full name is required.";
    }
    if (!signupEmail.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
      errors.email = "Please specify a valid email address.";
    }
    if (!signupPassword) {
      errors.password = "Password is required.";
    } else if (signupPassword.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (signupConfirmPassword !== signupPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    onSubmit({ email: loginEmail, password: loginPassword }, 'login');
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    onSubmit({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword
    }, 'signup');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-6 py-12">
      
      {/* Back to landing */}
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-neutral-100 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        BACK
      </button>

      {/* Main card */}
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <Logo className="mb-3" />
          <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase">
            {view === 'login' ? 'COMPANION GATEWAY' : 'INITIALIZE SYSTEM'}
          </p>
        </div>

        {view === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="e.g. companion@sauveur.ai"
              value={loginEmail}
              onChange={(e) => {
                setLoginEmail(e.target.value);
                if (loginErrors.email) setLoginErrors(prev => ({ ...prev, email: undefined }));
              }}
              error={loginErrors.email}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                if (loginErrors.password) setLoginErrors(prev => ({ ...prev, password: undefined }));
              }}
              error={loginErrors.password}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 font-semibold"
              isLoading={isLoading}
            >
              Log in
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-neutral-800" />
              <span className="flex-shrink mx-4 text-neutral-500 text-[10px] font-mono tracking-wider uppercase">OR</span>
              <div className="flex-grow border-t border-neutral-800" />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full border border-neutral-700/60"
              isLoading={isLoading}
              onClick={onEnterDemo}
            >
              Enter with Demo Profile
            </Button>

            <p className="text-xs text-center text-neutral-400 mt-6 font-sans">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setView('signup')}
                className="text-amber-500 hover:underline font-semibold"
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          /* SIGNUP FORM */
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="e.g. Alexandre Mercier"
              value={signupName}
              onChange={(e) => {
                setSignupName(e.target.value);
                if (signupErrors.name) setSignupErrors(prev => ({ ...prev, name: undefined }));
              }}
              error={signupErrors.name}
              autoComplete="name"
            />

            <Input
              label="Email address"
              type="email"
              placeholder="e.g. alexandre@sauveur.ai"
              value={signupEmail}
              onChange={(e) => {
                setSignupEmail(e.target.value);
                if (signupErrors.email) setSignupErrors(prev => ({ ...prev, email: undefined }));
              }}
              error={signupErrors.email}
              autoComplete="email"
            />

            <Input
              label="Password (min 8 chars)"
              type="password"
              placeholder="••••••••"
              value={signupPassword}
              onChange={(e) => {
                setSignupPassword(e.target.value);
                if (signupErrors.password) setSignupErrors(prev => ({ ...prev, password: undefined }));
              }}
              error={signupErrors.password}
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={signupConfirmPassword}
              onChange={(e) => {
                setSignupConfirmPassword(e.target.value);
                if (signupErrors.confirmPassword) setSignupErrors(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              error={signupErrors.confirmPassword}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 font-semibold"
              isLoading={isLoading}
            >
              Sign up
            </Button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-800" />
              <span className="flex-shrink mx-4 text-neutral-500 text-[10px] font-mono tracking-wider uppercase">OR</span>
              <div className="flex-grow border-t border-neutral-800" />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full border border-neutral-700/60"
              isLoading={isLoading}
              onClick={onEnterDemo}
            >
              Enter with Demo Profile
            </Button>

            <p className="text-xs text-center text-neutral-400 mt-5 font-sans">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-amber-500 hover:underline font-semibold"
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </div>

    </div>
  );
}
