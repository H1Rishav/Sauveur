import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.js';
import { Select, Input } from './ui/Input.js';
import Button from './ui/Button.js';
import { useToast } from './ui/Toast.js';
import { HabitProfile } from '../types.js';
import { Sliders, Sparkles, User, ShieldAlert } from 'lucide-react';

interface SettingsPageProps {
  initialProfile: Partial<HabitProfile>;
  userName: string;
  userEmail: string;
  onSaveSettings: (settingsData: any) => Promise<boolean>;
}

export default function SettingsPage({ initialProfile, userName, userEmail, onSaveSettings }: SettingsPageProps) {
  const { toast } = useToast();
  const [pace, setPace] = useState(initialProfile.pace || 'deliberate');
  const [riskTolerance, setRiskTolerance] = useState(initialProfile.riskTolerance || 'conservative');
  const [communication, setCommunication] = useState(initialProfile.communication || 'editorial');
  const [workStyle, setWorkStyle] = useState(initialProfile.workStyle || 'focused');
  
  const [focusHoursStart, setFocusHoursStart] = useState(
    initialProfile.focusHours ? String(initialProfile.focusHours[0]) : '9'
  );
  const [focusHoursEnd, setFocusHoursEnd] = useState(
    initialProfile.focusHours ? String(initialProfile.focusHours[1]) : '17'
  );
  
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial values when they load
  useEffect(() => {
    if (initialProfile.pace) setPace(initialProfile.pace);
    if (initialProfile.riskTolerance) setRiskTolerance(initialProfile.riskTolerance);
    if (initialProfile.communication) setCommunication(initialProfile.communication);
    if (initialProfile.workStyle) setWorkStyle(initialProfile.workStyle);
    if (initialProfile.focusHours) {
      setFocusHoursStart(String(initialProfile.focusHours[0]));
      setFocusHoursEnd(String(initialProfile.focusHours[1]));
    }
  }, [initialProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const success = await onSaveSettings({
      pace,
      riskTolerance,
      communication,
      workStyle,
      focusHoursStart: parseInt(focusHoursStart),
      focusHoursEnd: parseInt(focusHoursEnd)
    });

    setIsSaving(false);
    if (success) {
      toast("Habit settings saved. The Profiler has indexed your work styles.", "success");
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
          Settings & Profiler
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Adjust parameters, communication styles, and boundary limits for agent delegation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave}>
            <Card className="space-y-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  Habit & Boundary Settings
                </CardTitle>
                <CardDescription>
                  These parameters guide the Planner when designing schedules and the Doer when draft documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Operational Tempo / Pace"
                    value={pace}
                    onChange={(e: any) => setPace(e.target.value)}
                  >
                    <option value="deliberate" className="bg-neutral-900">Deliberate & Verified (Slower, highly cautious)</option>
                    <option value="aggressive" className="bg-neutral-900">Aggressive Autonomous (Rapid completion drafts)</option>
                  </Select>

                  <Select
                    label="Risk Tolerance"
                    value={riskTolerance}
                    onChange={(e: any) => setRiskTolerance(e.target.value)}
                  >
                    <option value="conservative" className="bg-neutral-900">Conservative (Check pricing, emails twice)</option>
                    <option value="aggressive" className="bg-neutral-900">Aggressive (Auto-dispatch minor artifacts)</option>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Document Communication Style"
                    value={communication}
                    onChange={(e: any) => setCommunication(e.target.value)}
                  >
                    <option value="editorial" className="bg-neutral-900">Editorial & Refined (Warm and structured)</option>
                    <option value="concise" className="bg-neutral-900">Concise & Direct (Brief updates, key statistics)</option>
                    <option value="formal" className="bg-neutral-900">Formal & Corporate (Board and legal ready)</option>
                  </Select>

                  <Select
                    label="Default Work Style"
                    value={workStyle}
                    onChange={(e: any) => setWorkStyle(e.target.value)}
                  >
                    <option value="focused" className="bg-neutral-900">Deep Focus Blocks (2.5 hr uninterrupted slots)</option>
                    <option value="split" className="bg-neutral-900">Split Intervals (45m sprint + review)</option>
                    <option value="relaxed" className="bg-neutral-900">Relaxed Boundaries (Shorter blocks, spread out)</option>
                  </Select>
                </div>

                <div className="border-t border-neutral-800/60 pt-5">
                  <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-4">Focus Hour Interval Bounds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Day Start Hour (24h)"
                      type="number"
                      min="0"
                      max="23"
                      value={focusHoursStart}
                      onChange={(e) => setFocusHoursStart(e.target.value)}
                    />
                    <Input
                      label="Day End Hour (24h)"
                      type="number"
                      min="0"
                      max="23"
                      value={focusHoursEnd}
                      onChange={(e) => setFocusHoursEnd(e.target.value)}
                    />
                  </div>
                </div>

              </CardContent>
              <div className="p-6 border-t border-neutral-800 flex justify-end">
                <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={isSaving}
                  className="font-semibold"
                >
                  Save settings
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Sidebar Info Panels */}
        <div className="space-y-6">
          
          {/* User profile details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-amber-500" />
                Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase">FULL NAME</span>
                <p className="text-sm text-neutral-200 font-semibold">{userName}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase">EMAIL ADDRESS</span>
                <p className="text-sm text-neutral-200 font-semibold">{userEmail}</p>
              </div>
              <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 font-sans leading-relaxed">
                Authored data and keys are encrypted at-rest inside our secure database file storage containers.
              </div>
            </CardContent>
          </Card>

          {/* Profiler Intelligence Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                The Profiler Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-400 leading-relaxed space-y-3 font-sans">
              <p>
                The Profiler agent continuously parses your settings to optimize tasks scheduled by the Planner.
              </p>
              <p>
                If you choose <span className="text-amber-400 font-semibold">Aggressive Autonomous</span>, minor tasks can complete in background cycles without asking for your permission first, instantly updating the ledger.
              </p>
              <div className="p-3 bg-neutral-950 rounded border border-neutral-800/80 flex gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-neutral-500 font-mono">
                  RISK CRITERIA: When risk tolerance is conservative, high impact budget or pricing tasks will ALWAYS require human approval before mailing.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
