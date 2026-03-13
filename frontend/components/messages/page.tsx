import { MessageSquare } from "lucide-react";

/**
 * /messages — shown in the RIGHT column on desktop when no conversation is selected.
 * On mobile this view is never displayed (the layout hides this column and shows
 * the conversations list instead).
 */
export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50 dark:bg-[#0f1117] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#1c1f2e] border border-border shadow-sm flex items-center justify-center">
        <MessageSquare size={28} className="text-stone-300 dark:text-stone-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
          Select a conversation
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-600 mt-1 max-w-[180px] mx-auto leading-relaxed">
          Choose a message from the list to start chatting
        </p>
      </div>
    </div>
  );
}
