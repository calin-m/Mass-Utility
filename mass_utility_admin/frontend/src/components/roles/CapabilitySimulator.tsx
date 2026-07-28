// @Arch[CapabilitySimulator]
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Check, Key, Users as UsersIcon } from 'lucide-react';
import { RbacPermission, UserAccount, License } from '../../types/adminApi';

interface CapabilitySimulatorProps {
  users: UserAccount[];
  licenses: License[];
  permissions: RbacPermission[];
  simUserEmail: string;
  simTierSlug: string;
  simulatedCapabilities: string[];
  selectedSimUserObj?: UserAccount;
  selectedSimUserLic?: License | null;
  onUserEmailChange: (email: string) => void;
  onTierSlugChange: (tier: string) => void;
}

export const CapabilitySimulator: React.FC<CapabilitySimulatorProps> = ({
  users,
  licenses,
  permissions,
  simUserEmail,
  simTierSlug,
  simulatedCapabilities,
  selectedSimUserObj,
  selectedSimUserLic,
  onUserEmailChange,
  onTierSlugChange
}) => {
  const [showLicenseKey, setShowLicenseKey] = useState(false);

  // Helper to mask key: MASS-2026-••••-••••-8A2F
  const formatKey = (key?: string) => {
    if (!key) return 'No License Assigned';
    if (showLicenseKey) return key;
    if (key.length <= 10) return '••••••••••••';
    const parts = key.split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-${parts[1]}-••••-••••-${parts[parts.length - 1]}`;
    }
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  };

  return (
    <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-indigo-400" /> Live Effective Capability Simulator
        </h3>
        <p className="text-[11px] text-pm-secondary mt-0.5">
          Simulate exact effective capabilities granted to a client user after applying Role Perms ∩ License Tier Ceiling.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-pm-input/30 border border-pm-border rounded-xl">
        <div>
          <label className="block text-xs font-bold text-pm-secondary mb-1 flex items-center gap-1">
            <UsersIcon className="w-3.5 h-3.5 text-indigo-400" /> Select Client User:
          </label>
          <select
            value={simUserEmail}
            onChange={e => onUserEmailChange(e.target.value)}
            className="w-full bg-pm-card border border-pm-border rounded-xl px-3 py-2 text-xs text-pm-text font-bold cursor-pointer"
          >
            {users.map(u => (
              <option key={u.id} value={u.email}>
                {u.email} (Role: {u.role || 'Observer'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-pm-secondary mb-1 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-indigo-400" /> Store License Tier Ceiling:
          </label>
          <select
            value={simTierSlug}
            onChange={e => onTierSlugChange(e.target.value)}
            className="w-full bg-pm-card border border-pm-border rounded-xl px-3 py-2 text-xs text-pm-text font-bold cursor-pointer"
          >
            <option value="basic">Basic Tier (ast.query, db.backup, files.backup)</option>
            <option value="pro">Pro Tier (ast.query, ast.mutate, db.backup, db.restore, files.backup)</option>
            <option value="enterprise">Enterprise Tier (Full Capabilities)</option>
            <option value="developer">Developer Tier (Full Capabilities)</option>
          </select>
        </div>
      </div>

      {selectedSimUserObj && (
        <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-pm-text">Selected User:</span>
            <span className="font-mono text-indigo-400 font-bold">{selectedSimUserObj.email}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
              {selectedSimUserObj.role || 'Observer'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-pm-secondary">
            <span>Assigned License Key:</span>
            <span className="font-mono text-pm-text font-bold bg-pm-card px-2 py-0.5 rounded border border-pm-border flex items-center gap-1.5">
              {formatKey(selectedSimUserLic?.license_key)}
              {selectedSimUserLic?.license_key && (
                <button
                  type="button"
                  onClick={() => setShowLicenseKey(!showLicenseKey)}
                  title={showLicenseKey ? "Hide License Key" : "Show License Key"}
                  className="text-pm-secondary hover:text-pm-text transition cursor-pointer"
                >
                  {showLicenseKey ? <EyeOff className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-pm-input text-pm-text border border-pm-border">
              {simTierSlug.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <div className="border border-pm-border rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
              <th className="p-3.5">Capability Permission</th>
              <th className="p-3.5 text-center">Effective Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pm-border">
            {permissions.map(p => {
              const isGranted = simulatedCapabilities.includes(p.slug);
              return (
                <tr key={p.slug} className="hover:bg-pm-input/30 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                    <div className="text-[10px] text-pm-secondary">{p.description}</div>
                  </td>
                  <td className="p-3.5 text-center align-middle">
                    {isGranted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                        <Check className="w-3.5 h-3.5" /> Granted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pm-input text-pm-secondary/50 font-semibold text-[11px]">
                        <Lock className="w-3 h-3" /> Restricted
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
