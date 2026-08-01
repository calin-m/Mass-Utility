// @Arch[DemoSimulatorBanner]
import React from 'react';

export interface DemoSimulatorBannerProps {
  darkMode: boolean;
  currentUserRole?: string;
  onRoleSimulate?: (roleName: string) => void;
}

export const demoRoleCapabilities: Record<string, string[]> = {
  SuperAdmin: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.diff', 'file.browse', 'file.backup', 'sweeper.execute', 'security.audit', 'settings.update', 'users.manage'],
  CompanyAdmin: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.diff', 'file.browse', 'file.backup', 'sweeper.execute', 'security.audit', 'settings.update'],
  CatalogManager: ['ast.query', 'ast.mutate', 'file.browse', 'history'],
  Operator: ['ast.query', 'file.browse', 'history'],
  Observer: ['ast.query'],
};

export const DemoSimulatorBanner: React.FC<DemoSimulatorBannerProps> = ({
  darkMode,
  currentUserRole,
  onRoleSimulate
}) => {
  return (
    <div
      className={`p-3.5 border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner transition-colors ${
        darkMode
          ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
          : 'bg-purple-100 border-purple-300 text-purple-950 font-bold'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
            darkMode ? 'bg-purple-400' : 'bg-purple-600'
          }`}
        ></span>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider block">
            🧪 DEMO RBAC CAPABILITY SIMULATOR
          </span>
          <span
            className={`text-xs font-medium block ${
              darkMode ? 'text-purple-300/80' : 'text-purple-900'
            }`}
          >
            Click any role pill below to simulate granted capability permissions dynamically
          </span>
        </div>
      </div>

      {onRoleSimulate && currentUserRole && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.keys(demoRoleCapabilities).map((rName) => {
            const isActive = currentUserRole === rName;
            return (
              <button
                key={rName}
                type="button"
                onClick={() => onRoleSimulate(rName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-700 text-white border-purple-800 shadow-md shadow-purple-900/30 scale-105'
                    : darkMode
                    ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border-purple-500/30'
                    : 'bg-purple-200 hover:bg-purple-300 text-purple-950 border-purple-400'
                }`}
              >
                {rName === 'SuperAdmin' && '👑 '}
                {rName === 'CompanyAdmin' && '🏢 '}
                {rName === 'CatalogManager' && '📦 '}
                {rName === 'Operator' && '⚙️ '}
                {rName === 'Observer' && '👁️ '}
                {rName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
