'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useModalFocusTrap } from '@/utils/useModalFocusTrap';

interface ConfirmDialogConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmDialogContextType {
  openDialog: (config: ConfirmDialogConfig) => void;
}

const ConfirmDialogContext = createContext<
  ConfirmDialogContextType | undefined
>(undefined);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      'useConfirmDialog must be used within ConfirmDialogProvider',
    );
  }
  return context;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmDialogConfig | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const openDialog = useCallback((config: ConfirmDialogConfig) => {
    setIsClosing(false);
    setDialog(config);
  }, []);

  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      dialog?.onConfirm();
      setDialog(null);
    }, 150);
  };

  const handleCancel = () => {
    setIsClosing(true);
    setTimeout(() => {
      dialog?.onCancel();
      setDialog(null);
    }, 150);
  };

  useModalFocusTrap(dialogRef, Boolean(dialog), handleCancel);

  return (
    <ConfirmDialogContext.Provider value={{ openDialog }}>
      {children}

      {dialog && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-999 bg-black/50 transition-opacity duration-150',
              isClosing ? 'opacity-0' : 'opacity-100',
            )}
            onClick={handleCancel}
          />

          {/* Modal */}
          <div className='fixed inset-0 z-1000 flex items-center justify-center p-4'>
            <div
              ref={dialogRef}
              className={cn(
                'w-full max-w-sm rounded-lg border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1c1f2e] shadow-2xl transition-all duration-150',
                isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100',
              )}
              role='dialog'
              aria-modal='true'
            >
              {/* Header */}
              <div className='flex items-start justify-between gap-3 px-6 py-4 border-b border-stone-200 dark:border-[#2a2d3e]'>
                <div className='flex items-center gap-3 flex-1'>
                  {/* Icon with background */}
                  <div
                    className={cn(
                      'shrink-0 p-2 rounded-lg',
                      dialog.isDangerous
                        ? 'bg-red-100 dark:bg-red-950/30'
                        : 'bg-amber-100 dark:bg-amber-950/30',
                    )}
                  >
                    <AlertCircle
                      size={20}
                      className={cn(
                        dialog.isDangerous
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400',
                      )}
                    />
                  </div>

                  {/* Title */}
                  <div className='flex-1 min-w-0'>
                    <h2 className='text-base font-semibold text-stone-900 dark:text-white'>
                      {dialog.title || 'Confirm Action'}
                    </h2>
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  variant={'ghost'}
                  size={'sm'}
                  onClick={handleCancel}
                  className='text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors shrink-0'
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Content */}
              <div className='px-6 py-4'>
                <p className='text-sm text-stone-600 dark:text-stone-300 leading-relaxed'>
                  {dialog.message}
                </p>
              </div>

              {/* Footer */}
              <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] rounded-b-lg'>
                {/* Cancel Button */}
                <Button
                  variant={'ghost'}
                  size={'lg'}
                  onClick={handleCancel}
                  className='px-5 py-2.5 rounded-lg border border-stone-200 dark:border-[#2a2d3e] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#1c1f2e] transition-colors'
                >
                  {dialog.cancelText || 'Cancel'}
                </Button>

                {/* Confirm Button */}
                <Button
                  variant={'ghost'}
                  size={'lg'}
                  onClick={handleConfirm}
                  className={cn(
                    'px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors',
                    dialog.isDangerous
                      ? 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-800'
                      : 'bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-800',
                  )}
                >
                  {dialog.confirmText || 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </ConfirmDialogContext.Provider>
  );
}
