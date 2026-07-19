/**
 * Project Mass - UI Engine (TX-153)
 * Handles all globally accessible UI components, modals, alerts, and toasts.
 * Engineered for cross-tab reuse and SPA structural integrity.
 */

class UiEngine {
    
    // Core DOM Getters
    static getPremiumModal = () => document.getElementById('pm-modal-premium');
    static getPremiumModalTitle = () => document.getElementById('pm-premium-modal-title');
    static getPremiumModalBody = () => document.getElementById('pm-premium-modal-body');
    static getPremiumModalInputContainer = () => document.getElementById('pm-premium-modal-input-container');
    static getPremiumModalInput = () => document.getElementById('pm-premium-modal-input');
    static getPremiumModalBtnCancel = () => document.getElementById('pm-premium-modal-btn-cancel');
    static getPremiumModalBtnConfirm = () => document.getElementById('pm-premium-modal-btn-confirm');
    static getPremiumModalCloseBtn = () => document.getElementById('pm-premium-modal-close-btn');

    static onPremiumModalConfirm = null;

    static closePremiumModal() {
        this.getPremiumModal().style.display = 'none';
        if (window.onPremiumModalClose) {
            const cb = window.onPremiumModalClose;
            window.onPremiumModalClose = null;
            cb();
        }
    }

