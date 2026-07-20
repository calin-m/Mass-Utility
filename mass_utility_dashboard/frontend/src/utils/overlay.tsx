import React, { createContext, useContext, useState, useEffect } from 'react';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  alertType?: 'success' | 'error' | 'info';
  expectedPhrase?: string | null;
  placeholder?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (title: string, message: string, alertType?: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, expectedPhrase: string | null, onConfirm: () => void) => void;
  showPrompt: (title: string, message: string, placeholder: string, onConfirm: (val: string) => void) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ModalState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const [inputValue, setInputValue] = useState('');
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);

  useEffect(() => {
    if (state.isOpen) {
      if (state.type === 'confirm' && state.expectedPhrase) {
        setIsConfirmDisabled(true);
      } else if (state.type === 'prompt') {
        setIsConfirmDisabled(true);
      } else {
        setIsConfirmDisabled(false);
      }
      setInputValue('');
    }
  }, [state.isOpen, state.type, state.expectedPhrase]);

  const showAlert = (title: string, message: string, alertType: 'success' | 'error' | 'info' = 'info') => {
    setState({ isOpen: true, type: 'alert', title, message, alertType });
  };

  const showConfirm = (title: string, message: string, expectedPhrase: string | null, onConfirm: () => void) => {
    setState({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      expectedPhrase,
      onConfirm: () => {
        closeModal();
        onConfirm();
      }
    });
  };

  const showPrompt = (title: string, message: string, placeholder: string, onConfirm: (val: string) => void) => {
    setState({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      placeholder,
      onConfirm: (val) => {
        closeModal();
        onConfirm(val || '');
      }
    });
  };

  const closeModal = () => {
    setState(prev => ({ ...prev, isOpen: false }));
    if (state.onCancel) state.onCancel();
  };

  // Register on window for legacy standalone interoperability
  useEffect(() => {
    (window as any).showPremiumConfirmModal = (title: string, message: string, expectedPhrase: string | null, callback: () => void) => {
      showConfirm(title, message, expectedPhrase, callback);
    };
    (window as any).showPremiumAlert = (title: string, message: string, type: any) => {
      showAlert(title, message, type);
    };
    (window as any).showPremiumPromptModal = (title: string, message: string, placeholder: string, callback: (val: string) => void) => {
      showPrompt(title, message, placeholder, callback);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (state.expectedPhrase) {
      setIsConfirmDisabled(val.trim().toLowerCase() !== state.expectedPhrase.toLowerCase());
    } else if (state.type === 'prompt') {
      setIsConfirmDisabled(val.trim().length === 0);
    }
  };

  const handleConfirm = () => {
    if (state.onConfirm) {
      state.onConfirm(inputValue);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {state.isOpen && (
        <div className="pm-modal-overlay fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-[99999] transition-opacity duration-300">
          <div className="pm-modal-card bg-[#12121a] dark:bg-[#12121a] text-[var(--pm-text-primary)] border border-white/[0.08] dark:border-white/[0.08] rounded-2xl p-6 shadow-2xl w-full max-w-lg mx-4 relative animate-fade-in">
            <div className="pm-modal-header flex justify-between items-center border-b border-white/[0.06] pb-3 mb-4">
              <h2 className="pm-modal-title text-sm font-bold uppercase tracking-wider text-white">{state.title}</h2>
              <button onClick={closeModal} className="pm-modal-close-icon text-gray-400 hover:text-white text-lg font-bold">&times;</button>
            </div>
            
            <div 
              className="pm-modal-body text-xs text-gray-300 leading-relaxed mb-5"
              dangerouslySetInnerHTML={{ __html: state.message }}
            />

            {(state.expectedPhrase || state.type === 'prompt') && (
              <div className="mb-5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={state.expectedPhrase ? `Type '${state.expectedPhrase.toUpperCase()}' to confirm` : state.placeholder}
                  className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-lg bg-black/20 text-white font-mono text-center focus:outline-none focus:border-[#8b5cf6]/50 uppercase"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isConfirmDisabled) {
                      handleConfirm();
                    }
                  }}
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-gray-500"><kbd className="bg-white/5 border border-white/10 px-1 py-0.5 rounded text-[9px] mr-1">Esc</kbd> to close</span>
              <div className="flex gap-2">
                {state.type !== 'alert' && (
                  <button
                    onClick={closeModal}
                    className="pm-btn px-4 py-2 text-xs font-bold bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                  className={`pm-btn px-4 py-2 text-xs font-bold rounded-lg text-white transition ${
                    state.alertType === 'error' || state.type === 'confirm' ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30'
                  }`}
                >
                  {state.type === 'alert' ? 'OK' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
