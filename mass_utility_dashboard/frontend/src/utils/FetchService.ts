// @Arch[FetchService]
// @Description: Standalone HTTP client utility that redirects calls to local mock responses when running on Vite dev server (port 5173).

// Local state for mocks
let mockBackups: any[] = [
  {
    basename: 'db_backup_2026-07-20_120000.sql.gz',
    sql_filename: 'db_backup_2026-07-20_120000.sql.gz',
    log_filename: 'db_backup_2026-07-20_120000.log',
    sql_size: 15728640,
    log_size: 40960,
    date: 1784635200,
    duration: '12.4s',
    is_local: true,
    is_pinned: false,
    sql_download_url: '#download-sql',
    log_download_url: '#download-log'
  },
  {
    basename: 'db_backup_pinned.sql.gz',
    sql_filename: 'db_backup_pinned.sql.gz',
    sql_size: 26214400,
    log_size: 0,
    date: 1784548800,
    duration: '24.1s',
    is_local: true,
    is_pinned: true,
    sql_download_url: '#download-sql'
  },
  {
    basename: 'db_cloud_only_archive.sql.gz',
    sql_filename: 'db_cloud_only_archive.sql.gz',
    sql_size: 52428800,
    log_size: 0,
    date: 1784462400,
    is_local: false,
    is_cloud: true,
    sql_download_url: '#download-sql'
  }
];

let mockPresets = ['Full Catalog Dump', 'Catalog Core Only'];
let mockBackupJob = { progress: 0, status: 'idle' };

