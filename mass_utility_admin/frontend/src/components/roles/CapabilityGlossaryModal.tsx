// @Arch[CapabilityGlossaryModal]
import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { BaseDrawer } from '../common/BaseDrawer';
import { RbacPermission } from '../../types/adminApi';

interface CapabilityGlossaryModalProps {
  isOpen: boolean;
  permissions: RbacPermission[];
  onClose: () => void;
}

export const CapabilityGlossaryModal: React.FC<CapabilityGlossaryModalProps> = ({
  isOpen,
  permissions,
  onClose
}) => {
  const [search, setSearch] = useState('');

  const filteredPerms = permissions.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      p.slug.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.group_name && p.group_name.toLowerCase().includes(q))
    );
  });

  // Group permissions by group_name
  const grouped = filteredPerms.reduce((acc: Record<string, RbacPermission[]>, p) => {
    const group = p.group_name || 'General System';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});

  return (
    <BaseDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Capability Definition Registry"
      subtitle="Interactive search dictionary of RBAC capabilities across Mass Utility"
      icon={BookOpen}
      width="2xl"
    >
      <div className="space-y-5">
        {/* Search input bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-pm-secondary" />
          <input
            type="text"
            placeholder="Search capability by name, slug, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-pm-input border border-pm-border rounded-xl pl-10 pr-4 py-2 text-xs text-pm-text placeholder:text-pm-secondary/60 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-pm-secondary bg-pm-input/20 border border-pm-border rounded-xl">
            <p className="text-xs">No matching capability permissions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, groupPerms]) => (
              <div key={groupName} className="space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-2 pb-1 border-b border-pm-border/50">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  {groupName} ({groupPerms.length})
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {groupPerms.map(p => (
                    <div key={p.slug} className="p-4 bg-pm-input/30 border border-pm-border hover:border-purple-500/40 rounded-xl space-y-2 transition-all group">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-xs text-pm-text group-hover:text-purple-300 transition-colors">{p.name || p.slug}</span>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                          {p.slug}
                        </span>
                      </div>
                      <p className="text-[11px] text-pm-secondary leading-relaxed">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseDrawer>
  );
};
