/**
 * Project Mass - Google Drive Redundancy Engine (TX-329)
 * Manages Google Drive OAuth configuration, connection state, offsite backup uploads, and cloud file deletion.
 */
class GoogleDriveEngine {
    static syncedFiles = [];
    static isGoogleAuthenticated = false;

    static initialize() {
        this.bindEvents();
        this.checkStatus();

        // Listen for OAuth success message from callback popup window
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'google_drive_auth_success') {
                window.showPremiumToast('Google Drive connected successfully!', 'success');
                this.checkStatus();
            }
        });
    }

    static bindEvents() {
        // Authenticate & Connect (Opens OAuth Popup)
        const btnConnect = document.getElementById('pm-btn-connect-gdrive');
        if (btnConnect) {
            btnConnect.addEventListener('click', () => {
                const authUrl = btnConnect.getAttribute('data-auth-url');
                if (authUrl) {
                    window.open(authUrl, 'GoogleDriveOAuth', 'width=600,height=650,left=150,top=100');
                } else {
                    UiEngine.showAlert('Authorization Error', 'Google Authorization URL not loaded yet.');
                }
            });
        }

        // Disconnect Account
        const btnDisconnect = document.getElementById('pm-btn-disconnect-gdrive');
        if (btnDisconnect) {
            btnDisconnect.addEventListener('click', () => {
                UiEngine.showConfirmModal(
                    'Disconnect Google Drive?',
                    'Are you sure you want to disconnect your Google Drive integration? This will wipe your local cloud status cache, but your files on Google Drive will remain intact.',
                    null,
                    () => {
                        btnDisconnect.disabled = true;
                        btnDisconnect.textContent = '🔌 Disconnecting...';

                        FetchEngine.post('disconnect_google_drive')
                        .then(() => {
                            window.showPremiumToast('Disconnected from Google Drive.', 'success');
                            btnDisconnect.disabled = false;
                            btnDisconnect.textContent = '🔌 Disconnect Account';
                            this.checkStatus();
                        })
                        .catch(err => {
                            UiEngine.showAlert('Disconnect Error', err.message);
                            btnDisconnect.disabled = false;
                            btnDisconnect.textContent = '🔌 Disconnect Account';
                        });
                    }
                );
            });
        }

        // Wire delegators for Sync, Cloud Delete, and Verify Cloud buttons on tables
        document.addEventListener('click', (e) => {
            const btnSync = e.target.closest('.pm-btn-sync-cloud');
            if (btnSync) {
                const file = btnSync.getAttribute('data-backup');
                const type = btnSync.getAttribute('data-type');
                this.syncBackupToCloud(file, type, btnSync);
                return;
            }

            const btnDeleteCloud = e.target.closest('.pm-btn-delete-cloud');
            if (btnDeleteCloud) {
                const file = btnDeleteCloud.getAttribute('data-backup');
                const type = btnDeleteCloud.getAttribute('data-type');
                this.deleteBackupFromCloud(file, type, btnDeleteCloud);
                return;
            }

            const btnVerifyCloud = e.target.closest('.pm-btn-verify-cloud');
            if (btnVerifyCloud) {
                const file = btnVerifyCloud.getAttribute('data-backup');
                const type = btnVerifyCloud.getAttribute('data-type');
                this.verifyCloudBackup(file, type, btnVerifyCloud);
                return;
            }

            const btnCloudRestore = e.target.closest('.pm-btn-cloud-restore');
            if (btnCloudRestore) {
                const file = btnCloudRestore.getAttribute('data-backup');
                const type = btnCloudRestore.getAttribute('data-type');
                this.restoreBackupFromCloud(file, type, btnCloudRestore);
            }
        });
    }

    static checkStatus() {
        const controlPanel = document.getElementById('pm-gdrive-control-panel');
        const badge = document.getElementById('pm-gdrive-badge');
        const connStatus = document.getElementById('pm-gdrive-conn-status');
        const connDetails = document.getElementById('pm-gdrive-conn-details');
        const btnConnect = document.getElementById('pm-btn-connect-gdrive');
        const btnDisconnect = document.getElementById('pm-btn-disconnect-gdrive');

        if (!controlPanel) return;

        FetchEngine.post('get_auth_status')
        .then(data => {
            this.syncedFiles = data.synced_files || [];
            this.isGoogleAuthenticated = data.authenticated;

            if (data.has_failed_jobs) {
                window.showPremiumToast('⚠️ Failed backup jobs detected in history! Check the logs tab.', 'error');
            }

            if (!data.configured) {
                controlPanel.style.display = 'block';
                badge.className = 'pm-status-pill danger';
                badge.innerText = '⚠️ Broker Unconfigured';
                connStatus.innerText = 'OAuth Broker Credentials Missing';
                connStatus.style.color = 'var(--pm-danger)';
                connDetails.innerText = 'Central OAuth Broker Client ID and Secret are not set in the server environment (.env).';
                btnConnect.style.display = 'none';
                btnDisconnect.style.display = 'none';
            } else if (!data.authenticated) {
                controlPanel.style.display = 'block';
                badge.className = 'pm-status-pill warning';
                badge.innerText = '🔒 Needs Authentication';
                connStatus.innerText = 'Google Drive Integration Ready';
                connStatus.style.color = 'var(--pm-warning)';
                connDetails.innerText = 'Please authenticate with Google to connect this tenant.';
                btnConnect.style.display = 'inline-block';
                btnConnect.setAttribute('data-auth-url', data.auth_url);
                btnDisconnect.style.display = 'none';
            } else {
                controlPanel.style.display = 'block';
                badge.className = 'pm-status-pill success';
                badge.innerText = '✅ Connected';
                connStatus.innerText = 'Connected to Google Drive';
                connStatus.style.color = 'var(--pm-success)';
                connDetails.innerText = `Central OAuth Broker Active | Synced Backups: ${this.syncedFiles.length}`;
                btnConnect.style.display = 'none';
                btnDisconnect.style.display = 'inline-block';
            }
            const downloadSourceDropdown = document.getElementById('pm-setting-gdrive-default-download');
            if (!data.configured || !data.authenticated) {
                if (downloadSourceDropdown) {
                    if (downloadSourceDropdown.value === 'cloud') {
                        downloadSourceDropdown.value = 'local';
                        FetchEngine.post('save_settings', {
                            settings: { PM_GDRIVE_DEFAULT_DOWNLOAD: 'local' }
                        }).catch(() => {});
                    }
                    downloadSourceDropdown.disabled = true;
                }
            } else {
                if (downloadSourceDropdown) {
                    downloadSourceDropdown.disabled = false;
                }
            }

            this.updateGridsUI();
        })
        .catch(err => {
            console.error('Google Drive status check failed:', err);
        });
    }

    static syncBackupToCloud(file, type, btnEl) {
        if (!this.isGoogleAuthenticated) {
            UiEngine.showAlert('Authentication Needed', 'You must authenticate Google Drive before performing cloud sync actions.', 'error');
            return;
        }

        btnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = '⏳ Init...';

        FetchEngine.post('init_sync_to_drive', { file: file, type: type })
        .then(data => {
            const tasks = data.tasks;
            const folderId = data.folder_id;
            let currentTaskIndex = 0;

            const runNextTask = () => {
                if (currentTaskIndex >= tasks.length) {
                    btnEl.textContent = '⏳ Finalizing...';
                    FetchEngine.post('finalize_sync', { file: file, folder_id: folderId, type: type })
                    .then(finalizeData => {
                        btnEl.textContent = '☁️ 100%';
                        window.showPremiumToast('Backup synced to Google Drive successfully!', 'success');

                        if (!this.syncedFiles.includes(file)) {
                            this.syncedFiles.push(file);
                        }

                        if (type === 'database') {
                            if (typeof pmRenderAllGrids === 'function') {
                                pmRenderAllGrids(finalizeData.backups || []);
                            }
                        } else {
                            if (typeof FileToolsEngine !== 'undefined') {
                                FileToolsEngine.renderGrid(finalizeData.backups || []);
                            }
                        }

                        this.checkStatus();
                    })
                    .catch(err => {
                        UiEngine.showAlert('Cloud Sync Failure', 'Finalizing sync failed: ' + err.message, 'error');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;
                        this.checkStatus();
                    });
                    return;
                }

                const task = tasks[currentTaskIndex];
                const uploadUrl = task.upload_url;
                const fileSize = task.file_size;
                const fileKey = task.file_key;
                const fileName = task.file_name;
                let offset = 0;

                const uploadNextChunk = () => {
                    const progress = Math.round((offset / fileSize) * 100);
                    const label = fileKey === 'archive' ? (type === 'database' ? 'SQL' : 'Files') : 'Log';
                    btnEl.textContent = `☁️ ${label} ${progress}%`;

                    FetchEngine.post('upload_sync_chunk', {
                        file: file,
                        type: type,
                        upload_url: uploadUrl,
                        offset: offset,
                        file_key: fileKey
                    })
                    .then(chunkData => {
                        if (chunkData.complete) {
                            currentTaskIndex++;
                            runNextTask();
                        } else {
                            offset = chunkData.uploaded_bytes;
                            uploadNextChunk();
                        }
                    })
                    .catch(err => {
                        UiEngine.showAlert('Cloud Sync Failure', `Syncing ${fileName} failed: ` + err.message, 'error');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;
                        this.checkStatus();
                    });
                };

                uploadNextChunk();
            };

            runNextTask();
        })
        .catch(err => {
            UiEngine.showAlert('Cloud Sync Failure', err.message, 'error');
            btnEl.disabled = false;
            btnEl.textContent = originalText;
        });
    }

    static deleteBackupFromCloud(file, type, btnEl) {
        UiEngine.showConfirmModal(
            'Delete Cloud Backup?',
            `Are you sure you want to permanently delete <strong style="color: var(--pm-text-primary);">${file}</strong> from Google Drive?<br><br>This will only remove the copy from your Google Drive folder, leaving the local file untouched.`,
            null,
            () => {
                btnEl.disabled = true;
                const originalText = btnEl.textContent;
                btnEl.textContent = '⏳ Del...';

                FetchEngine.post('delete_from_drive', { file: file, type: type })
                .then(data => {
                    window.showPremiumToast('Backup deleted from Google Drive.', 'success');

                    // Remove from synced lists and refresh
                    this.syncedFiles = this.syncedFiles.filter(item => item !== file);

                    if (type === 'database') {
                        if (typeof pmRenderAllGrids === 'function') {
                            pmRenderAllGrids(data.backups || []);
                        }
                    } else {
                        if (typeof FileToolsEngine !== 'undefined') {
                            FileToolsEngine.renderGrid(data.backups || []);
                        }
                    }

                    this.checkStatus();
                })
                .catch(err => {
                    UiEngine.showAlert('Cloud Delete Failure', err.message, 'error');
                    btnEl.disabled = false;
                    btnEl.textContent = originalText;
                });
            }
        );
    }

    static verifyCloudBackup(file, type, btnEl) {
        btnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = '⏳ Checking...';

        FetchEngine.post('verify_cloud_integrity', { file: file, type: type })
        .then(data => {
            btnEl.disabled = false;
            btnEl.textContent = originalText;

            if (data.verified) {
                UiEngine.showAlert('Integrity Verified', data.message, 'success');
            } else {
                UiEngine.showConfirmModal(
                    'Repair Cloud Backup?',
                    `${data.message}<br><br>Would you like to repair this offsite backup by re-uploading the local files to Google Drive?`,
                    null,
                    () => {
                        this.syncBackupToCloud(file, type, btnEl);
                    }
                );
            }
        })
        .catch(err => {
            UiEngine.showAlert('Integrity Check Error', err.message, 'error');
            btnEl.disabled = false;
            btnEl.textContent = originalText;
        });
    }

    static updateGridsUI() {
        // Helper to rebuild buttons in an actions cell
        const rebuildActions = (actionCell, name, type) => {
            if (!actionCell) return;

            // 1. Remove any old dynamic cloud buttons first
            actionCell.querySelectorAll('.pm-btn-sync-cloud, .pm-btn-delete-cloud, .pm-btn-verify-cloud').forEach(el => el.remove());

            if (!this.isGoogleAuthenticated) return;

            const isSynced = this.syncedFiles.includes(name);
            const localDeleteBtn = actionCell.querySelector('.pm-btn-delete-file-backup, .pm-btn-delete, .pm-btn-cloud-restore');

            if (isSynced) {
                // Render Check button
                const btnVerify = document.createElement('button');
                btnVerify.type = 'button';
                btnVerify.className = 'pm-btn pm-btn-sm pm-btn-verify-cloud pm-btn-success';
                btnVerify.setAttribute('data-backup', name);
                btnVerify.setAttribute('data-type', type);
                btnVerify.textContent = '🛡️ Verify Cloud';

                // Render Delete Cloud button
                const btnDelCloud = document.createElement('button');
                btnDelCloud.type = 'button';
                btnDelCloud.className = 'pm-btn pm-btn-sm pm-btn-delete-cloud pm-btn-neutral';
                btnDelCloud.setAttribute('data-backup', name);
                btnDelCloud.setAttribute('data-type', type);
                btnDelCloud.textContent = '☁️ Delete Cloud';

                if (localDeleteBtn) {
                    actionCell.insertBefore(btnVerify, localDeleteBtn);
                    actionCell.insertBefore(btnDelCloud, localDeleteBtn);
                } else {
                    actionCell.appendChild(btnVerify);
                    actionCell.appendChild(btnDelCloud);
                }
            } else {
                // Render Sync button
                const btnSync = document.createElement('button');
                btnSync.type = 'button';
                btnSync.className = 'pm-btn pm-btn-sm pm-btn-sync-cloud pm-btn-purple';
                btnSync.setAttribute('data-backup', name);
                btnSync.setAttribute('data-type', type);
                btnSync.textContent = '☁️ Sync to Cloud';

                if (localDeleteBtn) {
                    actionCell.insertBefore(btnSync, localDeleteBtn);
                } else {
                    actionCell.appendChild(btnSync);
                }
            }
        };

        const updateGridRows = (tableId, type) => {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.querySelectorAll('tbody tr.pm-data-row').forEach(tr => {
                const nameSpan = tr.querySelector('td:first-child .pm-truncated-filename');
                if (!nameSpan) return;
                const name = nameSpan.getAttribute('data-full-name');
                if (!name) return;

                const isSynced = this.syncedFiles.includes(name);
                const isLocal = tr.getAttribute('data-is-local') !== 'false';

                if (!isSynced && !isLocal) {
                    const tbody = tr.closest('tbody');
                    if (tbody) {
                        tbody.remove();
                    } else {
                        tr.remove();
                    }
                    return;
                }

                const badgeContainer = tr.querySelector('.pm-backup-badges');
                if (badgeContainer) {
                    let cloudBadge = badgeContainer.querySelector('.pm-cloud-sync-badge');
                    let baseBadge = badgeContainer.querySelector('.pm-base-status-badge');
                    
                    const shouldShowSyncedOnly = isSynced && isLocal;

                    if (shouldShowSyncedOnly) {
                        if (baseBadge) {
                            baseBadge.style.display = 'none';
                        }
                        if (!cloudBadge) {
                            cloudBadge = document.createElement('span');
                            cloudBadge.className = 'pm-status-pill pm-cloud-sync-badge';
                            cloudBadge.style.background = 'rgba(168, 85, 247, 0.1)';
                            cloudBadge.style.color = 'var(--pm-purple)';
                            cloudBadge.style.fontSize = '0.65rem';
                            cloudBadge.style.padding = '0.15rem 0.4rem';
                            cloudBadge.style.letterSpacing = '0';
                            cloudBadge.innerText = '☁️ Synced';
                            
                            badgeContainer.appendChild(cloudBadge);
                        } else {
                            cloudBadge.style.display = 'inline-block';
                        }
                    } else {
                        if (baseBadge) {
                            baseBadge.style.display = 'inline-block';
                        }
                        if (cloudBadge) {
                            cloudBadge.remove();
                        }
                    }
                }

                const actionCell = tr.nextElementSibling ? tr.nextElementSibling.querySelector('.pm-actions-group') : null;
                rebuildActions(actionCell, name, type);
            });
        };

        updateGridRows('pm-file-backups-table', 'file');
        updateGridRows('pm-backups-table', 'database');
    }

    static restoreBackupFromCloud(file, type, btnEl) {
        UiEngine.showConfirmModal(
            'Restore Local Backup?',
            `Are you sure you want to download and restore <strong style="color: var(--pm-text-primary);">${file}</strong> from Google Drive back to your local server?`,
            null,
            () => {
                btnEl.disabled = true;
                const originalText = btnEl.textContent;
                btnEl.textContent = '⏳ 0%';

                const jobId = 'restore_' + Date.now();
                const adminModulesUrl = window.PM_CONFIG ? window.PM_CONFIG.adminModulesUrl : '';
                let isCompletedByStream = false;

                if (adminModulesUrl) {
                    const es = new EventSource(adminModulesUrl + '&configure=mass_utility&action=stream_job_progress&job_id=' + jobId);
                    
                    es.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.progress !== undefined) {
                                btnEl.textContent = `⏳ ${data.progress}%`;
                            }
                            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                                es.close();
                                if (data.status === 'completed') {
                                    isCompletedByStream = true;
                                    window.showPremiumToast('Backup restored locally successfully!', 'success');
                                    btnEl.disabled = false;
                                    btnEl.textContent = originalText;
                                    
                                    if (type === 'database') {
                                        if (typeof pmRenderAllGrids === 'function') {
                                            pmRenderAllGrids(data.backups || []);
                                        }
                                    } else {
                                        if (typeof FileToolsEngine !== 'undefined') {
                                            FileToolsEngine.renderGrid(data.backups || []);
                                        }
                                    }
                                    this.checkStatus();
                                } else if (data.status === 'failed') {
                                    UiEngine.showAlert('Local Restore Failure', data.error || 'Unknown error occurred.', 'error');
                                    btnEl.disabled = false;
                                    btnEl.textContent = originalText;
                                }
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    };

                    es.onerror = () => {
                        es.close();
                    };
                }

                FetchEngine.post('restore_from_drive', { file: file, type: type, job_id: jobId })
                .then(data => {
                    if (!isCompletedByStream) {
                        window.showPremiumToast('Backup restored locally successfully!', 'success');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;

                        if (type === 'database') {
                            if (typeof pmRenderAllGrids === 'function') {
                                pmRenderAllGrids(data.backups || []);
                            }
                        } else {
                            if (typeof FileToolsEngine !== 'undefined') {
                                FileToolsEngine.renderGrid(data.backups || []);
                            }
                        }
                        this.checkStatus();
                    }
                })
                .catch(err => {
                    if (!isCompletedByStream) {
                        UiEngine.showAlert('Local Restore Failure', err.message, 'error');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;
                    }
                });
            }
        );
    }
}