export class FetchService {
  static async post(action: string, payload: any = {}): Promise<any> {
    // Detect Vite local development server
    const isLocalDev = window.location.port === '5173' || window.location.hostname === 'localhost';

    if (isLocalDev) {
      return this.handleMockRequest(action, payload);
    }

    const config = (window as any).PM_CONFIG || {};
    const basePath = config.basePath || '';
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    const url = `${cleanBase}/api/v1/${action}`;

    const formData = new FormData();
    Object.keys(payload).forEach(key => {
      let value = payload[key];
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      formData.append(key, value);
    });

    formData.set('ajax', '1');
    formData.set('action', action);

    if (config.securityToken) {
      formData.set('token', config.securityToken);
    }

    const headers: Record<string, string> = {};
    if (config.csrfToken) {
      headers['X-CSRF-Token'] = config.csrfToken;
    }

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  private static handleMockRequest(action: string, payload: any): any {
    console.log(`[MOCK AJAX] Action: ${action}`, payload);

    switch (action) {
      case 'get_server_status':
        return {
          success: true,
          diagnostics: {
            db_locks: 'HEALTHY',
            disk_free: '14.2 GB',
            memory_free: '768 MB',
            write_permissions: 'WRITABLE'
          },
          limits: {
            max_execution_time: '120s',
            max_input_time: '60s',
            default_socket_timeout: '60s',
            upload_max_filesize: '64M',
            post_max_size: '64M',
            memory_limit: '256M',
            session_gc_maxlifetime: '1440s'
          },
          cgroup: {
            cpu_usage: 12.5,
            memory_usage: 45.2,
            db_connections: 18,
            php_version: '8.1.18'
          }
        };

      case 'get_categorized_tables':
        return {
          success: true,
          categorized_tables: {
            catalog: ['ps_product', 'ps_category', 'ps_category_lang', 'ps_product_lang'],
            stock_attributes: ['ps_stock_available', 'ps_attribute', 'ps_attribute_group'],
            pricing_taxes: ['ps_specific_price', 'ps_tax', 'ps_carrier'],
            customers_orders: ['ps_orders', 'ps_cart', 'ps_customer', 'ps_address'],
            system_settings: ['ps_configuration', 'ps_module', 'ps_hook']
          }
        };

      case 'get_db_backups':
        return {
          success: true,
          backups: mockBackups
        };

      case 'get_presets':
        return {
          success: true,
          presets: mockPresets
        };

      case 'load_preset':
        return {
          success: true,
          tables: ['ps_product', 'ps_category', 'ps_category_lang']
        };

      case 'save_preset': {
        const name = payload.name;
        if (!mockPresets.includes(name)) {
          mockPresets.push(name);
        }
        return { success: true };
      }

      case 'delete_preset': {
        const name = payload.name;
        mockPresets = mockPresets.filter(p => p !== name);
        return { success: true };
      }

      case 'create_backup':
        mockBackupJob = { progress: 0, status: 'running' };
        return { success: true, job_id: 'mock_job_' + Math.random().toString(36).substr(2, 9) };

      case 'poll_job_progress':
        if (mockBackupJob.progress < 100) {
          mockBackupJob.progress += 25;
        }
        return {
          success: true,
          progress: mockBackupJob.progress,
          status_text: mockBackupJob.progress >= 100 ? 'Backup completed successfully.' : `Compiling catalog tables: ${mockBackupJob.progress}%`,
          status: mockBackupJob.progress >= 100 ? 'completed' : 'running',
          backups: mockBackups
        };

      case 'cancel_job':
        mockBackupJob = { progress: 0, status: 'cancelled' };
        return { success: true };

      case 'toggle_pin_backup': {
        const file = payload.file;
        mockBackups = mockBackups.map(b => {
          if (b.basename === file) {
            return { ...b, is_pinned: !b.is_pinned };
          }
          return b;
        });
        return { success: true, pinned: mockBackups.find(b => b.basename === file)?.is_pinned, backups: mockBackups };
      }

      case 'delete_backup': {
        const file = payload.backup;
        mockBackups = mockBackups.filter(b => b.basename !== file);
        return { success: true, backups: mockBackups };
      }

      case 'clear_backup_history':
        mockBackups = [];
        return { success: true, backups: [] };

      case 'profile_database':
        return {
          success: true,
          profile: {
            grade: 'B+',
            grade_label: 'Good database health, some fragmentation detected.',
            total_free_pretty: '4.25 MB',
            fragmentation_ratio_avg: '8.5%',
            tables_count: 5,
            tables: [
              { name: 'ps_connections', engine: 'InnoDB', rows: 125000, size_pretty: '28.5 MB', overhead_pretty: '2.4 MB', overhead_bytes: 2516582, fragmentation_ratio: '12.4%' },
              { name: 'ps_cart', engine: 'InnoDB', rows: 45000, size_pretty: '12.2 MB', overhead_pretty: '1.2 MB', overhead_bytes: 1258291, fragmentation_ratio: '9.8%' },
              { name: 'ps_product', engine: 'InnoDB', rows: 1500, size_pretty: '1.8 MB', overhead_pretty: '0.4 MB', overhead_bytes: 419430, fragmentation_ratio: '4.2%' },
              { name: 'ps_category', engine: 'InnoDB', rows: 150, size_pretty: '0.2 MB', overhead_pretty: '0.0 MB', overhead_bytes: 0, fragmentation_ratio: '0.0%' },
              { name: 'ps_configuration', engine: 'InnoDB', rows: 850, size_pretty: '0.4 MB', overhead_pretty: '0.0 MB', overhead_bytes: 0, fragmentation_ratio: '0.0%' }
            ]
          }
        };

      case 'optimize_table':
        return { success: true };

      case 'sweeper_analyze':
        return {
          success: true,
          stats: { connections: 45000, connections_page: 120000, connections_source: 15000, guests: 8500, total: 188500 },
          carts: { carts: 25000, cart_products: 75000, cart_rules: 5000, total: 105000 }
        };

      case 'sweeper_scan_images':
        return {
          success: true,
          scanned_files: 12500,
          orphaned_files: [
            { relative_path: 'img/p/1/2/12-large.jpg' },
            { relative_path: 'img/p/2/3/23-small.jpg' }
          ],
          total_orphaned_size: 4404019
        };

      case 'sweeper_sweep_connections':
      case 'sweeper_sweep_guests':
      case 'sweeper_sweep_carts':
      case 'sweeper_purge_images':
        return { success: true, deleted: 5000, deleted_count: 2, done: true };

      case 'prepare_restore':
        return { success: true, statement_count: 250, was_shop_enabled: true };

      case 'execute_restore_chunk': {
        const offset = Number(payload.offset) || 0;
        const limit = Number(payload.limit) || 100;
        return { success: true, executed_count: limit, new_offset: offset + limit };
      }

      case 'complete_restore':
        return { success: true, shop_status: 'MAINTENANCE', log_content: '[SYSTEM] Staging validation complete.\nRestored active indices.' };

      case 'set_shop_live':
        return { success: true, message: 'Shop set LIVE successfully.' };

      case 'compare_compare': // wait, compare_backup
      case 'compare_backup':
        return {
          success: true,
          checksum_drift: true,
          added_count: 2,
          deleted_count: 1,
          backup_rows: 150,
          active_rows: 151,
          checksum_status: {
            ps_product: { match: false, backup_rows: 1500, active_rows: 1502, volatile: false },
            ps_category: { match: true, backup_rows: 50, active_rows: 50, volatile: false },
            ps_connections: { match: false, backup_rows: 45000, active_rows: 45050, volatile: true }
          }
        };

      case 'diff_table_rows':
        return {
          success: true,
          diffs: {
            summary: { added: 2, deleted: 1, modified: 1 },
            modified_rows: [
              { pk: 'ID: 45', changes: { price: { backup: '12.00', live: '15.50' } } }
            ],
            added_rows: [
              { id_product: '1501', reference: 'REF-NEW1', name: 'Simulated Product 1', price: '19.99' },
              { id_product: '1502', reference: 'REF-NEW2', name: 'Simulated Product 2', price: '24.99' }
            ],
            deleted_rows: [
              { id_product: '12', reference: 'REF-OLD', name: 'Orphaned legacy Product', price: '5.50' }
            ]
          }
        };

      default:
        return { success: true };
    }
  }
}
