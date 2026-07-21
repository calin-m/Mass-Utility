import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

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

  // Keep a ref of state to prevent listener re-registrations
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    if (stateRef.current.onCancel) stateRef.current.onCancel();
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
      if (e.key === 'Escape' && stateRef.current.isOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {state.isOpen && (
        <div className="pm-modal-overlay fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-[99999] transition-opacity duration-300">
          <div className="pm-modal-card rounded-2xl p-6 shadow-2xl w-full max-w-lg mx-4 relative animate-fade-in">
            <div className="pm-modal-header flex justify-between items-center pb-3 mb-4">
              <h2 className="pm-modal-title text-sm font-bold uppercase tracking-wider">{state.title}</h2>
              <button onClick={closeModal} className="pm-modal-close-icon text-lg font-bold">&times;</button>
            </div>
            
            <div 
              className="pm-modal-body text-xs leading-relaxed mb-5"
              dangerouslySetInnerHTML={{ __html: state.message }}
            />

             {(state.expectedPhrase || state.type === 'prompt') && (
              <div className="mb-5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={state.expectedPhrase ? `Type '${state.expectedPhrase.toUpperCase()}' to confirm` : state.placeholder}
                  className="w-full px-3 py-2 text-xs border border-pm-border bg-pm-input text-[var(--pm-text-primary)] rounded-lg font-mono text-center focus:outline-none focus:border-pm-primary/50 uppercase"
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
              <span className="text-[10px] text-pm-text-secondary"><kbd className="bg-pm-input border border-pm-border px-1 py-0.5 rounded text-[9px] mr-1">Esc</kbd> to close</span>
              <div className="flex gap-2">
                {state.type !== 'alert' && (
                  <button
                    onClick={closeModal}
                    className="pm-btn px-4 py-2 text-xs font-bold bg-pm-input hover:bg-pm-border text-pm-text rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                  className={`pm-btn px-4 py-2 text-xs font-bold rounded-lg text-white transition ${
                    state.alertType === 'error' || state.type === 'confirm' ? 'bg-pm-danger' : 'bg-pm-success'
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