    static initializeHooks() {
        // Only map if elements exist
        if (!this.getPremiumModalBtnConfirm()) return;
        
        this.getPremiumModalBtnConfirm().onclick = () => {
            if (this.onPremiumModalConfirm) this.onPremiumModalConfirm();
        };
        
        this.getPremiumModalBtnCancel().onclick = () => this.closePremiumModal();
        this.getPremiumModalCloseBtn().onclick = () => this.closePremiumModal();
        
        // Escape key binding for all modals
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = this.getPremiumModal();
                if (modal && modal.style.display === 'flex') {
                    this.closePremiumModal();
                }
            }
        });

        // Initialize Gemini spotlight hover tracking
        this.initializeCursorTracking();
    }

    static initializeCursorTracking() {
        let cursorTicking = false;
        
        // Use live HTMLCollections instead of static querySelectorAll. 
        // This entirely eliminates the need for an expensive MutationObserver!
        const tabs = document.getElementsByClassName('pm-tab-label');
        const subTabs = document.getElementsByClassName('pm-sub-tab-btn');
        const themeBtns = document.getElementsByClassName('pm-theme-btn');
        
        // [TX-207] Bulletproof initial state injection to prevent 0,0 hover flash on load
        const initFallback = (el) => {
            el.style.setProperty('--mouse-x', '-100px');
            el.style.setProperty('--mouse-y', '-100px');
        };
        for (let i = 0; i < tabs.length; i++) initFallback(tabs[i]);
        for (let i = 0; i < subTabs.length; i++) initFallback(subTabs[i]);
        for (let i = 0; i < themeBtns.length; i++) initFallback(themeBtns[i]);
        
        document.addEventListener('mousemove', (e) => {
            if (cursorTicking) return;
            cursorTicking = true;
            
            requestAnimationFrame(() => {
                const processNode = (el) => {
                    const rect = el.getBoundingClientRect();
                    // Distance check: only calculate inside 150px radius to save GPU overhead
                    const dx = Math.max(0, rect.left - e.clientX, e.clientX - rect.right);
                    const dy = Math.max(0, rect.top - e.clientY, e.clientY - rect.bottom);
                    
                    if (Math.sqrt(dx * dx + dy * dy) < 150) {
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        el.style.setProperty('--mouse-x', `${x}px`);
                        el.style.setProperty('--mouse-y', `${y}px`);
                    }
                };

                for (let i = 0; i < tabs.length; i++) processNode(tabs[i]);
                for (let i = 0; i < subTabs.length; i++) processNode(subTabs[i]);
                for (let i = 0; i < themeBtns.length; i++) processNode(themeBtns[i]);
                
                cursorTicking = false;
            });
        });
    }

    static showAlert(title, message, type = 'info') {
        this.getPremiumModalTitle().innerHTML = title; // nosec
        this.getPremiumModalBody().innerHTML = message; // nosec
        this.getPremiumModalInputContainer().style.display = 'none';
        this.getPremiumModalBtnCancel().style.display = 'none';
        this.getPremiumModalBtnConfirm().innerHTML = 'OK'; // nosec
        this.getPremiumModalBtnConfirm().style.backgroundColor = type === 'error' ? 'var(--pm-danger)' : 'var(--pm-success)';
        this.getPremiumModalBtnConfirm().style.boxShadow = type === 'error' ? '0 3px 8px rgba(var(--pm-danger-rgb), 0.2)' : '0 3px 8px rgba(var(--pm-success-rgb), 0.2)';
        this.getPremiumModalBtnConfirm().disabled = false;
        
        this.getPremiumModal().style.display = 'flex';
        this.onPremiumModalConfirm = () => {
            this.closePremiumModal();
        };
    }

    static showPromptModal(title, message, placeholder, onConfirmCallback) {
        this.getPremiumModalTitle().innerHTML = title; // nosec
        this.getPremiumModalBody().innerHTML = message; // nosec
        
        this.getPremiumModalInputContainer().style.display = 'block';
        this.getPremiumModalInput().value = '';
        this.getPremiumModalInput().placeholder = placeholder;
        this.getPremiumModalBtnConfirm().disabled = true;

        const onInputHandler = () => {
            if (this.getPremiumModalInput().value.trim().length > 0) {
                this.getPremiumModalBtnConfirm().disabled = false;
            } else {
                this.getPremiumModalBtnConfirm().disabled = true;
            }
        };
        this.getPremiumModalInput().oninput = onInputHandler;

        this.getPremiumModal().style.display = 'flex';
        setTimeout(() => this.getPremiumModalInput().focus(), 100);
        
        this.onPremiumModalConfirm = () => {
            const val = this.getPremiumModalInput().value.trim();
            this.closePremiumModal();
            if (onConfirmCallback) onConfirmCallback(val);
        };
    }

    static showConfirmModal(title, message, expectedPhrase, onConfirmCallback) {
        this.getPremiumModalTitle().innerHTML = title; // nosec
        this.getPremiumModalBody().innerHTML = message; // nosec
        
        if (expectedPhrase) {
            this.getPremiumModalInputContainer().style.display = 'block';
            this.getPremiumModalInput().value = '';
            this.getPremiumModalInput().placeholder = `Type '${expectedPhrase}' to confirm`;
            this.getPremiumModalBtnConfirm().disabled = true;

            const onInputHandler = () => {
                this.getPremiumModalInput().value = this.getPremiumModalInput().value.toUpperCase();
                if (this.getPremiumModalInput().value.trim().toLowerCase() === expectedPhrase.toLowerCase()) {
                    this.getPremiumModalBtnConfirm().disabled = false;
                } else {
                    this.getPremiumModalBtnConfirm().disabled = true;
                }
            };
            this.getPremiumModalInput().oninput = onInputHandler;

            this.getPremiumModalInput().onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!this.getPremiumModalBtnConfirm().disabled) {
                        this.getPremiumModalBtnConfirm().click();
                    }
                }
            };
        } else {
            this.getPremiumModalInputContainer().style.display = 'none';
            this.getPremiumModalBtnConfirm().disabled = false;
        }

        if (!onConfirmCallback) {
            this.getPremiumModalBtnCancel().style.display = 'none';
            this.getPremiumModalBtnConfirm().innerHTML = 'Close'; // nosec
            this.getPremiumModalBtnConfirm().style.backgroundColor = 'var(--pm-neutral)';
            this.getPremiumModalBtnConfirm().style.boxShadow = 'none';
        } else {
            this.getPremiumModalBtnCancel().style.display = 'block';
            this.getPremiumModalBtnConfirm().innerHTML = 'Confirm'; // nosec
            this.getPremiumModalBtnConfirm().style.backgroundColor = 'var(--pm-danger)';
            this.getPremiumModalBtnConfirm().style.boxShadow = '0 3px 8px rgba(var(--pm-danger-rgb), 0.2)';
        }

        this.getPremiumModal().style.display = 'flex';
        
        this.onPremiumModalConfirm = () => {
            this.closePremiumModal();
            if (onConfirmCallback) onConfirmCallback();
        };
    }

    static showToast(message, type = 'success') {
        const container = document.getElementById('pm-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.style.pointerEvents = 'auto';
        toast.style.minWidth = '280px';
        toast.style.background = 'var(--pm-card-bg)';
        toast.style.backdropFilter = 'blur(12px)';
        toast.style.borderLeft = type === 'error' ? '4px solid var(--pm-danger)' : '4px solid var(--pm-success)';
        toast.style.borderTop = '1px solid var(--pm-border-color)';
        toast.style.borderRight = '1px solid var(--pm-border-color)';
        toast.style.borderBottom = '1px solid var(--pm-border-color)';
        toast.style.padding = '0.75rem 1rem';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = 'var(--pm-shadow-md)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'space-between';
        toast.style.gap = '1rem';
        toast.style.color = 'var(--pm-text-primary)';
        toast.style.fontSize = '0.85rem';
        toast.style.fontWeight = '500';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

        const text = document.createElement('span');
        text.innerHTML = (type === 'error' ? '&#10060; ' : '&#9989; ') + message; // nosec
        toast.appendChild(text);

        const close = document.createElement('button');
        close.innerHTML = '&times;'; // nosec
        close.style.background = 'none';
        close.style.border = 'none';
        close.style.color = 'var(--pm-text-secondary)';
        close.style.cursor = 'pointer';
        close.style.fontSize = '1.1rem';
        close.style.padding = '0';
        close.onclick = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        };
        toast.appendChild(close);

        container.appendChild(toast);

        // Trigger reflow/animation
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 50);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 6500);
    }
}

// Global Legacy Bindings (To prevent breaking existing procedural code during transition)
window.showPremiumAlert = (...args) => UiEngine.showAlert(...args);
window.showPremiumConfirmModal = (...args) => UiEngine.showConfirmModal(...args);
window.showPremiumPromptModal = (...args) => UiEngine.showPromptModal(...args);
window.showPremiumToast = (...args) => UiEngine.showToast(...args);

// Initialize static hooks when DOM is ready

