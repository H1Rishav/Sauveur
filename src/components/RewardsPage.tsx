import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import Badge from './ui/Badge.tsx';
import Button from './ui/Button.tsx';
import { RewardItem } from '../types.ts';
import { 
  Sparkles, 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  Cpu, 
  Lock, 
  Coins, 
  Clock, 
  Coffee, 
  BookOpen, 
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Redemption {
  id: number;
  item_id: string;
  item_name: string;
  cost: number;
  voucher_code: string;
  created_at: string;
}

interface RewardsPageProps {
  ledger: RewardItem[];
  balance: number;
  redemptions?: Redemption[];
  onRedeem?: (itemId: string) => Promise<any>;
}

const STORE_ITEMS = [
  {
    id: "pro_unlock",
    name: "1-Week Pro Unlock",
    description: "Unlock full-speed background agents and priority task dispatching for 1 week.",
    cost: 150,
    type: "Feature Unlock",
    icon: Lock
  },
  {
    id: "action_credits",
    name: "50 Agent Action Credits",
    description: "Refill token quota for immediate high-density autonomous doer operations.",
    cost: 80,
    type: "Quota Refill",
    icon: Coins
  },
  {
    id: "premium_theme",
    name: "Premium 'Cosmic Onyx' Theme",
    description: "A deep, pure carbon aesthetic for late-night focus sessions.",
    cost: 120,
    type: "Theme Preset",
    icon: Sparkles
  },
  {
    id: "streak_freeze",
    name: "Streak Freeze Token",
    description: "Preserve your daily streak and point multiplier even if you skip a day.",
    cost: 50,
    type: "Streak Defense",
    icon: Clock
  },
  {
    id: "cafe_voucher",
    name: "Premium Espresso Voucher",
    description: "Get a free hand-crafted double espresso at our partner cafes.",
    cost: 250,
    type: "Fulfillment Voucher",
    isDemo: true,
    icon: Coffee
  },
  {
    id: "stationery_voucher",
    name: "Classic Moleskine Notebook",
    description: "An elegant, thread-bound pocket notebook delivered to your address.",
    cost: 400,
    type: "Fulfillment Voucher",
    isDemo: true,
    icon: BookOpen
  }
];

export default function RewardsPage({ 
  ledger, 
  balance, 
  redemptions = [], 
  onRedeem 
}: RewardsPageProps) {
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<{ name: string; code: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRedeemClick = async (itemId: string) => {
    if (!onRedeem) return;
    setIsRedeeming(itemId);
    setErrorMsg(null);
    setSuccessCode(null);
    try {
      const data = await onRedeem(itemId);
      if (data && data.success) {
        setSuccessCode({ name: data.itemName, code: data.voucherCode });
      } else if (data && data.error) {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process transaction.");
    } finally {
      setIsRedeeming(null);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div>
        <h1 className="font-sans font-bold text-3xl tracking-tight text-neutral-50">
          Rewards Ledger
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review audit balances and redeem accumulated points for high-density focus tools.
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

      {/* Transaction Notifications (Success/Error modal feedback) */}
      {(successCode || errorMsg) && (
        <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {successCode && (
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">Redemption Confirmed Server-Side</h4>
                <p className="text-xs text-neutral-200">
                  Successfully redeemed <strong>{successCode.name}</strong>. Here is your voucher/license code:
                </p>
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 font-mono text-xs font-bold text-amber-500 rounded select-all w-fit mt-1.5 tracking-wider">
                  {successCode.code}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 italic">
                  *License activated. Physical items indicate launch demo fulfillment.
                </p>
              </div>
            </div>
          )}
          {errorMsg && (
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase text-rose-400 tracking-wider">Transaction Cancelled</h4>
                <p className="text-xs text-neutral-300">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end border-t border-neutral-900 pt-2">
            <button 
              onClick={() => { setSuccessCode(null); setErrorMsg(null); }}
              className="text-xs font-mono font-semibold hover:text-amber-500 text-neutral-400 transition-colors"
            >
              DISMISS NOTIFICATION
            </button>
          </div>
        </div>
      )}

      {/* Redemption Store */}
      <div className="space-y-4">
        <div>
          <h2 className="font-sans font-bold text-xl tracking-tight text-neutral-50 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Redemption Store
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Convert accumulated system dispatches into tangible and digital focus upgrades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const canAfford = balance >= item.cost;
            const ptsNeeded = item.cost - balance;

            return (
              <Card key={item.id} className="relative overflow-hidden flex flex-col justify-between hover:border-neutral-700/80 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-850 text-neutral-400 px-2 py-0.5 rounded uppercase font-semibold">
                      {item.type}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-500 tracking-tight bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
                      {item.cost} PTS
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="p-1.5 bg-neutral-950 border border-neutral-850 rounded text-amber-500">
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-neutral-100 font-sans tracking-tight">
                      {item.name}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-neutral-300 leading-relaxed pt-1">
                    {item.description}
                  </CardDescription>
                  {item.isDemo && (
                    <p className="text-[9px] font-mono text-amber-500/80 mt-1.5 uppercase tracking-wide">
                      (Demo — partner fulfillment at launch)
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0 pb-4">
                  {canAfford ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full text-xs py-1.5 font-semibold text-neutral-950 font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                      onClick={() => handleRedeemClick(item.id)}
                      isLoading={isRedeeming === item.id}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Redeem upgrade
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full text-xs py-1.5 font-semibold font-mono border-neutral-850 text-neutral-500 bg-neutral-950/40"
                      >
                        Insufficient points
                      </Button>
                      <p className="text-[9px] font-mono text-center text-rose-400/80 uppercase tracking-wider">
                        Locked (Points gap: -{ptsNeeded} pts)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Redemptions History */}
      {redemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Redeemed Upgrades History</CardTitle>
            <CardDescription>Records of licenses and gift keys issued to this identity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-normal">Item Redeemed</th>
                    <th className="py-3 px-4 font-normal">License / Voucher Code</th>
                    <th className="py-3 px-4 font-normal">Points Cost</th>
                    <th className="py-3 px-4 font-normal text-right">Redeemed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-sans text-neutral-300">
                  {redemptions.map((red) => (
                    <tr key={red.id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="py-4 px-4 font-medium text-neutral-200">
                        {red.item_name}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-amber-500 select-all">
                        {red.voucher_code}
                      </td>
                      <td className="py-4 px-4 font-mono text-rose-400 font-semibold">
                        -{red.cost} pts
                      </td>
                      <td className="py-4 px-4 font-mono text-neutral-500 text-right">
                        {new Date(red.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                              REDEMPTION
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
