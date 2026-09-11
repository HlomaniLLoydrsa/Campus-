'use client';

/**
 * VYBE feedback system — branded toasts + confirm/alert modals that replace
 * native browser alert()/confirm() (the "localhost says…" popups).
 *
 * Usage:
 *   const { toast, confirm, alert } = useFeedback();
 *   toast('Your changes have been saved');
 *   toast('Something went wrong', 'error');
 *   const ok = await confirm({ title: 'Delete this post?', confirmText: 'Delete', destructive: true });
 *   if (ok) { ... }
 *   await alert('You have been logged out.');
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: string; message: string; kind: ToastKind; }

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}
interface ConfirmState extends ConfirmOptions {
  id: string;
  mode: 'confirm' | 'alert';
  resolve: (value: boolean) => void;
}

interface FeedbackContextType {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ConfirmState | null>(null);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, kind }]);
    // Auto-dismiss after 3.2s
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, id: `c_${Date.now()}`, mode: 'confirm', resolve });
    });
  }, []);

  const alert = useCallback((message: string, title = 'VYBE') => {
    return new Promise<void>((resolve) => {
      setDialog({ title, message, id: `a_${Date.now()}`, mode: 'alert', resolve: () => resolve() });
    });
  }, []);

  const closeDialog = useCallback((result: boolean) => {
    setDialog(prev => { prev?.resolve(result); return null; });
  }, []);

  return (
    <FeedbackContext.Provider value={{ toast, confirm, alert }}>
      {children}

      {/* Toasts — bottom-center on mobile, bottom-right on larger screens; above the bottom nav */}
      <div className="fixed inset-x-0 bottom-24 lg:bottom-6 lg:right-6 lg:left-auto z-[100] flex flex-col items-center lg:items-end gap-2 px-4 pointer-events-none">
        {toasts.map(t => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
          const tint = t.kind === 'success' ? 'text-green-600' : t.kind === 'error' ? 'text-red-600' : 'text-campus-primary';
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex items-center gap-2.5 max-w-sm w-full lg:w-auto bg-white shadow-lg border border-gray-100 rounded-xl px-4 py-3 animate-slide-up">
              <Icon size={18} className={`${tint} shrink-0`} />
              <p className="text-sm text-gray-800 flex-1">{t.message}</p>
              <button onClick={() => dismissToast(t.id)} className="text-gray-300 hover:text-gray-500 shrink-0" aria-label="Dismiss"><X size={15} /></button>
            </div>
          );
        })}
      </div>

      {/* Confirm / Alert modal */}
      {dialog && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" onClick={() => closeDialog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              {dialog.destructive && <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0"><AlertTriangle size={18} className="text-red-600" /></div>}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base">{dialog.title}</h3>
                {dialog.message && <p className="text-sm text-gray-600 mt-1">{dialog.message}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              {dialog.mode === 'confirm' && (
                <button onClick={() => closeDialog(false)} className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  {dialog.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => closeDialog(true)}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-colors ${dialog.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-campus-primary hover:opacity-90'}`}
              >
                {dialog.confirmText || (dialog.mode === 'alert' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
