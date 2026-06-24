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
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 text-sm font-bold min-w-[280px] max-w-sm animate-in slide-in-from-right-8 fade-in ${
            t.type === 'success' ? 'bg-green-500/20 text-green-100 border-green-500/30' :
            t.type === 'error' ? 'bg-red-600/20 text-red-100 border-red-500/30' :
            'bg-white/10 text-white'
          }`}>
            <span className={`material-symbols-outlined text-xl ${
              t.type === 'success' ? 'text-green-400' : t.type === 'error' ? 'text-red-400' : 'text-blue-400'
            }`}>
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            <p className="flex-1">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Prompt Modal */}
      {promptData && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 fade-in overflow-hidden">
            <div className="p-6">
              <h3 className="font-black text-xl text-white mb-4">{promptData.options.title}</h3>
              <input
                type="text"
                autoFocus
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-white placeholder-white/30"
                placeholder={promptData.options.placeholder}
                value={promptInputValue}
                onChange={e => setPromptInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handlePromptSubmit();
                  if (e.key === 'Escape') handlePromptCancel();
                }}
              />
            </div>
            <div className="bg-black/20 px-6 py-4 flex justify-end gap-3 border-t border-white/5">
              <button onClick={handlePromptCancel} className="px-5 py-2.5 font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                Cancelar
              </button>
              <button onClick={handlePromptSubmit} className="px-5 py-2.5 bg-red-600/80 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 border border-red-500/50 hover:bg-red-500 transition-all">
                {promptData.options.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm / Alert Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 w-full max-w-md animate-in zoom-in-95 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
            <h3 className="font-black text-2xl text-white mb-3 tracking-wide">{confirmData.title}</h3>
            <p className="text-[15px] text-white/70 mb-8 leading-relaxed font-light">{confirmData.message}</p>
            
            <div className="flex justify-end gap-3">
              {!confirmData.isAlert && (
                <button 
                  onClick={() => setConfirmData(null)} 
                  className="px-5 py-2.5 font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  {confirmData.cancelText || 'Cancelar'}
                </button>
              )}
              <button 
                onClick={() => {
                  const currentData = confirmData;
                  setConfirmData(null); 
                  if (currentData.isAlert) {
                    if (currentData.onAccept) currentData.onAccept();
                  } else {
                    currentData.onConfirm(); 
                  }
                }} 
                className={`px-6 py-2.5 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 border ${
                  confirmData.isDanger 
                    ? 'bg-red-600/80 text-white border-red-500/50 hover:bg-red-500 shadow-red-900/20' 
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
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
