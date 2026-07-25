// @Arch[SettingsInfo]
// @Description: Renders the inline administrator manual and system architecture guidelines for catalog operations, InnoDB tuning, and backups.

import React, { useState } from 'react';

interface ManualSection {
  title: string;
  icon: string;
  content: string[];
}

export const SettingsInfo: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const sections: ManualSection[] = [
    {
      title: 'Simulation Mode (Dry Run) Process',
      icon: '⚙️',
      content: [
        'AST Compilation: Translates visual rules builder JSON payload into an Abstract Syntax Tree structure.',
        'Query Isolation: Compiles AST rule groups into a read-only MySQL SELECT query instead of a destructive write statement.',
        'Pre-flight Audit: Returns affected target row counts and metadata, rendering changes visually without committing real mutations.'
      ]
    },
    {
      title: 'Database Backups & Table Drift Detection',
      icon: '🗄️',
      content: [
        'Schema Mapping: Groups MySQL tables into Core, Catalog, and Sales categories dynamically.',
        'Chunked Dump: Iterates target tables using SELECT * LIMIT [size] OFFSET [x] streaming straight into a gzwrite file buffer, keeping memory below 2MB.',
        'Drift Analysis: The frontend computes a diff between the loaded preset\'s table configurations and the database\'s actual schema, throwing a visual warning if newly created tables are detected.'
      ]
    },
    {
      title: 'InnoDB Optimizer & Defragmentation',
      icon: '📈',
      content: [
        'Fragmentation Profiling: Queries target tables dynamically using INFORMATION_SCHEMA space metrics to detect fragmentation levels and data overhead.',
        'Index Rebuilding: Runs safe, non-destructive table optimization commands (e.g. OPTIMIZE TABLE) table-by-table.',
        'SSD Reclamation: Reclaims unused disk pages and fragmented indexes, releasing unused storage space back to host OS SSD boundaries.'
      ]
    },
    {
      title: 'File Tools: Streaming TAR/GZIP Archival',
      icon: '📁',
      content: [
        'Exclusions Scan: Parses folder tree selections and stores unchecked paths as exclusions inside settings.',
        'CLI Streaming: Spawns an external native shell process (tar CLI via proc_open) to stream file compression.',
        'Checksum Validation: Automatically calculates and writes a SHA256 checksum in a parallel sidecar file on completion.'
      ]
    },
    {
      title: 'Google Drive Cloud Sync & Streaming Restore',
      icon: '☁️',
      content: [
        'Resumable Session: Initiates a Google Drive resumable upload session endpoint.',
        'Chunked Streaming: Uploads binary backup packets in 5MB chunks directly to cloud servers, bypassing local memory limits.',
        'SSE Cloud Restore: Streams bytes from Google Cloud via curl callbacks directly into local storage files, monitoring download progress via Server-Sent Events.'
      ]
    },
    {
      title: 'Query & Mutate Deadlock Shield',
      icon: '⚡',
      content: [
        'Query Fetching: Compiles and queries index-only primary key IDs of targeted products.',
        'Numeric Sorting: Sorts target IDs in ascending numerical order (e.g. [5, 10, 15]) to enforce deterministic InnoDB row locking.',
        'Lock Shield: Acquires row locks and applies mutations sequentially, preventing cross-thread database deadlocks.'
      ]
    },
    {
      title: 'Mutation History & Reversion Rollbacks',
      icon: '🕒',
      content: [
        'Pre-Update Snapshot: Queries and caches all columns of targeted rows in a serialized JSON snapshot.',
        'Sandbox Archival: Records the JSON snapshot to the local SQLite database.',
        'Reversion: When rolling back, parses the JSON state and builds precise targeted UPDATE queries restoring historical values.'
      ]
    },
    {
      title: 'Data Sweeper Cleanup Pipeline',
      icon: '🧹',
      content: [
        'Bloat Assessment: Scans tables and reports count metrics of connections, guests, logs, and expired carts.',
        'Chunked Deletion: Runs iterative limits-capped queries (e.g., DELETE LIMIT 500).',
        'InnoDB Lock Breathing: Pauses deletion for 50ms between chunks, allowing other customer transaction threads to execute.'
      ]
    },
    {
      title: 'Ghost Product Image Sweeper',
      icon: '🖼️',
      content: [
        'Catalog Sync Scan: Cross-references physical product image subdirectories in PrestaShop /img/p/ with DB image references.',
        'Orphan Identification: Identifies unreferenced legacy legacy files and orphan database connections.',
        'Safe Disk Sweeping: Safely purges physical files and purifies database images records without breaking catalog integrity.'
      ]
    },
    {
      title: 'Automatic Backup Retention & Storage Cleaners',
      icon: '🕒',
      content: [
        'Policy Verification: Checks count limits and age policies (maximum age in days) defined in your backup policies.',
        'Old File Pruning: Checks directory archives during database/file backups or CLI cron runs.',
        'Pruning Executions: Prunes the oldest SQL and TAR archives to automatically keep host storage clean.'
      ]
    },
    {
      title: 'Store Security & Health Hardening Inspector',
      icon: '🛡️',
      content: [
        'Decoupled Bridge Relay: Queries PrestaShop host diagnostics remotely via HttpClient without requiring central server database access.',
        'HTTP Security Headers: Analyzes and injects HSTS, X-Content-Type-Options (nosniff), X-Frame-Options (SAMEORIGIN), and Referrer-Policy headers into store .htaccess.',
        '1-Click Store Hardening: Provides single-click automated permission repair (0755/0644) and 1-click Store SSL Enforcement (PS_SSL_ENABLED).'
      ]
    }
  ];

  const toggleAccordion = (idx: number) => {
    setActiveAccordion(activeAccordion === idx ? null : idx);
  };

  return (
    <div className="space-y-6">
      {/* Documentation Card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">1. Core Architectural Pipeline Guide</h3>
        </div>
        <p className="text-sm text-pm-text-secondary mb-6 leading-relaxed">
          In-depth guide on the Mass Utility module's architecture and procedural operations. Click on any section below to expand details.
        </p>

        <div className="space-y-3">
          {sections.map((sec, idx) => {
            const isOpen = activeAccordion === idx;
            return (
              <div
                key={idx}
                className="border border-pm-border rounded-lg overflow-hidden bg-pm-input/30 transition-all duration-300"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm text-pm-text hover:bg-pm-input/20 focus:outline-none"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-md">{sec.icon}</span>
                    <span>{sec.title}</span>
                  </span>
                  <span className={`text-xs text-pm-text-secondary transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[500px] border-t border-pm-border p-5' : 'max-h-0'
                  } overflow-hidden`}
                >
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-pm-text-secondary leading-relaxed">
                    {sec.content.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Troubleshooting Card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
        <h3 className="text-md font-bold tracking-wide text-pm-danger uppercase flex items-center gap-3">
          <span className="w-3 h-3 bg-pm-danger rounded-full shadow-lg shadow-pm-danger/50"></span>
          2. Administrator Troubleshooting
        </h3>
        <ul className="list-disc pl-5 space-y-2.5 text-xs text-pm-text-secondary leading-relaxed">
          <li>
            <strong className="text-pm-text">File backup fails:</strong> Lower the <em className="text-pm-primary">TAR Streaming Append Threshold</em> to 10MB or 20MB in General Settings.
          </li>
          <li>
            <strong className="text-pm-text">Database export timeouts:</strong> Reduce the <em className="text-pm-primary">Database Row Chunk</em> to 1000 or 500 rows.
          </li>
          <li>
            <strong className="text-pm-text">Cloud Sync setup:</strong> Input Google developer client credentials and ensure the Redirect URI is properly registered in Google Cloud Console.
          </li>
        </ul>
      </div>
    </div>
  );
};
