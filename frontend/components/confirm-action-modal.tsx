"use client";

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h2 className="font-bold text-stone-900 dark:text-stone-50 text-lg mb-2">{title}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-6">{message}</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 text-sm hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => void onConfirm()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
