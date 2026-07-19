/**
 * Project Mass - File Tools Engine (TX-153)
 * Handles File Backup generation, verification, and deletion.
 */
class FileToolsEngine {

    static initialize() {
        this.bindGenerateBackup();
        this.bindClearBackups();
        this.bindTableEvents();
        this.bindProfileSelect();
        this.loadDirectoryExclusions();
    }

    static bindProfileSelect() {
        const select = document.getElementById('pm-file-backup-profile');
        if (select) {
            select.addEventListener('change', () => {
                this.updateCheckboxesBasedOnProfile();
            });
        }
    }

    static bindGenerateBackup() {
        const btnFileBackup = document.getElementById('pm-btn-start-file-backup');
        if (!btnFileBackup) return;

        btnFileBackup.addEventListener('click', () => {
            UiEngine.showConfirmModal(
                'Confirm File Backup Execution',
                'You are about to initiate a file system archive sequence targeting the selected files and directories.<br><br>If the chosen profile contains many files, this can temporarily spike CPU utilization and IOPS on your server.<br><br>Are you sure you want to proceed?<br><br><span style="color: var(--pm-text-secondary); font-size: 0.9rem;">To confirm, please type <strong style="color: var(--pm-danger);">EXECUTE</strong> in the text box below.</span>',
                'EXECUTE',
                () => {
                    btnFileBackup.disabled = true;
                    btnFileBackup.innerHTML = '⚙️ Initializing Engine...'; // nosec
            
            const container = document.getElementById('pm-file-backup-progress-container');
            const bar = document.getElementById('pm-file-backup-progress-bar');
            const text = document.getElementById('pm-file-backup-progress-text');
            const percent = document.getElementById('pm-file-backup-progress-percent');
            
            container.style.display = 'block';
            bar.style.width = '0%';
            text.innerText = 'Scanning file system...';
            percent.innerText = '0%';

            const selectProfile = document.getElementById('pm-file-backup-profile');
            const profileVal = selectProfile ? selectProfile.value : 'full';

            FetchEngine.post('start_file_backup', { profile: profileVal })
            .then(data => {
                text.innerText = 'Compiling archive in memory-safe chunks...';
                const jobId = data.job_id;
                let source = null;
                
                const stopBtn = document.getElementById('pm-btn-stop-file-backup');
                if (stopBtn) {
                    stopBtn.disabled = false;
                    stopBtn.onclick = () => {
                        stopBtn.disabled = true;
                        text.innerText = 'Cancelling backup...';
                        FetchEngine.post('cancel_job', { job_id: jobId })
                        .then(() => {
                            window.showPremiumToast('Cancellation request sent.', 'success');
                        })
                        .catch(err => {
                            UiEngine.showAlert('Cancellation Error', err.message);
                        });
                    };
                }
                
                const handleStateUpdate = (d) => {
                    bar.style.width = d.progress + '%';
                    percent.innerText = Math.round(d.progress) + '%';
                    text.innerText = d.status_text || `Archived ${d.processed_items} of ${d.total_items} files`;
                    
                    if (d.status === 'completed') {
                        if (source) source.close();
                        btnFileBackup.innerHTML = '✅ Backup Completed!'; // nosec
                        bar.style.width = '100%';
                        percent.innerText = '100%';
                        
                        setTimeout(() => {
                            btnFileBackup.innerHTML = '📥 Generate Site Backup'; // nosec
                            btnFileBackup.disabled = false;
                            if (container) container.style.display = 'none';
                            if (d.backups) this.renderGrid(d.backups);
                        }, 3000);
                        return true;
                    } else if (d.status === 'cancelled') {
                        if (source) source.close();
                        btnFileBackup.innerHTML = '🛑 Backup Cancelled'; // nosec
                        if (container) container.style.display = 'none';
                        window.showPremiumToast('Backup cancelled successfully.', 'warning');
                        setTimeout(() => {
                            btnFileBackup.innerHTML = '📥 Generate Site Backup'; // nosec
                            btnFileBackup.disabled = false;
                            if (d.backups) this.renderGrid(d.backups);
                        }, 2000);
                        return true;
                    } else if (d.status === 'failed') {
                        throw new Error(d.error || 'Backup worker failed.');
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
                            UiEngine.showAlert('Archive Engine Error', err.message);
                            btnFileBackup.innerHTML = '❌ Backup Failed'; // nosec
                            btnFileBackup.disabled = false;
                            if (container) container.style.display = 'none';
                        });
                    };
                    setTimeout(poll, 1500);
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
                                UiEngine.showAlert('Archive Engine Error', err.message);
                                btnFileBackup.innerHTML = '❌ Backup Failed'; // nosec
                                btnFileBackup.disabled = false;
                                if (container) container.style.display = 'none';
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
            .catch(err => {
                UiEngine.showAlert('Engine Boot Error', err.message);
                btnFileBackup.innerHTML = '❌ Initialization Failed'; // nosec
                btnFileBackup.disabled = false;
            });
                }
            );
        });
    }

    static bindClearBackups() {
        const btnClearFileBackups = document.getElementById('pm-btn-clear-file-backups');
        if (!btnClearFileBackups) return;

        btnClearFileBackups.addEventListener('click', () => {
            UiEngine.showConfirmModal('Clear All File Backups?', 'Are you sure you want to permanently delete all generated ZIP archives? This cannot be undone. To confirm, please type <strong style="color: var(--pm-danger);">CLEAR</strong> below:', 'CLEAR', () => {
                FetchEngine.post('clear_file_backups')
                .then(data => {
                    this.renderGrid(data.backups || []);
                })
                .catch(err => {
                    UiEngine.showAlert('Error', err.message);
                });
            });
        });
    }

    static bindTableEvents() {
        const fileBackupsTable = document.getElementById('pm-file-backups-table');
        if (!fileBackupsTable) return;

        fileBackupsTable.addEventListener('click', (e) => {
            const btnDelete = e.target.closest('.pm-btn-delete-file-backup');
            if (btnDelete) {
                const backupName = btnDelete.getAttribute('data-backup');
                UiEngine.showConfirmModal('Delete File Archive?', `Are you sure you want to delete ${backupName}?`, 'DELETE', () => {
                    FetchEngine.post('delete_file_backup', { file: backupName })
                    .then(data => {
                        FileToolsEngine.renderGrid(data.backups || []);
                    })
                    .catch(err => {
                        UiEngine.showAlert('Error', err.message);
                    });
                });
                return;
            }

            const btnVerify = e.target.closest('.pm-btn-verify-backup');
            if (btnVerify) {
                const backupName = btnVerify.getAttribute('data-backup');
                const originalHtml = btnVerify.innerHTML;
                btnVerify.innerHTML = '⏳ Verifying...'; // nosec
                btnVerify.disabled = true;

                FetchEngine.post('verify_backup_integrity', { file: backupName })
                .then(data => {
                    btnVerify.innerHTML = originalHtml; // nosec
                    btnVerify.disabled = false;
                    UiEngine.showAlert('Cryptographic Integrity Verified', data.message, 'success');
                })
                .catch(err => {
                    btnVerify.innerHTML = originalHtml; // nosec
                    btnVerify.disabled = false;
                    UiEngine.showAlert('Corruption Detected', err.message, 'error');
                });
            }
        });
    }

    static renderGrid(backups) {
        const table = document.getElementById('pm-file-backups-table');
        if (!table) return;

        // Remove all existing tbody elements
        table.querySelectorAll('tbody').forEach(tb => tb.remove());

        if (!backups || backups.length === 0) {
            const emptyTbody = document.createElement('tbody');
            emptyTbody.innerHTML = '<tr class="pm-empty-row"><td colspan="4" style="text-align: center; padding: 2rem; color: var(--pm-text-secondary); font-style: italic;">No file system archives generated yet.</td></tr>'; // nosec
            table.appendChild(emptyTbody);
            return;
        }
        const adminUrl = window.PM_CONFIG ? window.PM_CONFIG.adminModulesUrl : '';

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

        backups.forEach(b => {
            const isUploaded = b.is_uploaded;
            let pill = '';
            let borderColor = '';
            let bgColor = '';
            
            if (!b.is_local && b.is_cloud) {
                pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">☁️ Cloud Only</span>`;
                borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
            } else if (isUploaded) {
                pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128194; Uploaded</span>`;
                borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
            } else {
                pill = `<span class="pm-status-pill success pm-base-status-badge" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128190; Local</span>`;
            }

            const durationBadge = b.duration ? `<span style="font-size: 0.65rem; color: var(--pm-text-secondary); display: inline-flex; align-items: center; gap: 0.2rem;"><span style="font-weight:600; color:var(--pm-text-primary);">Completed In:</span> ${escapeHtml(String(b.duration))}</span>` : '';

            const entryTbody = document.createElement('tbody');
            entryTbody.className = 'pm-backup-entry';
            if (borderColor) {
                entryTbody.style.borderLeft = '4px solid ' + borderColor;
                entryTbody.style.background = bgColor;
            }

            const trData = document.createElement('tr');
            trData.className = 'pm-data-row';
            trData.setAttribute('data-is-local', (b.is_local !== false) ? 'true' : 'false');
            trData.setAttribute('data-is-cloud', b.is_cloud ? 'true' : 'false');
            if (borderColor) { trData.style.borderLeft = '4px solid ' + borderColor; trData.style.background = bgColor; }

            const safeName = escapeHtml(b.basename);
            const safeSize = escapeHtml(String(b.size));

            let dateStr = '';
            if (b.timestamp) {
                const d = new Date(b.timestamp * 1000);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const h = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                const s = String(d.getSeconds()).padStart(2, '0');
                dateStr = y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
            }
            
            let actionsHtml = `
                <a href="${b.archive_download_url}" class="pm-btn pm-btn-sm" title="Download Backup">⬇️ Download</a>
                ${b.has_log ? `
                <a href="${b.log_download_url}" class="pm-btn pm-btn-sm pm-btn-neutral" title="Download Log">📄 Log</a>
                ` : ''}
            `;
            if (b.hash) {
                actionsHtml = `
                <button type="button" class="pm-btn pm-btn-sm pm-btn-verify-backup pm-btn-success" data-backup="${safeName}" title="Verify Integrity">
                    🛡️ Verify
                </button>
                ` + actionsHtml;
            }
            if (b.is_local) {
                actionsHtml += `
                <button type="button" class="pm-btn pm-btn-sm pm-btn-delete-file-backup pm-btn-danger" data-backup="${safeName}" title="Delete Local">
                    🗑️ Delete
                </button>
                `;
            } else {
                actionsHtml += `
                <button type="button" class="pm-btn pm-btn-sm pm-btn-cloud-restore pm-btn-purple" data-backup="${safeName}" data-type="file" title="Restore Local">
                    ☁️ Restore
                </button>
                `;
            }

            trData.innerHTML = /* nosec */ `
                <td style="vertical-align: middle;">
                    <div>
                        <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                            <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="${safeName}">
                                ${safeName}
                            </span>
                            <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="${safeName}" title="Copy to clipboard">📋</span>
                        </div>
                        <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                            ${pill}
                            ${durationBadge}
                        </div>
                    </div>
                </td>
                <td><span class="pm-badge pm-bg-primary-light" style="color: var(--pm-primary);">${safeSize}</span></td>
                <td class="pm-text-muted pm-text-sm" style="vertical-align: middle;">
                    ${dateStr}
                </td>
                <td style="vertical-align: middle; text-align: right;">
                    <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                        ${actionsHtml}
                    </div>
                </td>
            `; // nosec
            entryTbody.appendChild(trData);
            table.appendChild(entryTbody);
        });
        if (typeof GoogleDriveEngine !== 'undefined') {
            GoogleDriveEngine.updateGridsUI();
        }
    }

    static loadDirectoryExclusions() {
        const container = document.getElementById('pm-directory-tree-container');
        if (!container) return;

        FetchEngine.post('get_directory_tree')
        .then(data => {
            if (!data.success || !data.directories) {
                container.innerHTML = `<div style="padding: 1rem 0; color: var(--pm-danger);">Failed to load directories: ${data.error || 'Unknown error'}</div>`; // nosec
                return;
            }
            container.innerHTML = ''; // nosec
            
            if (data.directories.length === 0) {
                container.innerHTML = `<div style="padding: 1rem 0; text-align: center; color: var(--pm-text-secondary);">No directories found.</div>`; // nosec
                return;
            }
            
            this.directoryItems = data.directories;
            
            const list = document.createElement('div');
            list.style.display = 'grid';
            list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            list.style.gap = '0.75rem';

            data.directories.forEach(item => {
                const label = document.createElement('label');
                label.className = 'pm-exclusion-item';
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'space-between';
                label.style.padding = '0.75rem 1rem';
                label.style.borderRadius = '8px';
                label.style.background = 'rgba(255,255,255,0.02)';
                label.style.border = '1px solid rgba(255,255,255,0.05)';
                label.style.cursor = 'pointer';
                label.style.transition = 'all 0.2s ease';
                label.style.margin = '0';
                
                label.addEventListener('mouseenter', () => {
                    if (label.style.cursor !== 'not-allowed') {
                        label.style.background = 'rgba(255,255,255,0.04)';
                        label.style.borderColor = 'rgba(255,255,255,0.1)';
                    }
                });
                label.addEventListener('mouseleave', () => {
                    if (label.style.cursor !== 'not-allowed') {
                        label.style.background = 'rgba(255,255,255,0.02)';
                        label.style.borderColor = 'rgba(255,255,255,0.05)';
                    }
                });

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                left.style.gap = '0.75rem';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = item.path;
                checkbox.checked = !item.is_excluded;
                checkbox.className = 'pm-exclusion-checkbox';
                checkbox.style.width = '1.2rem';
                checkbox.style.height = '1.2rem';
                checkbox.style.cursor = 'inherit';
                checkbox.style.margin = '0';
                checkbox.style.accentColor = 'var(--pm-primary)';

                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = '📁'; // nosec
                iconSpan.style.fontSize = '1.1rem';

                const textSpan = document.createElement('span');
                textSpan.innerText = item.name;
                textSpan.style.fontWeight = '500';
                textSpan.style.color = 'var(--pm-text-primary)';
                textSpan.style.wordBreak = 'break-all';

                left.appendChild(checkbox);
                left.appendChild(iconSpan);
                left.appendChild(textSpan);

                const right = document.createElement('div');
                right.style.display = 'flex';
                right.style.alignItems = 'center';
                right.style.gap = '0.5rem';

                const countBadge = document.createElement('span');
                countBadge.innerText = `${item.file_count} files`;
                countBadge.style.fontSize = '0.75rem';
                countBadge.style.color = 'var(--pm-text-secondary)';
                countBadge.style.background = 'rgba(255,255,255,0.05)';
                countBadge.style.padding = '0.2rem 0.4rem';
                countBadge.style.borderRadius = '4px';

                const sizeBadge = document.createElement('span');
                sizeBadge.innerText = item.size_formatted;
                sizeBadge.style.fontSize = '0.75rem';
                sizeBadge.style.fontWeight = '600';
                sizeBadge.style.color = 'var(--pm-primary)';
                sizeBadge.style.background = 'rgba(var(--pm-primary-rgb), 0.1)';
                sizeBadge.style.padding = '0.2rem 0.4rem';
                sizeBadge.style.borderRadius = '4px';

                right.appendChild(countBadge);
                right.appendChild(sizeBadge);

                label.appendChild(left);
                label.appendChild(right);
                list.appendChild(label);
            });

            container.appendChild(list);
            this.bindExclusionsEvents();
            this.updateCheckboxesBasedOnProfile();
        })
        .catch(err => {
            container.innerHTML = `<div style="padding: 1rem 0; color: var(--pm-danger);">Error fetching directories: ${err.message}</div>`; // nosec
        });
    }

    static bindExclusionsEvents() {
        const container = document.getElementById('pm-directory-tree-container');
        if (!container) return;
        
        container.querySelectorAll('.pm-exclusion-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const uncheckedPaths = Array.from(container.querySelectorAll('.pm-exclusion-checkbox:not(:checked)'))
                    .map(input => input.value);
                
                // Update local state so switching back keeps choices
                if (this.directoryItems) {
                    this.directoryItems.forEach(d => {
                        d.is_excluded = uncheckedPaths.includes(d.path);
                    });
                }
                
                FetchEngine.post('save_exclusions', { exclusions: JSON.stringify(uncheckedPaths) })
                .then(data => {
                    if (data.success) {
                        window.showPremiumToast('Backup settings auto-saved.', 'success');
                    } else {
                        window.showPremiumToast(data.error || 'Failed to auto-save settings', 'error');
                    }
                })
                .catch(err => {
                    window.showPremiumToast('Error saving settings: ' + err.message, 'error');
                });
            });
        });
    }

    static updateCheckboxesBasedOnProfile() {
        const profileSelect = document.getElementById('pm-file-backup-profile');
        const container = document.getElementById('pm-directory-tree-container');
        const infoDiv = document.getElementById('pm-profile-override-info');
        
        if (!profileSelect || !container || !this.directoryItems) return;
        
        const profile = profileSelect.value;
        const isCustom = (profile === 'custom');
        
        if (infoDiv) {
            infoDiv.style.display = isCustom ? 'none' : 'flex';
        }
        
        let forcedExclusions = [];
        let forcedInclusions = [];
        
        if (profile === 'core') {
            forcedExclusions = ['/img', '/themes', '/modules', '/upload', '/download'];
        } else if (profile === 'core_media') {
            forcedExclusions = ['/themes', '/modules'];
        } else if (profile === 'themes_modules') {
            forcedInclusions = ['/themes', '/modules'];
        } else if (profile === 'media') {
            forcedInclusions = ['/img', '/upload', '/download'];
        }
        
        container.querySelectorAll('.pm-exclusion-item').forEach(label => {
            const cb = label.querySelector('.pm-exclusion-checkbox');
            if (!cb) return;
            const path = cb.value;
            
            let isChecked = false;
            let itemData = this.directoryItems.find(d => d.path === path);
            let globallyExcluded = itemData ? itemData.is_excluded : false;
            
            if (isCustom) {
                isChecked = !globallyExcluded;
            } else {
                if (profile === 'full') {
                    isChecked = !globallyExcluded;
                } else if (profile === 'themes_modules' || profile === 'media') {
                    let isForcedInclude = false;
                    for (let inc of forcedInclusions) {
                        if (path.startsWith(inc)) {
                            isForcedInclude = true;
                            break;
                        }
                    }
                    isChecked = isForcedInclude && !globallyExcluded;
                } else {
                    // core or core_media
                    let isForcedExclude = false;
                    for (let exc of forcedExclusions) {
                        if (path.startsWith(exc)) {
                            isForcedExclude = true;
                            break;
                        }
                    }
                    isChecked = !isForcedExclude && !globallyExcluded;
                }
            }
            
            cb.checked = isChecked;
            cb.disabled = !isCustom;
            
            if (!isCustom) {
                label.style.opacity = isChecked ? '0.85' : '0.4';
                label.style.cursor = 'not-allowed';
                label.style.background = isChecked ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)';
                label.style.borderColor = isChecked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.01)';
            } else {
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
                label.style.background = 'rgba(255,255,255,0.02)';
                label.style.borderColor = 'rgba(255,255,255,0.05)';
            }
        });
    }
}

// Global binding for backward compatibility if needed outside
window.pmRenderFileBackupsGrid = (backups) => FileToolsEngine.renderGrid(backups);
