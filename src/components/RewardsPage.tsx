import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.js';
import Badge from './ui/Badge.js';
import { RewardItem } from '../types.js';
import { Sparkles, ArrowDownRight, ArrowUpRight, TrendingUp, Cpu } from 'lucide-react';

interface RewardsPageProps {
  ledger: RewardItem[];
  balance: number;
}

export default function RewardsPage({ ledger, balance }: RewardsPageProps) {
  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div>
        <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
          Rewards Ledger
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review audit balances accumulated from autonomous workflow dispatches.
        </p>
      </div>

      {/* Points summary banner card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Card className="md:col-span-2 bg-gradient-to-r from-neutral-900 via-neutral-900/40 to-amber-950/20 hover:border-amber-500/20 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              Autonomous Dispatch Incentives
            </CardTitle>
            <CardDescription>
              Each task completed on Autopilot or approved through Human check triggers positive point increments. Optimization routines trigger tiny CPU token charges.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-sans font-bold text-neutral-50 tracking-tight">
                {balance}
              </span>
              <span className="text-xs font-mono font-bold text-amber-500 tracking-widest uppercase">
                CREDITED TO SYSTEM
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider font-mono text-neutral-400">Ledger Metrics</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Positive earnings:</span>
              <span className="text-emerald-400 font-semibold font-mono">
                +{ledger.filter(item => item.delta > 0).reduce((sum, item) => sum + item.delta, 0)} pts
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-neutral-800 pt-3">
              <span className="text-neutral-400">Optimization costs:</span>
              <span className="text-rose-400 font-semibold font-mono">
                {ledger.filter(item => item.delta < 0).reduce((sum, item) => sum + item.delta, 0)} pts
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-neutral-800 pt-3">
              <span className="text-neutral-400">Total transaction count:</span>
              <span className="text-neutral-200 font-semibold font-mono">
                {ledger.length} entries
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Ledger lists */}
      <Card>
        <CardHeader>
          <CardTitle>System Ledgers Audit</CardTitle>
          <CardDescription>Chronological sequence of credits and debits indexed to this identity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-normal">Transaction Type</th>
                  <th className="py-3 px-4 font-normal">Reason / Audit Trail</th>
                  <th className="py-3 px-4 font-normal">Delta</th>
                  <th className="py-3 px-4 font-normal">Running Balance</th>
                  <th className="py-3 px-4 font-normal text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans text-neutral-300">
                {ledger.map((item) => {
                  const isPositive = item.delta > 0;
                  return (
                    <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 font-mono uppercase text-[9px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5" />
                              CREDIT
                            </>
                          ) : (
                            <>
                              <Cpu className="w-3.5 h-3.5" />
                              OPTIMIZATION
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-neutral-200">
                        {item.reason}
                      </td>
                      <td className={`py-4 px-4 font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{item.delta}
                      </td>
                      <td className="py-4 px-4 font-mono text-neutral-400">
                        {item.balance_after} pts
                      </td>
                      <td className="py-4 px-4 font-mono text-neutral-500 text-right">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-500 font-mono">
                      No points registered inside this ledger.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
