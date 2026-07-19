/**
 * Project Mass - Database Tools Engine
 * Handles full database backup, table selection, and the AJAX SQL restoration/import wizard.
 */
const DatabaseToolsEngine = (function() {

    // --- Private Methods & Event Listeners ---
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
                // B1. Customize Tables Drawer Toggle
                const customizeBtn = document.getElementById('pm-btn-customize-tables');
                const customizerDrawer = document.getElementById('pm-tables-customizer');
                if (customizeBtn && customizerDrawer) {
                    customizeBtn.addEventListener('click', function() {
                        const isHidden = (customizerDrawer.style.display === 'none');
                        customizerDrawer.style.display = isHidden ? 'block' : 'none';
                        customizeBtn.style.backgroundColor = isHidden ? 'var(--pm-primary-hover)' : 'var(--pm-neutral)';
                    });
                }

                // Toggle individual sub-tables view link
                const toggleGroupLinks = document.querySelectorAll('.pm-toggle-group-link');
                toggleGroupLinks.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const groupDiv = document.getElementById(link.getAttribute('data-group'));
                        if (groupDiv) {
                            const isHidden = (groupDiv.style.display === 'none');
                            groupDiv.style.display = isHidden ? 'block' : 'none';
                            link.textContent = isHidden ? 'Hide Tables' : 'Show Tables (' + groupDiv.querySelectorAll('input').length + ')';
                        }
                    });
                });

                // Bind Restore Log Terminal Save & Clear buttons
                const btnSaveRestoreLog = document.getElementById('pm-btn-save-restore-log');
                if (btnSaveRestoreLog) {
                    btnSaveRestoreLog.addEventListener('click', function() {
                        const logTerminal = document.getElementById('pm-restore-log-terminal');
                        if (logTerminal) {
                            const text = logTerminal.textContent;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'database_restore_execution.log';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    });
                }

                const btnClearRestoreLog = document.getElementById('pm-btn-clear-restore-log');
                if (btnClearRestoreLog) {
                    btnClearRestoreLog.addEventListener('click', function() {
                        const logTerminal = document.getElementById('pm-restore-log-terminal');
                        if (typeof FetchEngine !== 'undefined') {
                            FetchEngine.post('clear_saas_log')
                            .then(data => {
                                if (data.success) {
                                    if (logTerminal) {
                                        logTerminal.textContent = 'Diagnostics terminal cleared.\n';
                                    }
                                    showPremiumToast('Diagnostics log cleared.');
                                }
                            })
                            .catch(err => console.error('Error clearing console log: ', err));
                        } else {
                            if (logTerminal) {
                                logTerminal.textContent = 'Diagnostics terminal cleared.\n';
                            }
                        }
                    });
                }

                // Check/Uncheck entire domain group when domain select is clicked
                const domainSelects = document.querySelectorAll('.pm-domain-select');
                domainSelects.forEach(ds => {
                    ds.addEventListener('change', function() {
                        const domain = ds.getAttribute('data-domain');
                        const checkboxes = document.querySelectorAll('.pm-table-checkbox[data-domain="' + domain + '"]');
                        checkboxes.forEach(cb => {
                            cb.checked = ds.checked;
                        });
                        updateSelectAllState();
                    });
                });

                // Use event delegation for dynamically hydrated table checkboxes
                document.addEventListener('change', function(e) {
                    if (e.target && e.target.classList.contains('pm-table-checkbox')) {
                        const cb = e.target;
                        const domain = cb.getAttribute('data-domain');
                        const ds = document.querySelector('.pm-domain-select[data-domain="' + domain + '"]');
                        if (ds) {
                            const siblings = document.querySelectorAll('.pm-table-checkbox[data-domain="' + domain + '"]');
                            const allChecked = Array.from(siblings).every(s => s.checked);
                            const someChecked = Array.from(siblings).some(s => s.checked);
                            ds.checked = allChecked;
                            ds.indeterminate = someChecked && !allChecked;
                        }
                        updateSelectAllState();
                    }
                });

                // Select All Tables (Full Backup) logic
                const selectAllTablesCheckbox = document.getElementById('pm-select-all-tables');
                if (selectAllTablesCheckbox) {
                    selectAllTablesCheckbox.addEventListener('change', function() {
                        const isChecked = selectAllTablesCheckbox.checked;
                        domainSelects.forEach(ds => {
                            ds.checked = isChecked;
                            ds.indeterminate = false;
                        });
                        document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                            cb.checked = isChecked;
                        });
                    });
                }

                function updateSelectAllState() {
                    if (selectAllTablesCheckbox) {
                        const currentCheckboxes = document.querySelectorAll('.pm-table-checkbox');
                        if (currentCheckboxes.length > 0) {
                            const allChecked = Array.from(currentCheckboxes).every(cb => cb.checked);
                            const someChecked = Array.from(currentCheckboxes).some(cb => cb.checked);
                            selectAllTablesCheckbox.checked = allChecked;
                            selectAllTablesCheckbox.indeterminate = someChecked && !allChecked;
                        }
                    }
                }

                // B. AJAX Backup triggering logic
                const backupBtn = document.getElementById('pm-btn-backup');
                if (backupBtn) {
                    backupBtn.addEventListener('click', function() {
                        // Collect all checked individual tables
                        const checkedTables = [];
                        document.querySelectorAll('.pm-table-checkbox:checked').forEach(cb => {
                            checkedTables.push(cb.value);
                        });

                        if (checkedTables.length === 0) {
                            showPremiumAlert('Selection Required', 'You must select at least one database table to archive.');
                            return;
                        }

                        showPremiumConfirmModal(
                            'Confirm Backup Execution',
                             `You are about to initiate a heavy database Gzip archive sequence targeting <strong>${checkedTables.length} tables</strong>.<br><br>If your database is gigabytes in size, this can temporarily spike CPU utilization and IOPS on your server.<br><br>Are you sure you want to proceed?<br><br><span style="color: var(--pm-text-secondary); font-size: 0.9rem;">To confirm, please type <strong style="color: var(--pm-danger);">EXECUTE</strong> in the text box below.</span>`,
                            'EXECUTE',
                            () => {
                                backupBtn.disabled = true;
                                const originalText = backupBtn.innerHTML;
                                backupBtn.innerHTML = '&#9881;&#65039; Compiling Archive...'; // nosec
                                
                                const progressContainer = document.getElementById('pm-backup-progress-container');
                                const progressBar = document.getElementById('pm-backup-progress-bar');
                                const progressText = document.getElementById('pm-backup-progress-text');
                                const progressPercent = document.getElementById('pm-backup-progress-percent');
                                
                                if (progressContainer) progressContainer.style.display = 'block';
                                if (progressBar) {
                                    progressBar.style.animation = 'none';
                                    progressBar.style.width = '0%';
                                }
                                if (progressText) progressText.innerText = 'Initializing database backup job...';
                                if (progressPercent) progressPercent.innerText = '0%';
                                
                                 FetchEngine.post('create_backup', { tables: JSON.stringify(checkedTables) })
                                    .then(data => {
                                        const jobId = data.job_id;
                                        let source = null;
                                        
                                        const stopBtn = document.getElementById('pm-btn-stop-backup');
                                        if (stopBtn) {
                                            stopBtn.disabled = false;
                                            stopBtn.onclick = () => {
                                                stopBtn.disabled = true;
                                                if (progressText) progressText.innerText = 'Cancelling backup...';
                                                FetchEngine.post('cancel_job', { job_id: jobId })
                                                    .then(() => {
                                                        showPremiumToast('Cancellation request sent.');
                                                    })
                                                    .catch(err => {
                                                        showPremiumAlert('Cancellation Error', err.message);
                                                    });
                                            };
                                        }
                                        
                                        const handleStateUpdate = (d) => {
                                            if (progressBar) progressBar.style.width = d.progress + '%';
                                            if (progressPercent) progressPercent.innerText = Math.round(d.progress) + '%';
                                            if (progressText) progressText.innerText = d.status_text || `Dumping tables: ${d.processed_items} of ${d.total_items} tables...`;
                                            
                                            if (d.status === 'completed') {
                                                if (source) source.close();
                                                backupBtn.disabled = false;
                                                backupBtn.innerHTML = originalText; // nosec
                                                if (progressContainer) progressContainer.style.display = 'none';
                                                showPremiumToast('Table catalog backup archive compiled: ' + d.basename);
                                                pmRenderAllGrids(d.backups);
                                                return true;
                                            } else if (d.status === 'cancelled') {
                                                if (source) source.close();
                                                backupBtn.disabled = false;
                                                backupBtn.innerHTML = originalText; // nosec
                                                if (progressContainer) progressContainer.style.display = 'none';
                                                showPremiumToast('Backup cancelled successfully.', 'warning');
                                                pmRenderAllGrids(d.backups);
                                                return true;
                                            } else if (d.status === 'failed') {
                                                throw new Error(d.error || 'Database backup worker failed.');
                                            }
                                            return false;
                                        };

                                        const runAjaxPollingFallback = () => {
                                            const poll = () => {
                                                FetchEngine.post('poll_job_progress', { job_id: jobId })
                                                    .then(d => {
                                                        if (d.error) {
                                                            throw new Error(d.error);
                                                        }
                                                        const isFinished = handleStateUpdate(d);
                                                        if (!isFinished) {
                                                            setTimeout(poll, 1500);
                                                        }
                                                    })
                                                    .catch(err => {
                                                        backupBtn.disabled = false;
                                                        backupBtn.innerHTML = originalText; // nosec
                                                        if (progressContainer) progressContainer.style.display = 'none';
                                                        showPremiumAlert('Database Backup Error', err.message);
                                                     });
                                            };
                                            setTimeout(poll, 1000);
                                        };

                                        if (window.EventSource) {
                                            try {
                                                const sseUrl = new URL(window.location.href);
                                                sseUrl.searchParams.set('ajax', '1');
                                                sseUrl.searchParams.set('action', 'stream_job_progress');
                                                sseUrl.searchParams.set('job_id', jobId);
                                                if (window.PM_CONFIG && window.PM_CONFIG.securityToken) {
                                                    sseUrl.searchParams.set('token', window.PM_CONFIG.securityToken);
                                                }
                                                
                                                source = new EventSource(sseUrl.toString());
                                                
                                                source.onmessage = function(event) {
                                                    try {
                                                        const d = JSON.parse(event.data);
                                                        if (d.success === false) {
                                                            throw new Error(d.error || 'SSE stream reported a failure.');
                                                        }
                                                        handleStateUpdate(d);
                                                    } catch (err) {
                                                        if (source) source.close();
                                                        backupBtn.disabled = false;
                                                        backupBtn.innerHTML = originalText; // nosec
                                                        if (progressContainer) progressContainer.style.display = 'none';
                                                        showPremiumAlert('Database Backup Error', err.message);
                                                    }
                                                };
                                                
                                                source.onerror = function() {
                                                    if (source) source.close();
                                                    source = null;
                                                    runAjaxPollingFallback();
                                                };
                                            } catch (e) {
                                                runAjaxPollingFallback();
                                            }
                                        } else {
                                            runAjaxPollingFallback();
                                        }
                                    })
                                    .catch(error => {
                                        backupBtn.disabled = false;
                                        backupBtn.innerHTML = originalText; // nosec
                                        if (progressContainer) progressContainer.style.display = 'none';
                                        showPremiumAlert('Database Backup Initialization Error', error.message);
                                    });
                            }
                        );
                    });
                }

                // C. AJAX Compare drift triggers
                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pm-btn-compare');
                    if (!btn) return;
                    
                    const backupName = btn.getAttribute('data-backup');
                    btn.disabled = true;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '&#9889; Checking...'; // nosec

                    FetchEngine.post('compare_backup', { file: backupName })
                        .then(data => {
                            btn.disabled = false;
                            btn.innerHTML = originalText; // nosec
                            window.PM_LAST_COMPARE = data;
                            window.pmRenderKeySyncAuditModal(data);
                        })
                        .catch(error => {
                            btn.disabled = false;
                            btn.innerHTML = originalText; // nosec
                        });
                });

                // D. AJAX Delete triggers
                let backupToDelete = '';

                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pm-btn-delete');
                    if (!btn) return;
                    
                    backupToDelete = btn.getAttribute('data-backup');
                    
                    showPremiumConfirmModal(
                        'Confirm Permanent Deletion',
                        `Are you sure you want to permanently delete the backup and logs for <strong style="color: var(--pm-text-primary);">${backupToDelete}</strong>?<br><br>This operation cannot be undone. To confirm, please type <strong style="color: var(--pm-danger);">DELETE</strong> in the box below:`,
                        'DELETE',
                        () => {
                            FetchEngine.post('delete_backup', { file: backupToDelete })
                                .then(data => {
                                    showPremiumToast('Success! Backup and matched logs permanently deleted.');
                                    pmRenderAllGrids(data.backups || []);
                                });
                        }
                    );
                });
 
                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pm-btn-pin, .pm-btn-unpin');
                    if (!btn) return;
                    
                    const backupFile = btn.getAttribute('data-backup');
                    btn.disabled = true;
                    FetchEngine.post('toggle_pin_backup', { file: backupFile })
                        .then(data => {
                            if (data.success) {
                                showPremiumToast(data.pinned ? '📌 Backup pinned successfully' : '📌 Backup unpinned');
                                pmRenderAllGrids(data.backups || []);
                            } else {
                                showPremiumToast(data.error || 'Failed to toggle pin', 'error');
                                btn.disabled = false;
                            }
                        })
                        .catch(err => {
                            showPremiumToast('Network error while toggling pin', 'error');
                            btn.disabled = false;
                        });
                });



                // J. Database Restore / Import Staging & Chunk Execution Loop
                 function pmRenderAllGrids(backups) {
                     window.PM_CONFIG.backups = backups || [];
                     
                     const escapeHtml = (str) => {
                         if (!str) return '';
                         return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                     };
                     
                     const restoreList = document.getElementById('pm-restore-local-list');
                     const backupsTable = document.getElementById('pm-backups-table');
                     
                     if (restoreList) restoreList.innerHTML = ''; // nosec
                     if (backupsTable) {
                         backupsTable.querySelectorAll('tbody').forEach(tb => tb.remove());
                     }
                     
                     let hasBackups = false;
 
                     if (!backups || backups.length === 0) {
                         if (restoreList) {
                             restoreList.innerHTML = /* nosec */ `
                                 <tr class="pm-empty-row">
                                     <td colspan="4" style="padding: 0;">
                                         <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                             <div class="pm-empty-state-icon">&#128193;</div>
                                             <div class="pm-empty-state-text">No Local Backups Found</div>
                                             <div class="pm-empty-state-subtext">No local database backups are available to restore.</div>
                                         </div>
                                     </td>
                                 </tr>`; // nosec
                         }
                         if (backupsTable) {
                             const emptyTbody = document.createElement('tbody');
                             emptyTbody.innerHTML = /* nosec */ `
                                 <tr class="pm-empty-row">
                                     <td colspan="5" style="padding: 0;">
                                         <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                             <div class="pm-empty-state-icon">&#128193;</div>
                                             <div class="pm-empty-state-text">No Database Backups Found</div>
                                             <div class="pm-empty-state-subtext">The historical backups repository is currently empty.</div>
                                         </div>
                                     </td>
                                 </tr>`; // nosec
                             backupsTable.appendChild(emptyTbody);
                         }
                         return;
                     }
 
                     backups.forEach(b => {
                         let pill = ''; 
                         let borderColor = ''; 
                         let bgColor = '';
                         const isCatalog = true; // All generated backups are now catalog backups since mock data is removed
                         const isUploaded = b.is_uploaded || b.basename.indexOf('import_tmp') > -1;
 
                         // Unified date formatting — mirrors HydrationEngine.js rendering path
                         let dateStr = b.date;
                         if (typeof dateStr === 'number') {
                             const d = new Date(dateStr * 1000);
                             dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
                         }
                         dateStr = dateStr || 'Unknown Date';
 
                         // Unified size formatting — mirrors HydrationEngine.js rendering path
                         const size = typeof b.sql_size === 'number' ? ((b.sql_size / 1024) / 1024).toFixed(2) + ' MB' : (b.sql_size || 'Unknown Size');
 
                         if (!b.is_local && b.is_cloud) {
                             pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">☁️ Cloud Only</span>`;
                             borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
                         } else if (isUploaded) {
                             pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128194; Uploaded</span>`;
                             borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
                         } else {
                             pill = `<span class="pm-status-pill success pm-base-status-badge" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128190; Local</span>`;
                         }
                         
                         const durationBadge = b.duration ? `<span style="font-size: 0.65rem; color: var(--pm-text-secondary); display: inline-flex; align-items: center; gap: 0.2rem;"><span style="font-weight:600; color:var(--pm-text-primary);">Completed In:</span> ${b.duration}</span>` : '';
 
                         // 1. Restore Sub-tab List Entry (All types as table rows)
                         if (restoreList) {
                             const trRestore = document.createElement('tr');
                             trRestore.className = 'pm-data-row pm-backup-entry';
                             if (borderColor) { trRestore.style.borderLeft = '4px solid ' + borderColor; trRestore.style.background = bgColor; }
                             
                             const restoreButtonHtml = b.is_local ? 
                                 `<button type="button" class="pm-btn pm-btn-sm pm-btn-restore-trigger pm-btn-danger" data-backup="${escapeHtml(b.basename)}">⚡ Restore</button>` :
                                 `<button type="button" class="pm-btn pm-btn-sm pm-btn-cloud-restore pm-btn-purple" data-backup="${escapeHtml(b.basename)}" data-type="database">☁️ Restore</button>`;
 
                             trRestore.innerHTML = /* nosec */ `
                                 <td style="vertical-align: middle;">
                                     <div>
                                         <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                                             <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="${escapeHtml(b.basename)}">
                                                 ${escapeHtml(b.basename)}
                                             </span>
                                             <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="${escapeHtml(b.basename)}" title="Copy to clipboard">📋</span>
                                         </div>
                                         <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                             ${pill}
                                             ${durationBadge}
                                         </div>
                                     </div>
                                 </td>
                                 <td style="color: var(--pm-text-secondary); vertical-align: middle;">${size}</td>
                                 <td style="color: var(--pm-text-secondary); vertical-align: middle;">${dateStr}</td>
                                 <td style="vertical-align: middle; text-align: right;">
                                     <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                                         ${restoreButtonHtml}
                                         <button type="button" class="pm-btn pm-btn-sm pm-btn-delete-trigger pm-btn-neutral" data-backup="${escapeHtml(b.basename)}">🗑️ Delete</button>
                                     </div>
                                 </td>
                             `; // nosec
                             restoreList.appendChild(trRestore);
                         }
 
                         const trData = document.createElement('tr');
                         trData.className = 'pm-data-row';
                         trData.setAttribute('data-is-local', (b.is_local !== false) ? 'true' : 'false');
                         trData.setAttribute('data-is-cloud', b.is_cloud ? 'true' : 'false');
                         if (borderColor) { trData.style.borderLeft = '4px solid ' + borderColor; trData.style.background = bgColor; }
 
                         let actionsHtml = `
                             <a href="${b.sql_download_url}" class="pm-btn pm-btn-sm" title="Download SQL">⬇️ SQL</a>
                             ${b.log_filename ? `<a href="${b.log_download_url}" class="pm-btn pm-btn-sm pm-btn-neutral" title="Download Log">📄 Log</a>` : ''}
                         `;
                         if (isCatalog) {
                             actionsHtml += `<button type="button" class="pm-btn pm-btn-sm pm-btn-compare pm-btn-purple" data-backup="${escapeHtml(b.basename)}" title="Compare Diff">🔍 Diff</button>`;
                         }
                         if (b.is_local !== false) {
                              const pinText = b.is_pinned ? '📌 Unpin' : '📌 Pin';
                              const pinClass = b.is_pinned ? 'pm-btn-unpin pm-btn-success' : 'pm-btn-pin pm-btn-neutral';
                              actionsHtml += `<button type="button" class="pm-btn pm-btn-sm pm-btn-delete pm-btn-danger" data-backup="${escapeHtml(b.basename)}" title="Delete Local">🗑️ Delete</button>`;
                              actionsHtml += `<button type="button" class="pm-btn pm-btn-sm ${pinClass}" data-backup="${escapeHtml(b.basename)}" title="Toggle Pin">${pinText}</button>`;
                          } else {
                              actionsHtml += `<button type="button" class="pm-btn pm-btn-sm pm-btn-cloud-restore pm-btn-purple" data-backup="${escapeHtml(b.basename)}" data-type="database" title="Restore Local">☁️ Restore</button>`;
                          }

                        trData.innerHTML = /* nosec */ `
                            <td style="vertical-align: middle;">
                                <div>
                                    <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                                        <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="${escapeHtml(b.basename)}">
                                            ${escapeHtml(b.basename)}
                                        </span>
                                        <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="${escapeHtml(b.basename)}" title="Copy to clipboard">📋</span>
                                    </div>
                                    <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                        ${pill}
                                        ${durationBadge}
                                    </div>
                                </div>
                            </td>
                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${size}</td>
                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${typeof b.log_size === 'number' ? (b.log_size / 1024).toFixed(2) + ' KB' : b.log_size}</td>
                            <td style="vertical-align: middle;">${dateStr}</td>
                            <td style="vertical-align: middle; text-align: right;">
                                <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                                    ${actionsHtml}
                                </div>
                            </td>
                        `; // nosec

                        if (isCatalog || isUploaded) {
                            if (backupsTable) {
                                const entryTbody = document.createElement('tbody');
                                entryTbody.className = 'pm-backup-entry';
                                if (borderColor) {
                                    entryTbody.style.borderLeft = '4px solid ' + borderColor;
                                    entryTbody.style.background = bgColor;
                                }
                                entryTbody.appendChild(trData);
                                backupsTable.appendChild(entryTbody);
                                hasBackups = true;
                            }
                        }
                    });

                    if (!hasBackups && backupsTable) {
                        const emptyTbody = document.createElement('tbody');
                        emptyTbody.innerHTML = /* nosec */ `
                            <tr class="pm-empty-row">
                                <td colspan="4" style="padding: 0;">
                                    <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                        <div class="pm-empty-state-icon">&#128193;</div>
                                        <div class="pm-empty-state-text">No Database Backups Found</div>
                                        <div class="pm-empty-state-subtext">The historical backups repository is currently empty.</div>
                                    </div>
                                </td>
                            </tr>`; // nosec
                        backupsTable.appendChild(emptyTbody);
                    }
                    
                    if (restoreList) {
                        restoreList.querySelectorAll('.pm-btn-restore-trigger').forEach(btn => {
                            btn.addEventListener('click', function() { initiateDatabaseRestore(this.getAttribute('data-backup')); });
                        });
                        restoreList.querySelectorAll('.pm-btn-delete-trigger').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const backupToDelete = this.getAttribute('data-backup');
                                showPremiumConfirmModal('Purge Archive', `Are you sure you want to permanently delete <strong style="color: var(--pm-text-primary);">${backupToDelete}</strong>?<br><br>This operation cannot be undone. To confirm, please type <strong style="color: #ef4444;">DELETE</strong> in the box below:`, 'DELETE', () => {
                                    FetchEngine.post('delete_backup', { file: backupToDelete })
                                    .then(data => {
                                        showPremiumToast('Archive permanently deleted.');
                                        pmRenderAllGrids(data.backups);
                                    }).catch(err => showPremiumAlert('Connection Error', err.message, 'error'));
                                });
                            });
                        });
                    }
                    if (typeof GoogleDriveEngine !== 'undefined') {
                        GoogleDriveEngine.updateGridsUI();
                    }
                }
                // Sub-tabs switching logic (3-panel: Backup | Profiler | Restore)
                const subTabBtns = document.querySelectorAll('#pm-content-database .pm-sub-tab-btn');
                subTabBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        subTabBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        const targetId = btn.getAttribute('data-sub-tab');
                        document.getElementById('pm-sub-content-backup').style.display = (targetId === 'pm-sub-content-backup') ? 'block' : 'none';
                        document.getElementById('pm-sub-content-profiler').style.display = (targetId === 'pm-sub-content-profiler') ? 'block' : 'none';
                        document.getElementById('pm-sub-content-restore').style.display = (targetId === 'pm-sub-content-restore') ? 'block' : 'none';
                        document.getElementById('pm-sub-content-sweeper').style.display = (targetId === 'pm-sub-content-sweeper') ? 'block' : 'none';

                        if (targetId === 'pm-sub-content-profiler') {
                            const gradeEl = document.getElementById('pm-db-grade');
                            if (gradeEl && gradeEl.textContent === '-') {
                                pmFetchDbProfile();
                            }
                        }
                    });
                });

                const runProfileBtn = document.getElementById('pm-btn-run-profile');
                if (runProfileBtn) {
                    runProfileBtn.addEventListener('click', function() {
                        pmFetchDbProfile();
                    });
                }

                function pmFetchDbProfile() {
                    if (runProfileBtn) {
                        runProfileBtn.disabled = true;
                        runProfileBtn.innerHTML = '⚙️ Analyzing...'; // nosec
                    }

                    FetchEngine.post('profile_database')
                        .then(data => {
                            if (runProfileBtn) {
                                runProfileBtn.disabled = false;
                                runProfileBtn.innerHTML = '🔄 Refresh Profile Analysis'; // nosec
                            }

                            if (!data.success) {
                                showPremiumAlert('Analysis Failed', data.error || 'Failed to profile database.', 'error');
                                return;
                            }

                            const gradeEl = document.getElementById('pm-db-grade');
                            const gradeLabelEl = document.getElementById('pm-db-grade-label');
                            const totalFreeEl = document.getElementById('pm-db-total-free');
                            const fragRatioEl = document.getElementById('pm-db-frag-ratio');
                            const tablesCountEl = document.getElementById('pm-db-tables-count');

                            if (gradeEl) {
                                gradeEl.textContent = data.summary.grade;
                                if (data.summary.grade === 'A') gradeEl.style.color = '#10b981';
                                else if (data.summary.grade === 'B') gradeEl.style.color = '#3b82f6';
                                else if (data.summary.grade === 'C') gradeEl.style.color = '#f59e0b';
                                else gradeEl.style.color = '#ef4444';
                            }
                            if (gradeLabelEl) {
                                if (data.summary.grade === 'A') gradeLabelEl.textContent = 'Excellent Health';
                                else if (data.summary.grade === 'B') gradeLabelEl.textContent = 'Good Health';
                                else if (data.summary.grade === 'C') gradeLabelEl.textContent = 'Minor Fragmentation';
                                else gradeLabelEl.textContent = 'Action Required';
                            }
                            if (totalFreeEl) totalFreeEl.textContent = (data.summary.total_free / 1024 / 1024).toFixed(2) + ' MB';
                            if (fragRatioEl) fragRatioEl.textContent = data.summary.ratio.toFixed(2) + '%';
                            if (tablesCountEl) tablesCountEl.textContent = data.summary.total_tables + ' tables monitored';

                            const tableTbody = document.querySelector('#pm-db-profiler-table tbody');
                            if (tableTbody) {
                                if (data.fragmented_tables.length === 0) {
                                    tableTbody.innerHTML = /* nosec */ `
                                        <tr class="pm-empty-row">
                                            <td colspan="6" style="padding: 0;">
                                                <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                    <div class="pm-empty-state-icon" style="color: #10b981;">🎉</div>
                                                    <div class="pm-empty-state-text">No Fragmentation Detected</div>
                                                    <div class="pm-empty-state-subtext">All PrestaShop tables are optimized! Health grade: A</div>
                                                </div>
                                            </td>
                                        </tr>`; // nosec
                                } else {
                                    let html = '';
                                    data.fragmented_tables.forEach(t => {
                                        const sizeMb = (t.size / 1024 / 1024).toFixed(2) + ' MB';
                                        const freeMb = (t.free / 1024 / 1024).toFixed(2) + ' MB';
                                        
                                        html += `<tr>
                                            <td style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary); vertical-align: middle;">${escapeHtml(t.name)}</td>
                                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${escapeHtml(t.engine)}</td>
                                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${sizeMb}</td>
                                            <td style="color: #f59e0b; font-weight: 600; vertical-align: middle;">${freeMb}</td>
                                            <td style="vertical-align: middle;"><span class="pm-badge" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">${t.ratio}%</span></td>
                                            <td style="vertical-align: middle;">
                                                <button type="button" class="pm-btn pm-btn-success pm-text-xs pm-btn-optimize" data-table="${escapeHtml(t.name)}" style="padding: 0.3rem 0.6rem;">
                                                    ⚡ Optimize
                                                </button>
                                            </td>
                                        </tr>`;
                                    });
                                    tableTbody.innerHTML = html; // nosec

                                    tableTbody.querySelectorAll('.pm-btn-optimize').forEach(btn => {
                                        btn.addEventListener('click', function() {
                                            const tableName = this.getAttribute('data-table');
                                            pmOptimizeTable(tableName, this);
                                        });
                                    });
                                }
                            }
                        })
                        .catch(error => {
                            if (runProfileBtn) {
                                runProfileBtn.disabled = false;
                                runProfileBtn.innerHTML = '🔄 Refresh Profile Analysis'; // nosec
                            }
                        });
                }

                function pmOptimizeTable(tableName, btnEl) {
                    showPremiumConfirmModal(
                         'Confirm Table Optimization',
                         `Are you sure you want to optimize table <strong style="color: var(--pm-text-primary);">${escapeHtml(tableName)}</strong>?<br><br>MySQL will recreate the table to reclaim unused disk space and rebuild indexes. During this brief operation, the table may be locked.`,
                         null,
                         () => {
                             btnEl.disabled = true;
                             btnEl.innerHTML = '⚙️ Optimizing...'; // nosec
                             FetchEngine.post('optimize_table', { table: tableName })
                                 .then(data => {
                                     showPremiumToast(`Successfully optimized table: ${tableName}`);
                                     pmFetchDbProfile();
                                 })
                                 .catch(err => {
                                     btnEl.disabled = false;
                                     btnEl.innerHTML = '⚡ Optimize'; // nosec
                                 });
                         }
                    );
                }



                function initiateDatabaseRestore(backupName) {
                    showPremiumConfirmModal(
                        'Database Overwrite Verification',
                        `You are about to overwrite active database catalog tables with: <strong>${backupName}</strong>.<br><br><span style="color: #ef4444; font-weight: bold;">CRITICAL WARNING:</span> This will DROP existing active tables and recreate them. This operation cannot be canceled once started.<br><br>To proceed, please type <strong style="color: #ef4444;">RESTORE</strong> below:`,
                        'RESTORE',
                        () => {
                            startRestoreExecution(backupName);
                        }
                    );
                }

                function startRestoreExecution(backupName) {
                    const hud = document.getElementById('pm-restore-hud');
                    const percentText = document.getElementById('pm-restore-percent');
                    const progressBar = document.getElementById('pm-restore-progress-bar');
                    const statsExecuted = document.getElementById('pm-restore-stats-executed');
                    const statsAction = document.getElementById('pm-restore-stats-action');
                    const hudState = document.getElementById('pm-restore-hud-state');
                    const logTerminal = document.getElementById('pm-restore-log-terminal');
                    const alertContainer = document.getElementById('pm-restore-shop-alert');

                    if (hud) hud.style.display = 'block';
                    if (alertContainer) alertContainer.style.display = 'none';
                    if (logTerminal) logTerminal.textContent = 'STAGE 1: Enforcing safety bounds. Putting shop to Maintenance...\n';
                    if (statsAction) statsAction.textContent = 'Enforcing safety...';
                    if (hudState) hudState.textContent = 'STAGE 1: PRE-FLIGHT';
                    
                    if (hud) {
                        hud.scrollIntoView({ behavior: 'smooth' });
                    }

                    FetchEngine.post('prepare_restore', { backup_name: backupName })
                        .then(prepData => {

                            const totalStatements = prepData.statement_count;
                            const wasShopEnabled = prepData.was_shop_enabled;
                            
                            logTerminal.textContent += `Success: Staged ${totalStatements} SQL statements.\n`;
                            logTerminal.textContent += `STAGE 2: Commencing chunked execution loop (Chunk size: 100 queries)...\n`;
                            
                            let currentOffset = 0;
                            const limit = 100;
                            
                            function executeNextChunk() {
                                if (currentOffset >= totalStatements) {
                                    finalizeRestore(backupName, wasShopEnabled);
                                    return;
                                }

                                if (statsAction) statsAction.textContent = `Queries: ${currentOffset} to ${Math.min(totalStatements, currentOffset + limit)}`;
                                if (hudState) hudState.textContent = `STAGE 2: REBUILDING (${currentOffset} / ${totalStatements})`;

                                FetchEngine.post('execute_restore_chunk', { backup_name: backupName, offset: currentOffset, limit: limit })
                                    .then(chunkData => {

                                        const executed = chunkData.executed_count;
                                        currentOffset = chunkData.new_offset;
                                        
                                        const percent = Math.min(100, Math.round((currentOffset / totalStatements) * 100));
                                        if (percentText) percentText.textContent = percent + '%';
                                        if (progressBar) progressBar.style.width = percent + '%';
                                        if (statsExecuted) statsExecuted.textContent = `${currentOffset} / ${totalStatements}`;
                                        
                                        logTerminal.textContent += `Executed statement chunk: queries ${currentOffset - executed} to ${currentOffset} completed successfully.\n`;
                                        logTerminal.scrollTop = logTerminal.scrollHeight;

                                        executeNextChunk();
                                    })
                                    .catch(err => {
                                        logTerminal.textContent += `\nCRITICAL FAILURE: ${err.message}\n`;
                                        logTerminal.scrollTop = logTerminal.scrollHeight;
                                        if (statsAction) {
                                            statsAction.textContent = 'CRASHED';
                                            statsAction.style.color = '#ef4444';
                                        }
                                        if (hudState) {
                                            hudState.textContent = 'FAILURE';
                                            hudState.className = 'pm-status-pill danger';
                                        }
                                        showPremiumAlert('Restoration Failed', 'Restoration sequence failed! Check terminal logs for detailed queries diagnostic.', 'error');
                                    });
                            }

                            executeNextChunk();
                        })
                        .catch(err => {
                            logTerminal.textContent += `\nCRITICAL PRE-FLIGHT ERROR: ${err.message}\n`;
                            logTerminal.scrollTop = logTerminal.scrollHeight;
                            if (statsAction) {
                                statsAction.textContent = 'CRASHED';
                                statsAction.style.color = '#ef4444';
                            }
                            showPremiumAlert('Pre-Flight Failure', 'Staging preparation failed: ' + err.message, 'error');
                        });
                }

                function finalizeRestore(backupName, wasShopEnabled) {
                    const percentText = document.getElementById('pm-restore-percent');
                    const progressBar = document.getElementById('pm-restore-progress-bar');
                    const statsAction = document.getElementById('pm-restore-stats-action');
                    const hudState = document.getElementById('pm-restore-hud-state');
                    const logTerminal = document.getElementById('pm-restore-log-terminal');
                    const alertContainer = document.getElementById('pm-restore-shop-alert');

                    if (percentText) percentText.textContent = '100%';
                    if (progressBar) progressBar.style.width = '100%';
                    if (statsAction) statsAction.textContent = 'Finalizing...';
                    if (hudState) hudState.textContent = 'STAGE 3: FINALIZATION';
                    
                    FetchEngine.post('complete_restore', { backup_name: backupName, was_shop_enabled: wasShopEnabled ? 1 : 0 })
                        .then(data => {
                            logTerminal.textContent += `\nSUCCESS: Database restoration sequence completed smoothly!\n`;
                            logTerminal.scrollTop = logTerminal.scrollHeight;
                            
                            if (statsAction) {
                                statsAction.textContent = 'SUCCESS';
                                statsAction.style.color = '#10b981';
                            }
                            if (hudState) {
                                hudState.textContent = 'COMPLETE';
                                hudState.className = 'pm-status-pill success';
                            }

                            const generalTerminal = document.getElementById('pm-log-terminal');
                            if (generalTerminal && data.log_content) {
                                generalTerminal.textContent = data.log_content;
                            }

                            if (data.shop_status === 'MAINTENANCE') {
                                if (alertContainer) alertContainer.style.display = 'block';
                            } else {
                                showPremiumToast('Success! Catalog database restored and store set LIVE.');
                            }
                        });
                }

                // K. External SQL Drag & Drop File Upload Stager
                const dropzone = document.getElementById('pm-restore-dropzone');
                const fileInput = document.getElementById('pm-restore-file-input');
                const fileNameSpan = document.getElementById('pm-restore-file-name');
                const btnUploadStage = document.getElementById('pm-btn-upload-stage');
                
                let selectedFile = null;

                if (dropzone && fileInput && btnUploadStage) {
                    dropzone.addEventListener('click', () => fileInput.click());
                    
                    dropzone.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        dropzone.style.background = 'rgba(59, 130, 246, 0.04)';
                        dropzone.style.borderColor = '#3b82f6';
                    });
                    
                    dropzone.addEventListener('dragleave', () => {
                        dropzone.style.background = 'var(--pm-input-bg)';
                        dropzone.style.borderColor = 'var(--pm-border-color)';
                    });
                    
                    dropzone.addEventListener('drop', (e) => {
                        e.preventDefault();
                        dropzone.style.background = 'var(--pm-input-bg)';
                        dropzone.style.borderColor = 'var(--pm-border-color)';
                        
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleFileSelected(e.dataTransfer.files[0]);
                        }
                    });
                    
                    fileInput.addEventListener('change', (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            handleFileSelected(e.target.files[0]);
                        }
                    });
                    
                    function handleFileSelected(file) {
                        const ext = file.name.split('.').pop().toLowerCase();
                        if (ext !== 'sql' && ext !== 'gz') {
                            alert('Invalid file format. Please select a valid .sql or .sql.gz file.');
                            selectedFile = null;
                            fileNameSpan.textContent = 'Click or drag SQL/GZ file here...';
                            btnUploadStage.disabled = true;
                            return;
                        }
                        
                        selectedFile = file;
                        fileNameSpan.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                        btnUploadStage.disabled = false;
                    }
                    
                    let currentUploadXhr = null;
                    const btnUploadCancel = document.getElementById('pm-btn-upload-cancel');
                    const uploadProgressContainer = document.getElementById('pm-upload-progress-container');
                    const uploadProgressBar = document.getElementById('pm-upload-progress-bar');
                    const uploadPercent = document.getElementById('pm-upload-percent');

                    if (btnUploadCancel) {
                        btnUploadCancel.addEventListener('click', () => {
                            if (currentUploadXhr) {
                                currentUploadXhr.abort();
                                currentUploadXhr = null;
                            }
                            
                            btnUploadStage.disabled = false;
                            btnUploadStage.innerHTML = '📤 Upload & Stage'; // nosec
                            btnUploadCancel.style.display = 'none';
                            uploadProgressContainer.style.display = 'none';
                            uploadProgressBar.style.width = '0%';
                            uploadPercent.textContent = '0%';
                            
                            selectedFile = null;
                            fileNameSpan.textContent = 'Click or drag SQL/GZ file here...';
                            btnUploadStage.disabled = true;
                            document.getElementById('pm-restore-file-input').value = '';
                        });
                    }

                    btnUploadStage.addEventListener('click', () => {
                        if (!selectedFile) return;
                        
                        btnUploadStage.disabled = true;
                        const originalText = btnUploadStage.innerHTML;
                        btnUploadStage.innerHTML = '📤 Uploading...'; // nosec
                        
                        btnUploadCancel.style.display = 'block';
                        uploadProgressContainer.style.display = 'block';
                        uploadProgressBar.style.width = '0%';
                        uploadPercent.textContent = '0%';
                        
                        const formData = new FormData();
                        formData.append('file', selectedFile);
                        
                        currentUploadXhr = new XMLHttpRequest();
                        currentUploadXhr.open('POST', window.location.href + '&ajax=1&action=upload_restore_file');
                        
                        currentUploadXhr.upload.onprogress = function(event) {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                uploadProgressBar.style.width = percentComplete + '%';
                                uploadPercent.textContent = percentComplete + '%';
                            }
                        };
                        
                        currentUploadXhr.onload = function() {
                            currentUploadXhr = null;
                            btnUploadStage.disabled = false;
                            btnUploadStage.innerHTML = originalText; // nosec
                            btnUploadCancel.style.display = 'none';
                            uploadProgressContainer.style.display = 'none';
                            
                            if (this.status >= 200 && this.status < 300) {
                                try {
                                    const data = JSON.parse(this.responseText);
                                    if (data.success) {
                                        showPremiumToast(data.message);
                                        pmRenderAllGrids(data.backups || []);
                                        
                                        selectedFile = null;
                                        fileNameSpan.textContent = 'Click or drag SQL/GZ file here...';
                                        btnUploadStage.disabled = true;
                                        document.getElementById('pm-restore-file-input').value = '';
                                    } else {
                                        showPremiumAlert('Upload Failed', data.error, 'danger');
                                    }
                                } catch(e) {
                                    showPremiumAlert('Upload Failed', 'Invalid server response.', 'danger');
                                }
                            } else {
                                showPremiumAlert('Upload Failed', 'Server error ' + this.status, 'danger');
                            }
                        };
                        
                        currentUploadXhr.onerror = function() {
                            currentUploadXhr = null;
                            btnUploadStage.disabled = false;
                            btnUploadStage.innerHTML = originalText; // nosec
                            btnUploadCancel.style.display = 'none';
                            uploadProgressContainer.style.display = 'none';
                            showPremiumAlert('Network Error', 'A network error occurred during upload.', 'danger');
                        };
                        
                        currentUploadXhr.send(formData);
                    });
                }

                // L. Maintenance Mode Manual Live Engager
                const btnSetLive = document.getElementById('pm-btn-restore-set-live');
                if (btnSetLive) {
                    btnSetLive.addEventListener('click', function() {
                        btnSetLive.disabled = true;
                        FetchEngine.post('set_shop_live')
                            .then(data => {
                                btnSetLive.disabled = false;
                                showPremiumToast(data.message);
                                const alertContainer = document.getElementById('pm-restore-shop-alert');
                                if (alertContainer) alertContainer.style.display = 'none';
                            })
                            .catch(err => {
                                btnSetLive.disabled = false;
                            });
                    });
                }



                const btnClearBackups = document.getElementById('pm-btn-clear-backups');
                if (btnClearBackups) {
                    btnClearBackups.addEventListener('click', function() {
                        if (!window.PM_CONFIG.backups || window.PM_CONFIG.backups.length === 0) {
                            showPremiumAlert('Nothing to Clear', 'There is nothing to clear. No backup archives are currently stored.', 'info');
                            return;
                        }
                        showPremiumConfirmModal(
                            'Clear All Backups',
                            'You are about to permanently purge all generated local Gzip catalog backups. This action cannot be undone.<br><br>To proceed, please type <strong style="color: #ef4444;">CLEAR</strong> below:',
                            'CLEAR',
                            () => {
                                FetchEngine.post('clear_backup_history')
                                    .then(data => {
                                        showPremiumToast('All database backups purged successfully.');
                                        
                                        // Rebuild table body to empty
                                        pmRenderAllGrids([]);
                                    });
                            }
                        );
                    });
                }



                window.pmInspectTableDiff = function(backupName, tableName) {
                    const drawer = document.getElementById('pm-drift-detail-drawer');
                    if(drawer) drawer.style.display = 'none'; // hide drawer to focus on diff
                    
                    showPremiumToast('Fetching row-level diff for ' + tableName + '...');
                    
                    FetchEngine.post('diff_table_rows', { file: backupName, table: tableName })
                        .then(data => {
                            if (!data.diffs) {
                                showPremiumAlert('Error', 'Diff data is missing from response.', 'danger');
                                return;
                            }
                            
                            const d = data.diffs;
                            let html = `<div style="margin-bottom: 1rem; padding: 1rem; background-color: var(--pm-card-bg); border-radius: 8px; border: 1px solid var(--pm-border-color);">
                                <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 0.8rem;"><strong style="color: #10b981;">Added:</strong> ${escapeHtml(d.summary.added)}</span>
                                    <span style="font-size: 0.8rem;"><strong style="color: #ef4444;">Deleted:</strong> ${escapeHtml(d.summary.deleted)}</span>
                                    <span style="font-size: 0.8rem;"><strong style="color: #f59e0b;">Modified:</strong> ${escapeHtml(d.summary.modified)}</span>
                                </div>
                                <span style="font-size: 0.7rem; color: var(--pm-text-secondary);">Showing up to 50 items per category. For full data, use the Export button.</span>
                            </div>`;
 
                            // Render Modified
                            if (d.modified_rows && d.modified_rows.length > 0) {
                                html += `<h5 style="margin-top: 1rem; color: var(--pm-text-primary); font-family: 'Outfit'; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.3rem;">Modified Rows</h5>`;
                                html += `<div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">`;
                                d.modified_rows.forEach(r => {
                                    let changesHtml = '';
                                    Object.keys(r.changes).forEach(col => {
                                        let c = r.changes[col];
                                        changesHtml += `<div style="margin-top: 0.2rem; font-size: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.3rem; border-radius: 4px;">
                                            <span style="color: var(--pm-text-secondary); font-family: monospace;">${escapeHtml(col)}:</span> 
                                            <span style="text-decoration: line-through; color: #ef4444;">${escapeHtml(c.backup || 'NULL')}</span> ➔ 
                                            <span style="color: #10b981;">${escapeHtml(c.live || 'NULL')}</span>
                                        </div>`;
                                    });
                                    html += `<div style="padding: 0.5rem; border: 1px solid var(--pm-border-color); border-left: 3px solid #f59e0b; border-radius: 4px;">
                                        <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem;">PK: ${escapeHtml(r.pk)}</div>
                                        ${changesHtml}
                                    </div>`;
                                });
                                html += `</div>`;
                            }

                            // Render Added
                            if (d.added_rows && d.added_rows.length > 0) {
                                html += `<h5 style="margin-top: 1rem; color: var(--pm-text-primary); font-family: 'Outfit'; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.3rem;">Added Rows</h5>`;
                                html += `<div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">`;
                                d.added_rows.forEach(r => {
                                    let colsHtml = '';
                                    Object.keys(r).forEach(col => {
                                        colsHtml += `<div style="margin-top: 0.2rem; font-size: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.3rem; border-radius: 4px; color: var(--pm-text-primary);">
                                            <span style="color: var(--pm-text-secondary); font-family: monospace;">${escapeHtml(col)}:</span> 
                                            <span style="color: #10b981;">${escapeHtml(String(r[col] ?? 'NULL'))}</span>
                                        </div>`;
                                    });
                                    let pkVal = d.primary_key && r[d.primary_key] !== undefined ? r[d.primary_key] : 'N/A';
                                    html += `<div style="padding: 0.5rem; border: 1px solid var(--pm-border-color); border-left: 3px solid #10b981; border-radius: 4px; color: var(--pm-text-primary);">
                                        <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem; color: var(--pm-text-primary);">PK: ${escapeHtml(pkVal)}</div>
                                        ${colsHtml}
                                    </div>`;
                                });
                                html += `</div>`;
                            }

                            // Render Deleted
                            if (d.deleted_rows && d.deleted_rows.length > 0) {
                                html += `<h5 style="margin-top: 1rem; color: var(--pm-text-primary); font-family: 'Outfit'; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.3rem;">Deleted Rows</h5>`;
                                html += `<div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">`;
                                d.deleted_rows.forEach(r => {
                                    let colsHtml = '';
                                    Object.keys(r).forEach(col => {
                                        colsHtml += `<div style="margin-top: 0.2rem; font-size: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.3rem; border-radius: 4px; color: var(--pm-text-primary);">
                                            <span style="color: var(--pm-text-secondary); font-family: monospace;">${escapeHtml(col)}:</span> 
                                            <span style="color: #ef4444; text-decoration: line-through;">${escapeHtml(String(r[col] ?? 'NULL'))}</span>
                                        </div>`;
                                    });
                                    let pkVal = d.primary_key && r[d.primary_key] !== undefined ? r[d.primary_key] : 'N/A';
                                    html += `<div style="padding: 0.5rem; border: 1px solid var(--pm-border-color); border-left: 3px solid #ef4444; border-radius: 4px; color: var(--pm-text-primary);">
                                        <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem; color: var(--pm-text-primary);">PK: ${escapeHtml(pkVal)}</div>
                                        ${colsHtml}
                                    </div>`;
                                });
                                html += `</div>`;
                            }
 
                            // Set close callback to restore the Key Sync Audit modal with last drawer
                            window.onPremiumModalClose = () => {
                                if (window.PM_LAST_COMPARE) {
                                    window.pmRenderKeySyncAuditModal(window.PM_LAST_COMPARE, window.PM_LAST_COMPARE_DRAWER_TYPE);
                                }
                            };
 
                            showPremiumConfirmModal('Row Diff: ' + escapeHtml(tableName), html, null, null);
                        })
                        .catch(err => {
                            showPremiumAlert('Error', 'Failed to fetch row diffs.', 'danger');
                        });
                };

                window.pmInspectProductDeltas = function(type) {
                    const data = window.PM_LAST_COMPARE;
                    if (!data) return;
                    
                    const products = type === 'added' ? (data.added || []) : (data.deleted || []);
                    if (products.length === 0) return;
                    
                    const color = type === 'added' ? '#10b981' : '#ef4444';
                    const title = type === 'added' ? 'Added Products' : 'Deleted Products';
                    
                    let html = `<div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.5rem;">`;
                    html += products.map(i => {
                        return `<div style="background-color: ${color}10; border-left: 3px solid ${color}; padding: 0.6rem; border-radius: 0 4px 4px 0; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; flex-direction: column; gap: 0.2rem; width: 100%;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: var(--pm-text-primary); font-family: monospace;">ID: ${escapeHtml(i.id_product)}</span>
                                    <span style="font-size: 0.8rem; color: var(--pm-text-secondary); font-family: monospace;">Ref: ${escapeHtml(i.reference || 'N/A')}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.85rem; color: var(--pm-text-secondary);">${escapeHtml(i.name)}</span>
                                    <span style="font-size: 0.85rem; color: var(--pm-text-primary); font-weight: 600;">$${parseFloat(i.price).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('');
                    html += `</div>`;
                    
                    // Set close callback to restore Key Sync Audit modal with last drawer
                    window.onPremiumModalClose = () => {
                        if (window.PM_LAST_COMPARE) {
                            window.pmRenderKeySyncAuditModal(window.PM_LAST_COMPARE, window.PM_LAST_COMPARE_DRAWER_TYPE);
                        }
                    };
 
                    showPremiumConfirmModal(title + ` (${products.length})`, html, null, null);
                };
 
                window.pmRenderKeySyncAuditModal = function(data, autoOpenDrawerType = null) {
                    let statusColor = '#10b981';
                    let statusText = 'STABLE (100% Identical)';
                    if (data.added_count === 0 && data.deleted_count === 0 && data.backup_rows === data.active_rows) {
                        if (data.checksum_drift) {
                            statusText = 'CONTENT DRIFT DETECTED (Row counts match, but content checksums differ)';
                            statusColor = '#f59e0b';
                        }
                    } else {
                        statusText = 'STRUCTURAL DRIFT DETECTED (Row count discrepancy)';
                        statusColor = '#ef4444';
                    }
 
                    let checksumsHtml = '';
                    let volatileCount = 0;
                    let modifiedCount = 0;
                    let volatileTables = [];
                    let modifiedTables = [];
 
                    if (data.checksum_status) {
                        Object.keys(data.checksum_status).forEach(tbl => {
                            const c = data.checksum_status[tbl];
                            let badge = '';
                            if (c.match === true) {
                                badge = '<span class="pm-status-pill success" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px;">IDENTICAL</span>';
                            } else if (c.match === false) {
                                let driftStatus = 'Checksum Mismatch';
                                if (c.active === 'MISSING') driftStatus = 'Missing in Active DB';
                                else if (c.backup === null) driftStatus = 'Missing in Backup Archive';
 
                                let driftMeta = {
                                    name: tbl,
                                    active_rows: c.active_rows !== undefined ? c.active_rows : 0,
                                    backup_rows: c.backup_rows !== undefined ? c.backup_rows : 0,
                                    status: driftStatus
                                };
 
                                if (c.volatile) {
                                    badge = '<span class="pm-status-pill warning" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);" title="Session/log tables update automatically on every request.">VOLATILE</span>';
                                    volatileCount++;
                                    volatileTables.push(driftMeta);
                                } else {
                                    badge = '<span class="pm-status-pill danger" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px;">MODIFIED</span>';
                                    modifiedCount++;
                                    modifiedTables.push(driftMeta);
                                }
                            } else {
                                badge = '<span class="pm-status-pill warning" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px;">UNSUPPORTED</span>';
                            }
                            checksumsHtml += `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--pm-border-color);">
                                    <div style="display: flex; flex-direction: column; gap: 0.15rem; text-align: left;">
                                        <span style="font-family: monospace; font-weight:600;">${escapeHtml(tbl)}</span>
                                        <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">
                                            Rows: ${c.backup_rows !== undefined ? escapeHtml(c.backup_rows) : 'N/A'} ➔ ${c.active_rows !== undefined ? escapeHtml(c.active_rows) : 'N/A'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="font-family: monospace; font-size: 0.75rem; color: var(--pm-text-secondary);">
                                            ${c.backup ? escapeHtml(c.backup) : 'N/A'} ➔ ${escapeHtml(c.active)}
                                        </span>
                                        ${badge}
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        checksumsHtml = '<div style="color: var(--pm-text-secondary); text-align: center; padding: 0.5rem;">No table checksum metadata found.</div>';
                    }
 
                    let modalBody = `
                        <div class="pm-metric-row" style="margin-bottom: 1rem;">
                            <span class="pm-metric-label">Staging Database Integrity</span>
                            <span class="pm-metric-value" style="font-weight: 700; font-family: 'Outfit'; color: ${statusColor};">${escapeHtml(statusText)}</span>
                        </div>
                        <div class="pm-grid" style="margin-bottom: 1.5rem; grid-template-columns: repeat(3, 1fr);">
                            <div class="pm-card" style="padding: 1rem;">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Backup Tables Rows</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit';">${escapeHtml(data.backup_rows)}</div>
                            </div>
                            <div class="pm-card" style="padding: 1rem;">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Active Tables Rows</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit';">${escapeHtml(data.active_rows)}</div>
                            </div>
                            <div class="pm-card" id="pm-card-added" data-count="${data.added_count}" style="padding: 1rem; cursor: ${data.added_count > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Added Products (Deltas)</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: #10b981;">+${data.added_count}</div>
                                ${data.added_count > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                            <div class="pm-card" id="pm-card-deleted" data-count="${data.deleted_count}" style="padding: 1rem; cursor: ${data.deleted_count > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Deleted Products (Deltas)</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: #ef4444;">-${data.deleted_count}</div>
                                ${data.deleted_count > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                            <div class="pm-card" id="pm-card-modified" data-count="${modifiedCount}" style="padding: 1rem; cursor: ${modifiedCount > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Modified Tables</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: ${modifiedCount > 0 ? '#ef4444' : 'var(--pm-text-primary)'};">${modifiedCount}</div>
                                ${modifiedCount > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                            <div class="pm-card" id="pm-card-volatile" data-count="${volatileCount}" style="padding: 1rem; cursor: ${volatileCount > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Volatile Tables</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: ${volatileCount > 0 ? '#f59e0b' : 'var(--pm-text-primary)'};">${volatileCount}</div>
                                ${volatileCount > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                        </div>
                        <div id="pm-drift-detail-drawer" style="display: none; margin-top: -1rem; margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--pm-border-color); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span id="pm-drawer-title" style="font-size: 0.8rem; font-weight: 600; color: var(--pm-text-primary); font-family: 'Outfit';"></span>
                                <span style="cursor: pointer; font-size: 0.75rem; color: var(--pm-text-secondary);" onclick="document.getElementById('pm-drift-detail-drawer').style.display='none'">✕ Close</span>
                            </div>
                            <div id="pm-drawer-body" style="max-height: 120px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 0.4rem; font-family: monospace;"></div>
                        </div>
                        <span class="pm-subtitle" style="display: block; margin-top: 1rem; margin-bottom: 0.5rem;">Database Tables Content Integrity</span>
                        <div style="max-height: 250px; overflow-y: auto; background-color: var(--pm-card-bg); border: 1px solid var(--pm-border-color); border-radius: 8px; padding: 0.5rem 1rem; margin-bottom: 1.5rem;">
                            ${checksumsHtml}
                        </div>
                        <span class="pm-subtitle" style="display: block; margin-bottom: 0.5rem;">Staging Telemetry Log Checksum</span>
                        <pre class="pm-log-terminal" style="max-height: 180px; font-size: 0.8rem; margin-bottom: 0;">${escapeHtml(data.log_metadata)}</pre>
                    `;
 
                    window.PM_LAST_COMPARE = data;
                    showPremiumConfirmModal('Key Sync Audit: ' + escapeHtml(data.backup_name), modalBody, null, null);
 
                    const bindDrawer = (cardId, title, items, color, type) => {
                        const card = document.getElementById(cardId);
                        if (card && parseInt(card.dataset.count) > 0) {
                            const handleOpenDrawer = () => {
                                window.PM_LAST_COMPARE_DRAWER_TYPE = type;
                                const drawer = document.getElementById('pm-drift-detail-drawer');
                                const dTitle = document.getElementById('pm-drawer-title');
                                const dBody = document.getElementById('pm-drawer-body');
                                drawer.style.display = 'block';
 
                                // Add Inspect All & Export Buttons if type is products
                                let exportBtn = '';
                                if (type === 'products_added' || type === 'products_deleted') {
                                    const inspectType = type === 'products_added' ? 'added' : 'deleted';
                                    exportBtn = `
                                        <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.5rem; margin-left: 1rem; background-color: var(--pm-primary); border-radius: 4px; box-shadow: none;" onclick="window.pmInspectProductDeltas('${inspectType}')">Inspect All</button>
                                        <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.5rem; margin-left: 0.5rem; background-color: var(--pm-neutral); border-radius: 4px; box-shadow: none;" onclick="window.location.href='${window.location.href}&ajax=1&action=export_diff&file=${escapeHtml(data.backup_name)}&table=product_deltas&format=csv'">Export CSV</button>
                                    `;
                                }
                                dTitle.innerHTML = title + exportBtn; // nosec
 
                                dBody.innerHTML = items.map(i => { // nosec
                                    if (typeof i === 'object' && i.id_product) {
                                        // Rich Product Delta Rendering
                                        return `<div style="background-color: ${color}10; border-left: 3px solid ${color}; padding: 0.4rem 0.6rem; border-radius: 0 4px 4px 0; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                                            <div style="display: flex; flex-direction: column; gap: 0.15rem; width: 100%;">
                                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                                    <span style="font-weight: 600; color: var(--pm-text-primary); font-family: monospace;">ID: ${escapeHtml(i.id_product)}</span>
                                                    <span style="font-size: 0.7rem; color: var(--pm-text-secondary);">Ref: ${escapeHtml(i.reference || 'N/A')}</span>
                                                </div>
                                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">${escapeHtml(i.name)}</span>
                                                    <span style="font-size: 0.75rem; color: var(--pm-text-primary); font-weight: 600;">$${parseFloat(i.price).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>`;
                                    } else if (typeof i === 'object') {
                                        // Table Item Rendering
                                        let diff = parseInt(i.active_rows) - parseInt(i.backup_rows);
                                        let diffText = diff > 0 ? ` (+${diff})` : (diff < 0 ? ` (${diff})` : '');
                                        let diffColor = diff > 0 ? '#10b981' : (diff < 0 ? '#ef4444' : 'var(--pm-text-secondary)');
 
                                        // Add Diff and Export Buttons
                                        let actionBtns = '';
                                        if (type === 'modified_tables' || type === 'volatile_tables') {
                                            actionBtns = `
                                                <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background-color: var(--pm-primary); border-radius: 4px; box-shadow: none;" onclick="window.pmInspectTableDiff('${escapeHtml(data.backup_name)}', '${escapeHtml(i.name)}')">Inspect</button>
                                                <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background-color: var(--pm-neutral); border-radius: 4px; box-shadow: none;" onclick="window.location.href='${window.location.href}&ajax=1&action=export_diff&file=${escapeHtml(data.backup_name)}&table=${escapeHtml(i.name)}&format=csv'">Export</button>
                                            `;
                                        }
 
                                        return `<div style="background-color: ${color}10; border-left: 3px solid ${color}; padding: 0.4rem 0.6rem; border-radius: 0 4px 4px 0; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                                            <span style="font-weight: 600; color: var(--pm-text-primary); font-family: monospace;">${escapeHtml(i.name)}</span>
                                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                                <span style="font-size: 0.65rem; color: ${color}; border: 1px solid ${color}40; padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 600; font-family: 'Outfit';">${escapeHtml(i.status)}</span>
                                                <span style="font-size: 0.75rem; color: var(--pm-text-secondary); font-family: monospace;">A:${escapeHtml(i.active_rows)} / B:${escapeHtml(i.backup_rows)} <strong style="color: ${diffColor}">${escapeHtml(diffText)}</strong></span>
                                                ${actionBtns}
                                            </div>
                                        </div>`;
                                    } else {
                                        return `<span style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">${escapeHtml(i)}</span>`;
                                    }
                                }).join('');
                            };

                            card.addEventListener('click', handleOpenDrawer);

                            if (autoOpenDrawerType === type) {
                                handleOpenDrawer();
                            }
                        }
                    };

                    bindDrawer('pm-card-added', 'Added Products (Deltas)', data.added || [], '#10b981', 'products_added');
                    bindDrawer('pm-card-deleted', 'Deleted Products (Deltas)', data.deleted || [], '#ef4444', 'products_deleted');
                    bindDrawer('pm-card-modified', 'Modified Tables', modifiedTables, '#ef4444', 'modified_tables');
                    bindDrawer('pm-card-volatile', 'Volatile Tables', volatileTables, '#f59e0b', 'volatile_tables');
                };

    // --- Public API ---
    return {
        initialize: function() {
            // Initial render call
            if (typeof pmRenderAllGrids === 'function' && window.PM_CONFIG.backups) {
                pmRenderAllGrids(window.PM_CONFIG.backups);
            }


        },
        renderGrid: function(backups) {
            if (typeof pmRenderAllGrids === 'function') {
                pmRenderAllGrids(backups);
            }
        }
    };
})();
