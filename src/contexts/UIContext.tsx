import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface PromptOptions {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showPrompt: (options: PromptOptions) => Promise<string | null>;
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string, isDanger?: boolean) => void;
  showAlert: (title: string, message: string, onAccept?: () => void) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [promptData, setPromptData] = useState<{
    options: PromptOptions;
    resolve: (value: string | null) => void;
  } | null>(null);

  const [promptInputValue, setPromptInputValue] = useState('');

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptInputValue(options.defaultValue || '');
      setPromptData({ options, resolve });
    });
  }, []);

  const handlePromptSubmit = () => {
    if (promptData) {
      promptData.resolve(promptInputValue);
      setPromptData(null);
    }
  };

  const handlePromptCancel = () => {
    if (promptData) {
      promptData.resolve(null);
      setPromptData(null);
    }
  };

  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    isAlert?: boolean;
    onAccept?: () => void;
  } | null>(null);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string, isDanger?: boolean) => {
    setConfirmData({ title, message, onConfirm, confirmText, cancelText, isDanger, isAlert: false });
  }, []);

  const showAlert = useCallback((title: string, message: string, onAccept?: () => void) => {
    setConfirmData({ title, message, onConfirm: () => {}, onAccept, isAlert: true });
  }, []);

  return (
    <UIContext.Provider value={{ showToast, showPrompt, showConfirm, showAlert }}>
      {children}
      
      {/* Toasts Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-bold min-w-[250px] max-w-sm animate-in slide-in-from-right-8 fade-in ${
            t.type === 'success' ? 'bg-green-600 text-white' :
            t.type === 'error' ? 'bg-red-600 text-white' :
            'bg-stone-800 text-white'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            <p className="flex-1">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Prompt Modal */}
      {promptData && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 fade-in">
            <div className="p-6">
              <h3 className="font-black text-lg text-on-surface mb-4">{promptData.options.title}</h3>
              <input
                type="text"
                autoFocus
                className="w-full px-4 py-3 bg-stone-50 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container text-black"
                placeholder={promptData.options.placeholder}
                value={promptInputValue}
                onChange={e => setPromptInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handlePromptSubmit();
                  if (e.key === 'Escape') handlePromptCancel();
                }}
              />
            </div>
            <div className="bg-stone-50 px-6 py-4 rounded-b-xl flex justify-end gap-3 border-t border-outline-variant">
              <button onClick={handlePromptCancel} className="px-4 py-2 font-bold text-secondary-custom hover:bg-stone-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handlePromptSubmit} className="px-4 py-2 bg-primary-container text-on-primary-container font-bold rounded-lg hover:brightness-110 transition-all">
                {promptData.options.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm / Alert Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 p-6">
            <h3 className="font-black text-xl text-stone-800 dark:text-stone-100 mb-3">{confirmData.title}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-8 leading-relaxed">{confirmData.message}</p>
            
            <div className="flex justify-end gap-3">
              {!confirmData.isAlert && (
                <button 
                  onClick={() => setConfirmData(null)} 
                  className="px-4 py-2 font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  {confirmData.cancelText || 'Cancelar'}
                </button>
              )}
              <button 
                onClick={() => {
                  const currentData = confirmData;
                  setConfirmData(null); // Clear first
                  if (currentData.isAlert) {
                    if (currentData.onAccept) currentData.onAccept();
                  } else {
                    currentData.onConfirm(); // Then call callback, which might set a new confirmData
                  }
                }} 
                className={`px-5 py-2 font-bold rounded-lg transition-all shadow-sm flex items-center gap-2 ${
                  confirmData.isDanger 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-900 dark:hover:bg-white'
                }`}
              >
                {confirmData.isAlert ? 'Aceptar' : (confirmData.confirmText || 'Confirmar')}
                {confirmData.isAlert && <span className="material-symbols-outlined text-[18px]">check</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
