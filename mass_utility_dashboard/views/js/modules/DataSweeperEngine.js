/**
 * Project Mass - Data Sweeper Engine (TX-298)
 * Orchestrates the Pre-flight Scan and chunked database purge loops.
 */
class DataSweeperEngine {
    static statsTotal = 0;
    static cartsTotal = 0;
    static orphanedImages = [];
    static isRunning = false;
    static isAborted = false;

    static initialize() {
        this.bindAnalyze();
        this.bindExecute();
        this.bindAbort();
    }

    static logConsole(message, type = 'SYSTEM') {
        const consoleEl = document.getElementById('pm-sweeper-console');
        if (!consoleEl) return;
        const timestamp = new Date().toLocaleTimeString();
        consoleEl.innerHTML += `\n[${timestamp}] [${type}] ${message}`;
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    static bindAnalyze() {
        const btnAnalyze = document.getElementById('pm-btn-sweeper-analyze');
        if (!btnAnalyze) return;

        btnAnalyze.addEventListener('click', () => {
            const daysSelect = document.getElementById('pm-sweeper-days');
            const daysOld = daysSelect ? daysSelect.value : 30;

            btnAnalyze.disabled = true;
            btnAnalyze.innerHTML = '⚡ Scanning Database...'; // nosec

            const scanPromise = FetchEngine.post('sweeper_analyze', { days_old: daysOld });
            const imagePromise = FetchEngine.post('sweeper_scan_images');

            Promise.all([scanPromise, imagePromise])
                .then(([data, imageData]) => {
                    btnAnalyze.disabled = false;
                    btnAnalyze.innerHTML = '🔍 Run Pre-Flight Scan'; // nosec

                    if (!data.success) {
                        UiEngine.showAlert('Scan Error', data.error || 'Failed to complete pre-flight scan.');
                        return;
                    }

                    // Store row counts
                    this.statsTotal = data.stats.total;
                    this.cartsTotal = data.carts.total;
                    this.orphanedImages = imageData.success ? imageData.orphaned_files : [];

                    // Update UI Readout elements
                    document.getElementById('pm-scan-connections').innerText = data.stats.connections.toLocaleString();
                    document.getElementById('pm-scan-pages').innerText = data.stats.connections_page.toLocaleString();
                    document.getElementById('pm-scan-sources').innerText = data.stats.connections_source.toLocaleString();
                    document.getElementById('pm-scan-guests').innerText = data.stats.guests.toLocaleString();
                    document.getElementById('pm-scan-stats-total').innerText = data.stats.total.toLocaleString();

                    document.getElementById('pm-scan-carts').innerText = data.carts.carts.toLocaleString();
                    document.getElementById('pm-scan-products').innerText = data.carts.cart_products.toLocaleString();
                    document.getElementById('pm-scan-rules').innerText = data.carts.cart_rules.toLocaleString();
                    document.getElementById('pm-scan-carts-total').innerText = data.carts.total.toLocaleString();

                    if (imageData.success) {
                        document.getElementById('pm-scan-images-total').innerText = imageData.scanned_files.toLocaleString();
                        document.getElementById('pm-scan-images-orphans').innerText = imageData.orphaned_files.length.toLocaleString();
                        document.getElementById('pm-scan-images-size').innerText = (imageData.total_orphaned_size / 1024 / 1024).toFixed(2) + ' MB';
                        document.getElementById('pm-check-images-count').innerText = imageData.orphaned_files.length.toLocaleString();
                    } else {
                        document.getElementById('pm-scan-images-total').innerText = 'Error';
                        document.getElementById('pm-scan-images-orphans').innerText = '0';
                        document.getElementById('pm-scan-images-size').innerText = '0.00 MB';
                        document.getElementById('pm-check-images-count').innerText = '0';
                    }

                    // Checkbox counts
                    document.getElementById('pm-check-stats-count').innerText = data.stats.total.toLocaleString();
                    document.getElementById('pm-check-carts-count').innerText = data.carts.total.toLocaleString();

                    // Reveal Results
                    const resultsCard = document.getElementById('pm-sweeper-results-card');
                    if (resultsCard) {
                        resultsCard.style.display = 'block';
                        resultsCard.scrollIntoView({ behavior: 'smooth' });
                    }
                })
                .catch(err => {
                    btnAnalyze.disabled = false;
                    btnAnalyze.innerHTML = '🔍 Run Pre-Flight Scan'; // nosec
                    UiEngine.showAlert('Scan Connection Error', err.message);
                });
        });
    }

    static bindExecute() {
        const btnExecute = document.getElementById('pm-btn-sweeper-execute');
        if (!btnExecute) return;

        btnExecute.addEventListener('click', () => {
            if (window.PM_CAPABILITIES && window.PM_CAPABILITIES.sweeper_execution === false) {
                UiEngine.showAlert(
                    'Pro Feature Locked', 
                    'Executing bulk database purges and image cleaning sweeps requires a Pro or Developer subscription package.<br><br><strong>Note:</strong> You can still run the Pre-Flight Scan to audit database and image overhead details.'
                );
                return;
            }

            const statsEnabled = document.getElementById('pm-sweeper-check-stats').checked;
            const cartsEnabled = document.getElementById('pm-sweeper-check-carts').checked;
            const imagesEnabled = document.getElementById('pm-sweeper-check-images').checked;

            if (!statsEnabled && !cartsEnabled && !imagesEnabled) {
                UiEngine.showAlert('No Options Selected', 'Please check at least one of the data domains to purge.');
                return;
            }

            const totalExpected = (statsEnabled ? this.statsTotal : 0) + (cartsEnabled ? this.cartsTotal : 0) + (imagesEnabled ? this.orphanedImages.length : 0);
            if (totalExpected === 0) {
                UiEngine.showAlert('No Records to Purge', 'The selected options contain 0 expired items matching the criteria.');
                return;
            }

            UiEngine.showConfirmModal(
                'Confirm Database & Files Purge',
                `You are about to permanently sweep up to <strong>${totalExpected.toLocaleString()}</strong> items (database records and physical files). This operation runs chunked to respect CloudLinux constraints, but cannot be undone.<br><br>Type <strong style="color: var(--pm-danger);">SWEEP</strong> in the field below to confirm:`,
                'SWEEP',
                () => {
                    this.startPurgeSequence(statsEnabled, cartsEnabled, imagesEnabled);
                }
            );
        });
    }

    static bindAbort() {
        const btnAbort = document.getElementById('pm-btn-sweeper-abort');
        if (!btnAbort) return;

        btnAbort.addEventListener('click', () => {
            this.isAborted = true;
            btnAbort.disabled = true;
            btnAbort.innerHTML = '⏳ Aborting...'; // nosec
            this.logConsole('Abort request registered. Stopping execution after current chunk...', 'WARNING');
        });
    }

    static startPurgeSequence(statsEnabled, cartsEnabled, imagesEnabled) {
        this.isRunning = true;
        this.isAborted = false;

        const resultsCard = document.getElementById('pm-sweeper-results-card');
        const progressCard = document.getElementById('pm-sweeper-progress-card');
        const btnAnalyze = document.getElementById('pm-btn-sweeper-analyze');
        const btnExecute = document.getElementById('pm-btn-sweeper-execute');
        const btnAbort = document.getElementById('pm-btn-sweeper-abort');

        if (resultsCard) resultsCard.style.display = 'none';
        if (progressCard) progressCard.style.display = 'block';
        if (btnAnalyze) btnAnalyze.disabled = true;
        if (btnExecute) btnExecute.disabled = true;
        if (btnAbort) {
            btnAbort.disabled = false;
            btnAbort.style.display = 'inline-block';
            btnAbort.innerHTML = '🛑 Abort Operation'; // nosec
        }

        const headerText = document.getElementById('pm-sweeper-header-text');
        if (headerText) {
            headerText.textContent = '🧹 Database Clean Sweep in Progress...';
        }

        const daysSelect = document.getElementById('pm-sweeper-days');
        const daysOld = daysSelect ? parseInt(daysSelect.value) : 30;
        const chunkSize = 5000;

        const imagesList = [...(this.orphanedImages || [])];
        const totalExpected = (statsEnabled ? this.statsTotal : 0) + (cartsEnabled ? this.cartsTotal : 0) + (imagesEnabled ? imagesList.length : 0);
        let totalDeleted = 0;

        const consoleEl = document.getElementById('pm-sweeper-console');
        if (consoleEl) consoleEl.innerHTML = '[SYSTEM] Launching clean sweep sequence...'; // nosec

        const updateProgressBar = () => {
            const bar = document.getElementById('pm-sweeper-progress-bar');
            const percentText = document.getElementById('pm-sweeper-progress-percent');
            const pct = Math.min(100, Math.round((totalDeleted / totalExpected) * 100));

            if (bar) bar.style.width = pct + '%';
            if (percentText) percentText.innerText = pct + '%';
        };

        const executeNext = () => {
            if (this.isAborted) {
                this.logConsole('Purge loop aborted by user action.', 'ABORTED');
                this.finishSequence(false, 'Operation aborted.');
                return;
            }

            // Step 1: Statistical connections
            if (statsEnabled) {
                this.logConsole(`Executing chunk delete on ps_connections (target size: ${chunkSize})...`, 'STATS');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping statistical connections...';
                
                FetchEngine.post('sweeper_sweep_connections', { days_old: daysOld, chunk_size: chunkSize })
                    .then(res => {
                        if (!res.success) throw new Error(res.error || 'Unknown endpoint error');

                        if (res.deleted > 0) {
                            totalDeleted += res.deleted;
                            updateProgressBar();
                            this.logConsole(`Successfully purged ${res.deleted.toLocaleString()} connection records.`, 'SUCCESS');
                        }

                        if (!res.done) {
                            setTimeout(executeNext, 200);
                        } else {
                            statsEnabled = false;
                            executeNext();
                        }
                    })
                    .catch(err => {
                        this.logConsole(`Fatal error: ${err.message}`, 'ERROR');
                        this.finishSequence(false, err.message);
                    });
                return;
            }

            // Step 2: Guest sessions
            if (this.statsTotal > 0 && !statsEnabled && this.statsTotal !== -1) {
                this.logConsole(`Scanning for unreferenced guests in ps_guest...`, 'STATS');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping orphaned visitor guest accounts...';
                
                FetchEngine.post('sweeper_sweep_guests', { chunk_size: chunkSize })
                    .then(res => {
                        if (!res.success) throw new Error(res.error || 'Unknown guest endpoint error');

                        if (res.deleted > 0) {
                            totalDeleted += res.deleted;
                            updateProgressBar();
                            this.logConsole(`Purged ${res.deleted.toLocaleString()} orphaned guest records.`, 'SUCCESS');
                        }

                        if (!res.done) {
                            setTimeout(executeNext, 200);
                        } else {
                            this.statsTotal = -1;
                            executeNext();
                        }
                    })
                    .catch(err => {
                        this.logConsole(`Fatal guest error: ${err.message}`, 'ERROR');
                        this.finishSequence(false, err.message);
                    });
                return;
            }

            // Step 3: Abandoned carts
            if (cartsEnabled) {
                this.logConsole(`Executing chunk delete on ps_cart (target size: ${chunkSize})...`, 'CARTS');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping abandoned shopping carts...';

                FetchEngine.post('sweeper_sweep_carts', { days_old: daysOld, chunk_size: chunkSize })
                    .then(res => {
                        if (!res.success) throw new Error(res.error || 'Unknown cart endpoint error');

                        if (res.deleted > 0) {
                            totalDeleted += res.deleted;
                            updateProgressBar();
                            this.logConsole(`Purged ${res.deleted.toLocaleString()} expired cart records.`, 'SUCCESS');
                        }

                        if (!res.done) {
                            setTimeout(executeNext, 200);
                        } else {
                            cartsEnabled = false;
                            executeNext();
                        }
                    })
                    .catch(err => {
                        this.logConsole(`Fatal cart error: ${err.message}`, 'ERROR');
                        this.finishSequence(false, err.message);
                    });
                return;
            }

            // Step 4: Ghost Product Images
            if (imagesEnabled) {
                this.logConsole(`Executing purge on orphaned product images...`, 'IMAGES');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping ghost product images...';

                const filesChunk = imagesList.splice(0, 50).map(f => f.relative_path);
                if (filesChunk.length > 0) {
                    FetchEngine.post('sweeper_purge_images', { files: filesChunk })
                        .then(res => {
                            if (!res.success) throw new Error(res.error || 'Unknown image sweeper endpoint error');

                            if (res.deleted_count > 0) {
                                totalDeleted += res.deleted_count;
                                updateProgressBar();
                                this.logConsole(`Purged ${res.deleted_count.toLocaleString()} ghost image files.`, 'SUCCESS');
                            }

                            if (imagesList.length > 0) {
                                setTimeout(executeNext, 200);
                            } else {
                                imagesEnabled = false;
                                executeNext();
                            }
                        })
                        .catch(err => {
                            this.logConsole(`Fatal image sweeper error: ${err.message}`, 'ERROR');
                            this.finishSequence(false, err.message);
                        });
                } else {
                    imagesEnabled = false;
                    executeNext();
                }
                return;
            }

            // All steps finished
            this.finishSequence(true, `Purged a total of ${totalDeleted.toLocaleString()} items successfully.`);
        };

        setTimeout(executeNext, 500);
    }

    static finishSequence(success, message) {
        this.isRunning = false;
        const btnAnalyze = document.getElementById('pm-btn-sweeper-analyze');
        const btnExecute = document.getElementById('pm-btn-sweeper-execute');
        const btnAbort = document.getElementById('pm-btn-sweeper-abort');

        if (btnAnalyze) btnAnalyze.disabled = false;
        if (btnExecute) btnExecute.disabled = false;
        if (btnAbort) {
            btnAbort.disabled = true;
            btnAbort.style.display = 'none';
        }

        const headerText = document.getElementById('pm-sweeper-header-text');
        if (headerText) {
            headerText.textContent = success ? '🧹 Database Clean Sweep Completed' : '🧹 Database Clean Sweep Halted';
        }

        if (success) {
            this.logConsole('Database Clean Sweep Completed successfully.', 'COMPLETE');
            document.getElementById('pm-sweeper-progress-text').innerText = 'Database cleanup successful!';
            document.getElementById('pm-sweeper-progress-bar').style.backgroundColor = '#10b981';
            UiEngine.showAlert('Clean Sweep Finished', message, 'success');
        } else {
            document.getElementById('pm-sweeper-progress-text').innerText = 'Database cleanup failed or aborted.';
            UiEngine.showAlert('Clean Sweep Halted', message, 'error');
        }
    }
}
