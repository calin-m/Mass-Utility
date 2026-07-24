import React from 'react';
import { ShieldCheck, Activity, Lock, Cpu } from 'lucide-react';

export const SecurityHealthTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-pm-secondary uppercase">API Security Guard</div>
            <div className="text-lg font-bold text-pm-text">HEALTHY</div>
          </div>
        </div>

        <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-pm-secondary uppercase">Token Cryptography</div>
            <div className="text-lg font-bold text-pm-text">AES-256</div>
          </div>
        </div>

        <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-pm-secondary uppercase">Session Integrity</div>
            <div className="text-lg font-bold text-pm-text">VERIFIED</div>
          </div>
        </div>
      </div>
    </div>
  );
};
